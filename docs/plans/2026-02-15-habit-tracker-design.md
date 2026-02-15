# Habit Tracker — Design Document

**Date:** 2026-02-15
**Status:** Approved
**Scope:** Phase 1 (Core + Gamification — streaks, rings, badges, XP, challenges)

---

## Clarification Questions — ✅ ALL RESOLVED

| Q# | Question | Decision | Status |
|----|----------|----------|--------|
| 1 | ID Type | ✅ **UUID** (consistent with User model) | Resolved |
| 2 | Frequency Logic | ✅ **Daily=calendar day, Weekly=rolling 7-day, Monthly=rolling 30-day, Custom=rolling window** | Resolved |
| 3 | Negative Habit Streaks | ✅ **Option A** — "Clean streak" (days since last occurrence) | Resolved |
| 4 | Multiple Logs | ✅ **Multiple HabitLog rows per date** | Resolved |
| 5 | Challenges Creation | ✅ **Option B** — On-demand when user visits page | Resolved |
| 6 | Heatmap | ✅ **Use `@uiw/react-heat-map` library** | Resolved |
| 7 | Emoji/Color Picker | ✅ **Option A** — Native emoji + Mantine ColorPicker | Resolved |
| 8 | Challenge Period | ✅ **Option C** — User-configurable | Resolved |
| 9 | Badge XP Duplication | ✅ **Once only** — Badge earned once per user | Resolved |
| 10 | Negative Habit XP | ✅ **Both types award XP** | Resolved |

### Q2 Details (Rolling Windows)

| Type | Definition | Streak Logic |
|------|------------|--------------|
| `daily` | Must log every calendar day | Consecutive days with logs |
| `weekly` | Rolling 7-day window (today-6 to today) | Consecutive 7-day periods where target met |
| `monthly` | Rolling 30-day window (today-29 to today) | Consecutive 30-day periods where target met |
| `custom` | Rolling `period_days` window | Same as above with custom period |

**Status:** 🚀 Ready for implementation

---

## Context

Unfust is a personal dashboard app. Adding a Habit Tracker section gives users a structured, motivating way to build and maintain habits. The feature follows the existing app patterns: FastAPI backend with SQLAlchemy models, React 19 + Mantine 8 frontend, and a dedicated page plus a dashboard widget.

---

## Data Model

### `Habit`
| Field | Type | Notes |
|-------|------|-------|
| id | int PK | |
| user_id | int FK | |
| name | str | |
| emoji | str | single emoji for visual identity |
| color | str | hex color for UI theming |
| category | str \| None | free-form tag e.g. "health", "productivity" |
| description | str \| None | why this habit matters |
| habit_type | enum | `positive` (do it) \| `negative` (avoid it) |
| frequency_type | enum | `daily` \| `weekly` \| `monthly` \| `custom` |
| target_count | int | completions required per period (default 1) |
| period_days | int \| None | for `custom` type only (rolling window in days) |
| is_active | bool | soft delete |
| order | int | display ordering |
| created_at | datetime | |

### `HabitLog`
| Field | Type | Notes |
|-------|------|-------|
| id | int PK | |
| habit_id | int FK | |
| user_id | int FK | |
| logged_date | date | date only (no time) — avoids timezone drift |
| notes | str \| None | optional check-in note |
| created_at | datetime | |

### `HabitBadge`
| Field | Type | Notes |
|-------|------|-------|
| id | int PK | |
| user_id | int FK | |
| badge_type | str | e.g. `first_log`, `streak_7`, `streak_30`, `perfect_day` |
| earned_at | datetime | |

### `HabitChallenge`
| Field | Type | Notes |
|-------|------|-------|
| id | int PK | |
| name | str | |
| description | str | |
| challenge_type | str | e.g. `streak`, `count`, `perfect_day` |
| target | int | numeric goal |
| period | enum | `weekly` \| `monthly` |
| starts_at | date | |
| ends_at | date | |
| is_system_generated | bool | |

