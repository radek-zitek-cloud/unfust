# Habit Tracker — Implementation Plan

> ✅ **All clarifications resolved** — Ready for implementation

## Context

Adding a full Habit Tracker section to the Unfust personal dashboard. Users can create habits (positive: do X; negative: avoid X) with configurable frequency (daily/weekly/monthly/custom), check in daily, and track progress via streaks, completion rings, XP, badges, and time-limited challenges. Includes a `/habits` page and a `HabitsWidget` for the dashboard.

Design doc: `docs/plans/2026-02-15-habit-tracker-design.md`

---

## Phase Overview

This is Phase 1: Core + Gamification (streaks, rings, badges, XP, weekly/monthly challenges).
Phase 2 (future): advanced analytics, social sharing, habit templates.

---

## Implementation Steps

### Step 1 — Backend: Models & Migration

**Files to create/modify:**

1. `backend/app/models/habit.py` — Define SQLAlchemy models:
   - `Habit` (id, user_id, name, emoji, color, category, description, habit_type, frequency_type, target_count, period_days, is_active, order, created_at)
   - `HabitLog` (id, habit_id, user_id, logged_date, notes, created_at)
   - `HabitBadge` (id, user_id, badge_type, earned_at)
   - `HabitChallenge` (id, name, description, challenge_type, target, period, starts_at, ends_at, is_system_generated)
   - `HabitChallengeProgress` (id, user_id, challenge_id, current_value, completed_at)
   - Follow existing pattern in `backend/app/models/` (e.g. `bookmark.py` or `user.py`)

2. `backend/app/models/user.py` — Add `habit_xp: int = 0` column
   - Pattern: see existing columns in `backend/app/models/user.py`

3. `backend/app/models/__init__.py` — Export new models (check existing pattern)

4. Run: `cd backend && uv run alembic revision --autogenerate -m "add habit tracker tables"`
   - Apply: `cd backend && uv run alembic upgrade head`

---

### Step 2 — Backend: Schemas

**File:** `backend/app/schemas/habit.py`

- `HabitCreate` / `HabitUpdate` — input schemas
- `HabitResponse` — includes computed stats: `current_streak`, `longest_streak`, `total_completions`, `completion_rate`
- `HabitLogCreate` / `HabitLogResponse`
- `HabitBadgeResponse`
- `HabitChallengeSummary` — includes `user_progress`
- `HabitSummaryResponse` — compact for dashboard widget

Follow pattern in `backend/app/schemas/bookmark.py` or `backend/app/schemas/user.py`.

Also update `backend/app/schemas/user.py` to expose `habit_xp` in `UserResponse`.

---

### Step 3 — Backend: Service Layer

**File:** `backend/app/services/habit.py` — `HabitService` class

Key methods:
- `get_habits(user_id)` → list with computed stats per habit
- `create_habit(user_id, data)` → create + return with stats
- `update_habit(habit_id, user_id, data)`
- `delete_habit(habit_id, user_id)` → soft delete (is_active=False)
- `log_completion(habit_id, user_id, logged_date, notes)` → check-in + award XP + check badges
- `undo_log(log_id, user_id)`
- `get_log_history(habit_id, user_id, start, end)` → for heatmap
- `get_summary(user_id)` → today's habits overview for widget
- `get_active_challenges(user_id)` → with progress
- `get_badges(user_id)`

**Stats computation helpers (private):**
- `_compute_streak(logs: list[date]) → int` — count consecutive periods
- `_compute_stats(habit, logs) → HabitStats`

**Gamification helpers:**
- `_award_xp(user_id, amount)` — increment `user.habit_xp`
- `_check_and_award_badges(user_id, habit_id, stats)` — check all badge conditions, insert if not already earned
- `_update_challenge_progress(user_id)` — recompute challenge progress after each log

Follow pattern in `backend/app/services/bookmark.py`.

---

### Step 4 — Backend: Router

**File:** `backend/app/routers/habits.py`

Endpoints (all require auth — see `backend/app/routers/bookmarks.py` for auth pattern):
```
GET    /api/habits
POST   /api/habits
PATCH  /api/habits/{habit_id}
DELETE /api/habits/{habit_id}
POST   /api/habits/{habit_id}/logs
DELETE /api/habits/{habit_id}/logs/{log_id}
GET    /api/habits/{habit_id}/logs          (query params: start, end)
GET    /api/habits/summary
GET    /api/habits/challenges
GET    /api/habits/badges
```

Register in `backend/app/main.py`:
```python
from app.routers import habits
app.include_router(habits.router, prefix="/api/habits", tags=["habits"])
```

---

### Step 5 — Backend: Tests

**File:** `backend/tests/test_habits.py`

Test cases:
- Create/update/delete habit
- Log completion → streak increments
- Undo log → streak decrements
- Streak calculation (daily, weekly, gap handling)
- Badge award on 7-day streak
- XP accumulation
- Summary endpoint returns correct today's data

Run: `cd backend && uv run pytest tests/test_habits.py -v`

---

