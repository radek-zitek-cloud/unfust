# Dashboard Widgets — Design Document

**Date:** 2026-02-15
**Status:** Approved

## Overview

Add a configurable widget system to the unfust dashboard. Users can add, remove, reorder, and resize widgets on a draggable grid. First iteration includes five widgets: clock, weather, bookmarks, RSS feed, and system monitor.

## Architecture: Generic Widget Framework

A registry-based widget system where each widget type is a self-contained module (React component + optional backend endpoint). User layouts stored as JSON. Extensible — adding a new widget means registering a component and optionally adding an API route.

## Data Model

### `dashboard_layouts` table
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK |
| `user_id` | UUID | FK → users, unique (one layout per user) |
| `widgets` | JSON | Array of widget instances with positions |
| `created_at` | datetime | |
| `updated_at` | datetime | |

Widget JSON structure:
```json
[
  { "id": "w1", "type": "weather", "x": 0, "y": 0, "w": 1, "h": 1, "config": { "city": "Prague", "units": "metric" } },
  { "id": "w2", "type": "clock", "x": 1, "y": 0, "w": 1, "h": 1, "config": { "timezone": "Europe/Prague", "format": "24h" } },
  { "id": "w3", "type": "bookmarks", "x": 0, "y": 1, "w": 2, "h": 1, "config": {} },
  { "id": "w4", "type": "rss", "x": 2, "y": 0, "w": 1, "h": 2, "config": { "feeds": ["https://..."] } },
  { "id": "w5", "type": "system", "x": 3, "y": 0, "w": 1, "h": 1, "config": {} }
]
```

### `bookmarks` table
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK |
| `user_id` | UUID | FK → users |
| `title` | string | |
| `url` | string | |
| `category` | string | nullable, for grouping |
| `position` | int | sort order |
| `created_at` | datetime | |

### `rss_feeds` table
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK |
| `user_id` | UUID | FK → users |
| `url` | string | Feed URL |
| `title` | string | nullable, auto-populated from feed |
| `last_fetched_at` | datetime | |
| `cached_items` | JSON | Cached feed entries |
| `created_at` | datetime | |

Weather and system monitor are stateless — no tables needed.

## Backend API

### Widget Layout
- `GET /api/widgets/layout` — Get current user's layout (or default if none)
- `PUT /api/widgets/layout` — Save full widget layout (positions + configs)

### Weather
- `GET /api/widgets/weather?city={city}&units={metric|imperial}` — Proxies to OpenWeatherMap, 10-minute in-memory cache

### Bookmarks
- `GET /api/bookmarks` — List user's bookmarks (ordered by category, position)
- `POST /api/bookmarks` — Create bookmark
- `PATCH /api/bookmarks/{id}` — Update bookmark
- `DELETE /api/bookmarks/{id}` — Delete bookmark

### RSS
- `GET /api/rss/feeds` — List user's configured feeds
- `POST /api/rss/feeds` — Add a feed (fetches and caches immediately)
- `DELETE /api/rss/feeds/{id}` — Remove a feed
- `GET /api/rss/items` — Aggregated cached items across all feeds, sorted by date

Background task refreshes RSS feeds every 15 minutes via `asyncio.create_task` on startup.

### System Monitor
- `GET /api/widgets/system` — Host stats (CPU %, memory %, disk %) via psutil + Docker container stats if socket available

### New Environment Variables
- `OPENWEATHERMAP_API_KEY` — required for weather widget
- Docker socket: mount `/var/run/docker.sock` for container stats (optional, gracefully degrades)

## Frontend Architecture

### Widget Registry
```typescript
const widgetRegistry = {
  weather: WeatherWidget,
  clock: ClockWidget,
  bookmarks: BookmarksWidget,
  rss: RssWidget,
  system: SystemWidget,
};
```

### Grid Layout
`react-grid-layout` for draggable/resizable widgets. Each widget wrapped in a `WidgetCard` (Mantine Paper with title bar, settings icon, remove button).

### Widget Behaviors
| Widget | Data Source | Refresh |
|--------|------------|---------|
| Clock | Pure frontend | 1s interval |
| Weather | `GET /api/widgets/weather` | 10 min |
| Bookmarks | `GET /api/bookmarks` | On mount + after mutations |
| RSS | `GET /api/rss/items` | On mount + 15 min |
| System | `GET /api/widgets/system` | 30s interval |

### Dashboard Page Flow
1. Fetch `GET /api/widgets/layout` on mount
2. Empty state with widget picker if no layout exists
3. Render `react-grid-layout` with widgets from layout
4. Debounce-save layout to `PUT /api/widgets/layout` on drag/resize
5. "Add widget" button for widget picker
6. Settings icon per widget for configuration

All widget content lives on the existing `/dashboard` index page, replacing stat cards.

## Error Handling
| Scenario | Handling |
|----------|----------|
| No OpenWeatherMap key | Widget shows "API key not configured" |
| Weather API rate limit | Show last cached data with "stale" indicator |
| RSS feed unreachable | Keep cached items, show warning badge |
| Docker socket unavailable | Omit container section, show host stats only |
| Empty dashboard | Friendly empty state with "Add your first widget" CTA |
| Invalid widget config | Widget renders error state within its card |
| Layout save fails | Toast notification, retry on next change |

## Dependencies

**Backend:** `psutil`, `docker` (optional), `httpx`, `feedparser`
**Frontend:** `react-grid-layout`, `@types/react-grid-layout`
