"""Habit Tracker schemas."""

from datetime import date, datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict


class HabitType(str, Enum):
    POSITIVE = "positive"
    NEGATIVE = "negative"


class FrequencyType(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    CUSTOM = "custom"


class ChallengeType(str, Enum):
    STREAK = "streak"
    COUNT = "count"
    PERFECT_DAY = "perfect_day"


class ChallengePeriod(str, Enum):
    WEEKLY = "weekly"
    MONTHLY = "monthly"


# --- Habit ---


class HabitBase(BaseModel):
    name: str
    emoji: str = "✨"
    color: str = "#228be6"
    category: str | None = None
    description: str | None = None
    habit_type: HabitType = HabitType.POSITIVE
    frequency_type: FrequencyType = FrequencyType.DAILY
    target_count: int = 1
    period_days: int | None = None


class HabitCreate(HabitBase):
    pass


class HabitUpdate(BaseModel):
    name: str | None = None
    emoji: str | None = None
    color: str | None = None
    category: str | None = None
    description: str | None = None
    habit_type: HabitType | None = None
    frequency_type: FrequencyType | None = None
    target_count: int | None = None
    period_days: int | None = None
    is_active: bool | None = None
    order: int | None = None


class HabitStats(BaseModel):
    """Computed stats for a habit."""

    current_streak: int
    longest_streak: int
    total_completions: int
    completion_rate: float  # percentage 0-100
    today_count: int  # completions today
    is_complete_today: bool


class HabitResponse(HabitBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    is_active: bool
    order: int
    created_at: datetime
    # Computed stats (added by service layer)
    stats: HabitStats | None = None


# --- Habit Log ---


class HabitLogCreate(BaseModel):
    logged_date: date | None = None  # defaults to today
    notes: str | None = None


class HabitLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    habit_id: str
    user_id: str
    logged_date: date
    notes: str | None = None
    created_at: datetime


# --- Badge ---


class BadgeType(str, Enum):
    FIRST_LOG = "first_log"
    STREAK_7 = "streak_7"
    STREAK_30 = "streak_30"
    STREAK_100 = "streak_100"
    PERFECT_DAY = "perfect_day"
    SHARP_FOCUS = "sharp_focus"


class HabitBadgeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    badge_type: BadgeType
    earned_at: datetime


# --- Challenge ---


class HabitChallengeBase(BaseModel):
    name: str
    description: str
    challenge_type: ChallengeType
    target: int
    period: ChallengePeriod
    starts_at: date
    ends_at: date


class HabitChallengeResponse(HabitChallengeBase):
    model_config = ConfigDict(from_attributes=True)

    id: str
    is_system_generated: bool
    created_at: datetime


class HabitChallengeProgressResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    challenge_id: str
    current_value: int
    completed_at: datetime | None
    challenge: HabitChallengeResponse


# --- Summary (for dashboard widget) ---


class HabitSummaryItem(BaseModel):
    habit_id: str
    name: str
    emoji: str
    color: str
    target_count: int
    today_count: int
    is_complete: bool
    current_streak: int


class HabitSummaryResponse(BaseModel):
    total_habits: int
    completed_today: int
    best_streak: int
    user_level: int
    user_xp: int
    habits: list[HabitSummaryItem]