### Step 6 — Frontend: API Client

**File:** `frontend/app/lib/habits-api.ts`

Functions (follow pattern in `frontend/app/lib/api.ts`):
- `getHabits()` → `HabitResponse[]`
- `createHabit(data)` → `HabitResponse`
- `updateHabit(id, data)` → `HabitResponse`
- `deleteHabit(id)` → void
- `logCompletion(habitId, date?, notes?)` → `HabitLogResponse`
- `undoLog(habitId, logId)` → void
- `getLogHistory(habitId, start, end)` → `HabitLogResponse[]`
- `getHabitsSummary()` → `HabitSummaryResponse`
- `getChallenges()` → `HabitChallengeSummary[]`
- `getBadges()` → `HabitBadgeResponse[]`

---

### Step 7 — Frontend: Habits Page

**Files:**

1. `frontend/app/routes/habits/components/HabitCard.tsx`
   - Props: `habit: HabitResponse`, `onCheckin`, `onEdit`, `onDelete`, `onClick`
   - Shows: emoji, name, category badge, `RingProgress` (Mantine), `🔥 N` streak, check-in button
   - Uses Mantine `Card`, `RingProgress`, `Badge`, `ActionIcon`

2. `frontend/app/routes/habits/components/HabitForm.tsx`
   - Modal form for create/edit
   - Fields: name, emoji picker, color picker, category, description, habit_type, frequency_type, target_count, period_days
   - Uses Mantine `Modal`, `TextInput`, `Select`, `NumberInput`, `ColorInput`

3. `frontend/app/routes/habits/components/HabitDetail.tsx`
   - Drawer with full log history as GitHub-style heatmap calendar
   - Uses `@uiw/react-heat-map` or manual Mantine grid
   - Shows: stats summary, longest streak, completion rate

4. `frontend/app/routes/habits/components/ChallengeCard.tsx`
   - Shows challenge name, description, progress bar, XP reward, end date countdown
   - Uses Mantine `Progress`, `Badge`

5. `frontend/app/routes/habits/components/BadgeCollection.tsx`
   - Grid of earned badges with emoji + name + earned date
   - Unearned badges shown grayed out as motivation

6. `frontend/app/routes/habits/index.tsx` — Main page
   - Category filter tabs (Mantine `Tabs`)
   - Habit cards grid
   - "Active Challenges" section
   - "My Badges" section
   - XP level display in page header
   - "Add Habit" button → HabitForm modal
   - Click habit card → HabitDetail drawer

---

### Step 8 — Frontend: Dashboard Widget

**File:** `frontend/app/components/widgets/HabitsWidget.tsx`

- Compact list: emoji + name + mini ring + check-in button per habit
- Header: "Today: X/Y complete · 🔥 best streak N"
- Calls `getHabitsSummary()` with polling (similar to WeatherWidget/SystemWidget pattern)
- `defaultSize: { w: 2, h: 2 }`

Register in `frontend/app/components/widgets/index.ts`:
```typescript
habits: {
  component: HabitsWidget,
  label: 'Habits',
  defaultSize: { w: 2, h: 2 },
  minSize: { w: 2, h: 2 },
}
```

---

### Step 9 — Frontend: Routing & Navigation

1. `frontend/app/routes.ts` — Add habits route:
   ```typescript
   route('/habits', 'routes/habits/index.tsx')
   ```

2. `frontend/app/root.tsx` — Add nav link to sidebar (follow existing nav link pattern for `/bookmarks` or `/rss`)

---

## Critical Files to Reference

| File | Purpose |
|------|---------|
| `backend/app/models/bookmark.py` | Model pattern to follow |
| `backend/app/services/bookmark.py` | Service pattern to follow |
| `backend/app/routers/bookmarks.py` | Router + auth pattern to follow |
| `backend/app/schemas/bookmark.py` | Schema pattern to follow |
| `backend/tests/test_bookmarks.py` | Test pattern to follow |
| `frontend/app/lib/api.ts` | API client pattern to follow |
| `frontend/app/components/widgets/WeatherWidget.tsx` | Widget pattern (polling, config) |
| `frontend/app/components/widgets/index.ts` | Widget registry to update |
| `frontend/app/root.tsx` | Nav link location |

---

## Verification

1. **Backend tests:** `cd backend && uv run pytest tests/test_habits.py -v`
2. **Type check:** `cd frontend && npx react-router typegen && npx tsc --noEmit`
3. **Manual flow:**
   - Create a daily habit → appears on `/habits`
   - Check in → ring fills, streak shows 🔥 1
   - Check in two more days → streak shows 🔥 3
   - Confirm badge awarded at 7-day streak
   - Add HabitsWidget to dashboard → today's habits visible
   - Verify XP increments on user profile
4. **Dev server:** `docker compose -f docker-compose.dev.yml up --build`

---

## Out of Scope (Phase 2)

- Habit templates / shared habits
- Social features / leaderboard
- Push notifications / reminders
- Advanced analytics (rolling averages, correlation)
- Habit reordering via drag-and-drop
