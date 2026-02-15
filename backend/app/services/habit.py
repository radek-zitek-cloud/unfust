"""Habit Tracker service layer."""

from datetime import date, datetime, timedelta, timezone
from typing import Sequence

from sqlalchemy import and_, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.habit import (
    ChallengePeriod,
    ChallengeType,
    Habit,
    HabitBadge,
    HabitChallenge,
    HabitChallengeProgress,
    HabitLog,
    HabitType,
)
from app.models.user import User
from app.schemas.habit import (
    BadgeType,
    HabitCreate,
    HabitStats,
    HabitSummaryItem,
    HabitSummaryResponse,
    HabitUpdate,
)


class HabitService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # --- CRUD Operations ---

    async def get_habits(self, user_id: str) -> list[Habit]:
        """Get all active habits for user with computed stats."""
        result = await self.db.execute(
            select(Habit)
            .where(Habit.user_id == user_id, Habit.is_active == True)
            .order_by(Habit.order, Habit.created_at)
        )
        habits = result.scalars().all()

        # Compute stats for each habit
        for habit in habits:
            habit.stats = await self._compute_stats(habit)

        return list(habits)

    async def get_habit(self, habit_id: str, user_id: str) -> Habit | None:
        """Get single habit with stats."""
        result = await self.db.execute(
            select(Habit).where(
                Habit.id == habit_id, Habit.user_id == user_id, Habit.is_active == True
            )
        )
        habit = result.scalar_one_or_none()
        if habit:
            habit.stats = await self._compute_stats(habit)
        return habit

    async def create_habit(self, user_id: str, data: HabitCreate) -> Habit:
        """Create a new habit."""
        # Get max order for user
        result = await self.db.execute(
            select(func.max(Habit.order)).where(Habit.user_id == user_id)
        )
        max_order = result.scalar() or 0

        habit = Habit(
            user_id=user_id,
            name=data.name,
            emoji=data.emoji,
            color=data.color,
            category=data.category,
            description=data.description,
            habit_type=data.habit_type,
            frequency_type=data.frequency_type,
            target_count=data.target_count,
            period_days=data.period_days,
            order=max_order + 1,
        )
        self.db.add(habit)
        await self.db.commit()
        await self.db.refresh(habit)

        # Compute stats for response
        habit.stats = await self._compute_stats(habit)
        return habit

    async def update_habit(
        self, habit_id: str, user_id: str, data: HabitUpdate
    ) -> Habit | None:
        """Update habit fields."""
        habit = await self.get_habit(habit_id, user_id)
        if not habit:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(habit, field, value)

        await self.db.commit()
        await self.db.refresh(habit)

        habit.stats = await self._compute_stats(habit)
        return habit

    async def delete_habit(self, habit_id: str, user_id: str) -> bool:
        """Soft delete a habit."""
        habit = await self.get_habit(habit_id, user_id)
        if not habit:
            return False

        habit.is_active = False
        await self.db.commit()
        return True

    # --- Logging ---

    async def log_completion(
        self, habit_id: str, user_id: str, logged_date: date | None = None, notes: str | None = None
    ) -> HabitLog | None:
        """Log a habit completion."""
        habit = await self.get_habit(habit_id, user_id)
        if not habit:
            return None

        if logged_date is None:
            logged_date = date.today()

        # Create log entry
        log = HabitLog(
            habit_id=habit_id,
            user_id=user_id,
            logged_date=logged_date,
            notes=notes,
        )
        self.db.add(log)
        await self.db.flush()  # Flush to get log.id

        # Award XP
        stats = await self._compute_stats(habit)
        xp_amount = 10 + stats.current_streak  # Base 10 + streak bonus
        await self._award_xp(user_id, xp_amount)

        # Check badges
        await self._check_and_award_badges(user_id, habit, stats)

        # Update challenge progress
        await self._update_challenge_progress(user_id)

        await self.db.commit()
        await self.db.refresh(log)
        return log

    async def undo_log(self, log_id: str, user_id: str) -> bool:
        """Delete a log entry."""
        result = await self.db.execute(
            select(HabitLog).where(HabitLog.id == log_id, HabitLog.user_id == user_id)
        )
        log = result.scalar_one_or_none()
        if not log:
            return False

        await self.db.delete(log)
        await self.db.commit()
        return True

    async def get_log_history(
        self, habit_id: str, user_id: str, start: date, end: date
    ) -> Sequence[HabitLog]:
        """Get logs for a date range."""
        result = await self.db.execute(
            select(HabitLog)
            .where(
                HabitLog.habit_id == habit_id,
                HabitLog.user_id == user_id,
                HabitLog.logged_date >= start,
                HabitLog.logged_date <= end,
            )
            .order_by(desc(HabitLog.logged_date))
        )
        return result.scalars().all()

    # --- Stats Computation ---

    async def _compute_stats(self, habit: Habit) -> HabitStats:
        """Compute all stats for a habit."""
        # Get all logs ordered by date
        result = await self.db.execute(
            select(HabitLog.logged_date, func.count(HabitLog.id).label("count"))
            .where(HabitLog.habit_id == habit.id)
            .group_by(HabitLog.logged_date)
            .order_by(desc(HabitLog.logged_date))
        )
        logs_by_date = {row.logged_date: row.count for row in result.all()}

        # Total completions
        total_completions = sum(logs_by_date.values())

        # Today's count
        today = date.today()
        today_count = logs_by_date.get(today, 0)

        # Check if complete today (met target)
        is_complete_today = today_count >= habit.target_count

        # Compute streaks
        current_streak = self._compute_current_streak(
            habit, logs_by_date, today
        )
        longest_streak = self._compute_longest_streak(habit, logs_by_date)

        # Completion rate (last 30 days)
        completion_rate = self._compute_completion_rate(habit, logs_by_date, 30)

        return HabitStats(
            current_streak=current_streak,
            longest_streak=longest_streak,
            total_completions=total_completions,
            completion_rate=completion_rate,
            today_count=today_count,
            is_complete_today=is_complete_today,
        )

    def _compute_current_streak(
        self, habit: Habit, logs_by_date: dict[date, int], today: date
    ) -> int:
        """Compute current streak based on frequency type."""
        if habit.frequency_type.value == "daily":
            return self._compute_daily_streak(logs_by_date, today, habit.target_count)
        elif habit.frequency_type.value == "weekly":
            return self._compute_rolling_streak(
                logs_by_date, today, 7, habit.target_count
            )
        elif habit.frequency_type.value == "monthly":
            return self._compute_rolling_streak(
                logs_by_date, today, 30, habit.target_count
            )
        elif habit.frequency_type.value == "custom" and habit.period_days:
            return self._compute_rolling_streak(
                logs_by_date, today, habit.period_days, habit.target_count
            )
        return 0

    def _compute_daily_streak(
        self, logs_by_date: dict[date, int], today: date, target_count: int
    ) -> int:
        """Streak = consecutive days with >= target_count completions."""
        streak = 0
        check_date = today

        # Check today first (if no logs today, check yesterday)
        if check_date not in logs_by_date or logs_by_date[check_date] < target_count:
            check_date = today - timedelta(days=1)

        while check_date in logs_by_date and logs_by_date[check_date] >= target_count:
            streak += 1
            check_date -= timedelta(days=1)

        return streak

    def _compute_rolling_streak(
        self,
        logs_by_date: dict[date, int],
        today: date,
        window_days: int,
        target_count: int,
    ) -> int:
        """Streak = consecutive rolling windows with >= target_count completions."""
        streak = 0
        window_end = today

        # Check if current window is complete
        while True:
            window_start = window_end - timedelta(days=window_days - 1)
            completions = sum(
                count
                for d, count in logs_by_date.items()
                if window_start <= d <= window_end
            )

            if completions >= target_count:
                streak += 1
                window_end = window_start - timedelta(days=1)
            else:
                break

        return streak

    def _compute_longest_streak(self, habit: Habit, logs_by_date: dict[date, int]) -> int:
        """Compute longest streak ever."""
        if not logs_by_date:
            return 0

        # For simplicity, same logic as current streak but tracking max
        # In production, this could be stored and updated on each log
        if habit.frequency_type.value == "daily":
            return self._compute_longest_daily_streak(logs_by_date, habit.target_count)
        return 0  # Simplified for other frequencies

    def _compute_longest_daily_streak(
        self, logs_by_date: dict[date, int], target_count: int
    ) -> int:
        """Find longest consecutive daily streak in history."""
        sorted_dates = sorted(logs_by_date.keys(), reverse=True)
        if not sorted_dates:
            return 0

        max_streak = 0
        current_streak = 0
        prev_date = None

        for d in sorted_dates:
            if logs_by_date[d] < target_count:
                continue

            if prev_date is None or (prev_date - d).days == 1:
                current_streak += 1
                max_streak = max(max_streak, current_streak)
            else:
                current_streak = 1

            prev_date = d

        return max_streak

    def _compute_completion_rate(
        self, habit: Habit, logs_by_date: dict[date, int], days: int
    ) -> float:
        """Compute completion rate over last N days."""
        today = date.today()
        successful_days = 0

        for i in range(days):
            check_date = today - timedelta(days=i)
            if logs_by_date.get(check_date, 0) >= habit.target_count:
                successful_days += 1

        return round((successful_days / days) * 100, 1)

    # --- Gamification ---

    async def _award_xp(self, user_id: str, amount: int) -> None:
        """Award XP to user."""
        result = await self.db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one()
        user.habit_xp += amount
        await self.db.flush()

    async def _check_and_award_badges(
        self, user_id: str, habit: Habit, stats: HabitStats
    ) -> list[BadgeType]:
        """Check badge conditions and award new badges."""
        new_badges: list[BadgeType] = []

        # Get existing badges
        result = await self.db.execute(
            select(HabitBadge.badge_type).where(HabitBadge.user_id == user_id)
        )
        existing = {b for b in result.scalars()}

        # Check each badge condition
        checks = [
            (BadgeType.FIRST_LOG, stats.total_completions >= 1),
            (BadgeType.STREAK_7, stats.current_streak >= 7),
            (BadgeType.STREAK_30, stats.current_streak >= 30),
            (BadgeType.STREAK_100, stats.current_streak >= 100),
        ]

        for badge_type, condition in checks:
            if badge_type not in existing and condition:
                badge = HabitBadge(
                    user_id=user_id,
                    badge_type=badge_type.value,
                )
                self.db.add(badge)
                new_badges.append(badge_type)
                # Award XP for badge
                await self._award_xp(user_id, 50)

        if new_badges:
            await self.db.flush()

        return new_badges

    async def _update_challenge_progress(self, user_id: str) -> None:
        """Update progress for all active challenges."""
        today = date.today()

        # Get active challenges
        result = await self.db.execute(
            select(HabitChallenge).where(
                HabitChallenge.starts_at <= today,
                HabitChallenge.ends_at >= today,
            )
        )
        challenges = result.scalars().all()

        for challenge in challenges:
            # Get or create progress
            result = await self.db.execute(
                select(HabitChallengeProgress).where(
                    HabitChallengeProgress.user_id == user_id,
                    HabitChallengeProgress.challenge_id == challenge.id,
                )
            )
            progress = result.scalar_one_or_none()

            if not progress:
                progress = HabitChallengeProgress(
                    user_id=user_id,
                    challenge_id=challenge.id,
                    current_value=0,
                )
                self.db.add(progress)

            # Skip if already completed
            if progress.completed_at:
                continue

            # Compute current value based on challenge type
            new_value = await self._compute_challenge_value(
                user_id, challenge, progress.current_value
            )
            progress.current_value = new_value

            # Check completion
            if new_value >= challenge.target and not progress.completed_at:
                progress.completed_at = datetime.now(timezone.utc)
                # Award XP for completing challenge
                await self._award_xp(user_id, 100)

        await self.db.flush()

    async def _compute_challenge_value(
        self, user_id: str, challenge: HabitChallenge, current: int
    ) -> int:
        """Compute current value for a challenge."""
        today = date.today()

        if challenge.challenge_type == ChallengeType.COUNT:
            # Count logs in challenge period
            result = await self.db.execute(
                select(func.count(HabitLog.id)).where(
                    HabitLog.user_id == user_id,
                    HabitLog.logged_date >= challenge.starts_at,
                    HabitLog.logged_date <= challenge.ends_at,
                )
            )
            return result.scalar() or 0

        elif challenge.challenge_type == ChallengeType.STREAK:
            # Max streak of any habit
            result = await self.db.execute(
                select(Habit).where(
                    Habit.user_id == user_id, Habit.is_active == True
                )
            )
            max_streak = 0
            for habit in result.scalars().all():
                stats = await self._compute_stats(habit)
                max_streak = max(max_streak, stats.current_streak)
            return max_streak

        elif challenge.challenge_type == ChallengeType.PERFECT_DAY:
            # Count days where all habits completed
            # This is complex - simplified version
            return current + 1  # Increment on each qualifying log

        return current

    # --- Summary & Challenges ---

    async def get_summary(self, user_id: str) -> HabitSummaryResponse:
        """Get dashboard summary for user."""
        habits = await self.get_habits(user_id)

        # Get user XP and level
        result = await self.db.execute(
            select(User.habit_xp).where(User.id == user_id)
        )
        user_xp = result.scalar() or 0
        user_level = user_xp // 500 + 1

        # Count completed today
        completed_today = sum(1 for h in habits if h.stats and h.stats.is_complete_today)

        # Best streak across all habits
        best_streak = max(
            (h.stats.current_streak for h in habits if h.stats), default=0
        )

        # Build summary items
        items = [
            HabitSummaryItem(
                habit_id=h.id,
                name=h.name,
                emoji=h.emoji,
                color=h.color,
                target_count=h.target_count,
                today_count=h.stats.today_count if h.stats else 0,
                is_complete=h.stats.is_complete_today if h.stats else False,
                current_streak=h.stats.current_streak if h.stats else 0,
            )
            for h in habits
        ]

        return HabitSummaryResponse(
            total_habits=len(habits),
            completed_today=completed_today,
            best_streak=best_streak,
            user_level=user_level,
            user_xp=user_xp,
            habits=items,
        )

    async def get_badges(self, user_id: str) -> Sequence[HabitBadge]:
        """Get all badges earned by user."""
        result = await self.db.execute(
            select(HabitBadge)
            .where(HabitBadge.user_id == user_id)
            .order_by(desc(HabitBadge.earned_at))
        )
        return result.scalars().all()

    async def get_challenges(self, user_id: str) -> Sequence[HabitChallengeProgress]:
        """Get active challenges with progress."""
        today = date.today()

        # Ensure challenges exist
        await self._ensure_default_challenges()

        result = await self.db.execute(
            select(HabitChallengeProgress)
            .join(HabitChallenge)
            .where(
                HabitChallengeProgress.user_id == user_id,
                HabitChallenge.starts_at <= today,
                HabitChallenge.ends_at >= today,
            )
        )
        return result.scalars().all()

    async def _ensure_default_challenges(self) -> None:
        """Create default challenges if none exist."""
        result = await self.db.execute(select(HabitChallenge).limit(1))
        if result.scalar_one_or_none():
            return

        today = date.today()

        # Weekly challenge
        weekly = HabitChallenge(
            name="Weekly Warrior",
            description="Complete 5 habits this week",
            challenge_type=ChallengeType.COUNT,
            target=5,
            period=ChallengePeriod.WEEKLY,
            starts_at=today,
            ends_at=today + timedelta(days=7),
            is_system_generated=True,
        )
        self.db.add(weekly)

        # Monthly streak challenge
        monthly = HabitChallenge(
            name="Streak Master",
            description="Achieve a 7-day streak on any habit",
            challenge_type=ChallengeType.STREAK,
            target=7,
            period=ChallengePeriod.MONTHLY,
            starts_at=today,
            ends_at=today + timedelta(days=30),
            is_system_generated=True,
        )
        self.db.add(monthly)

        await self.db.flush()
