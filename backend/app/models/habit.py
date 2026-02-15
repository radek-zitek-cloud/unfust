"""Habit Tracker models."""

import uuid
from datetime import date, datetime, timezone
from enum import Enum as PyEnum

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.user import Base


class HabitType(str, PyEnum):
    POSITIVE = "positive"  # Do this habit
    NEGATIVE = "negative"  # Avoid this habit


class FrequencyType(str, PyEnum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    CUSTOM = "custom"


class Habit(Base):
    """A habit to track (positive or negative)."""

    __tablename__ = "habits"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(100))
    emoji: Mapped[str] = mapped_column(String(10), default="✨")
    color: Mapped[str] = mapped_column(String(7), default="#228be6")  # hex color
    category: Mapped[str | None] = mapped_column(String(50), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    habit_type: Mapped[HabitType] = mapped_column(
        Enum(HabitType), default=HabitType.POSITIVE
    )
    frequency_type: Mapped[FrequencyType] = mapped_column(
        Enum(FrequencyType), default=FrequencyType.DAILY
    )
    target_count: Mapped[int] = mapped_column(Integer, default=1)
    period_days: Mapped[int | None] = mapped_column(
        Integer, nullable=True
    )  # for CUSTOM frequency
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    logs: Mapped[list["HabitLog"]] = relationship(
        back_populates="habit",
        cascade="all, delete-orphan",
        order_by="desc(HabitLog.logged_date)",
    )
    user: Mapped["User"] = relationship(back_populates="habits")  # type: ignore


class HabitLog(Base):
    """A log entry for habit completion."""

    __tablename__ = "habit_logs"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    habit_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("habits.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    logged_date: Mapped[date] = mapped_column(Date, index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    habit: Mapped["Habit"] = relationship(back_populates="logs")


class HabitBadge(Base):
    """Badges earned by users for habit achievements."""

    __tablename__ = "habit_badges"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    badge_type: Mapped[str] = mapped_column(
        String(50), index=True
    )  # e.g., "first_log", "streak_7"
    earned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    # Unique constraint: one badge type per user
    __table_args__ = (
        # Unique constraint handled at application level or via composite unique
    )


class ChallengeType(str, PyEnum):
    STREAK = "streak"
    COUNT = "count"
    PERFECT_DAY = "perfect_day"


class ChallengePeriod(str, PyEnum):
    WEEKLY = "weekly"
    MONTHLY = "monthly"


class HabitChallenge(Base):
    """Time-limited challenges for habits."""

    __tablename__ = "habit_challenges"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(String(100))
    description: Mapped[str] = mapped_column(Text)
    challenge_type: Mapped[ChallengeType] = mapped_column(Enum(ChallengeType))
    target: Mapped[int] = mapped_column(Integer)
    period: Mapped[ChallengePeriod] = mapped_column(Enum(ChallengePeriod))
    starts_at: Mapped[date] = mapped_column(Date)
    ends_at: Mapped[date] = mapped_column(Date)
    is_system_generated: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    progress: Mapped[list["HabitChallengeProgress"]] = relationship(
        back_populates="challenge", cascade="all, delete-orphan"
    )


class HabitChallengeProgress(Base):
    """User progress on challenges."""

    __tablename__ = "habit_challenge_progress"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    challenge_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("habit_challenges.id", ondelete="CASCADE"),
        index=True,
    )
    current_value: Mapped[int] = mapped_column(Integer, default=0)
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    challenge: Mapped["HabitChallenge"] = relationship(back_populates="progress")

    # Unique constraint per user+challenge
    __table_args__ = (
        # Composite unique would be: (user_id, challenge_id)
    )