### `HabitChallengeProgress`
| Field | Type | Notes |
|-------|------|-------|
| id | int PK | |
| user_id | int FK | |
| challenge_id | int FK | |
| current_value | int | |
| completed_at | datetime \| None | |

### `User` model additions
- `habit_xp: int` (default 0)

### Stats (computed, not stored)
- `current_streak`, `longest_streak`, `total_completions`, `completion_rate` — derived from `HabitLog` on every fetch

---

## API Endpoints

```
GET    /api/habits                                  → list habits + today's stats
POST   /api/habits                                  → create habit
PATCH  /api/habits/{id}                             → update habit
DELETE /api/habits/{id}                             → archive habit (soft delete)

POST   /api/habits/{id}/logs                        → check in (log completion)
DELETE /api/habits/{id}/logs/{log_id}               → undo check-in
GET    /api/habits/{id}/logs?start=...&end=...      → log history for heatmap

GET    /api/habits/summary                          → today's overview for dashboard widget

GET    /api/habits/challenges                       → list active challenges + user progress
GET    /api/habits/badges                           → list earned badges
```

---

## Gamification

### Streaks
- Consecutive periods where `target_count` was met
- Computed from `HabitLog.logged_date`
- Displayed as `🔥 N` on each habit card

### Completion Rings
- Mantine `RingProgress` — fills per completions toward `target_count`
- Green = complete, orange = in progress, red = missed yesterday, gray = no data

### XP & Levels
- Check-in: +10 XP
- Streak bonus: +`current_streak` XP (compounds over time)
- Badge unlock: +50 XP
- Level formula: `floor(habit_xp / 500) + 1`

### Badges
| Badge | Trigger |
|-------|---------|
| 🌱 First Step | First habit logged |
| 🔥 On Fire | 7-day streak on any habit |
| ⚡ Unstoppable | 30-day streak |
| 💎 Diamond Mind | 100-day streak |
| ✅ Perfect Day | Complete all habits in one day |
| 🎯 Sharp Focus | Hit target 5x in one week |

### Weekly/Monthly Challenges
- Auto-generated time-limited goals (e.g. "Log workout 5 times this week")
- Completing a challenge = bonus XP + special badge
- Displayed in "Active Challenges" section with progress bar

---

## Frontend Architecture

### Route: `/habits`
- Top: category filter tabs + "Add Habit" button
- Habit cards grid — each card:
  - Emoji + name + category badge + description
  - `RingProgress` completion ring
  - 🔥 streak count + XP display
  - One-click check-in button
- Click card → `Drawer` with full history heatmap (GitHub-style calendar)
- "Active Challenges" section with progress bars
- Badge collection shown in sidebar/modal

### Dashboard Widget: `HabitsWidget`
- Compact list of today's habits with mini completion rings
- Quick check-in buttons without leaving dashboard
- Total streak / today's completion count summary
- Registered in `frontend/app/components/widgets/index.ts`

---

## File Structure

### Backend (new files)
```
backend/app/models/habit.py
backend/app/schemas/habit.py
backend/app/services/habit.py
backend/app/routers/habits.py
backend/tests/test_habits.py
alembic/versions/XXXX_add_habit_tracker_tables.py
```

### Backend (modified)
```
backend/app/models/user.py          → add habit_xp field
backend/app/schemas/user.py         → expose habit_xp
backend/app/main.py                 → register habits router
```

### Frontend (new files)
```
frontend/app/routes/habits/index.tsx
frontend/app/routes/habits/components/HabitCard.tsx
frontend/app/routes/habits/components/HabitForm.tsx
frontend/app/routes/habits/components/HabitDetail.tsx
frontend/app/routes/habits/components/ChallengeCard.tsx
frontend/app/routes/habits/components/BadgeCollection.tsx
frontend/app/components/widgets/HabitsWidget.tsx
frontend/app/lib/habits-api.ts
```

### Frontend (modified)
```
frontend/app/root.tsx               → add /habits nav link
frontend/app/routes.ts              → register habits route
frontend/app/components/widgets/index.ts  → register HabitsWidget
```
