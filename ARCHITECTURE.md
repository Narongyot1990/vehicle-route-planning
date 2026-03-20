# Project Structure & Architecture

## Overview

This is a **Vehicle Route Planning** web app built with Next.js 15 + TypeScript. The core UI is a Gantt-style timeline where users can drag and drop jobs onto vehicles.

---

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** CSS Modules / Global CSS with CSS Variables
- **State Management:** React hooks (`useState`, `useEffect`, `useRef`, `useMemo`)
- **Architecture:** Feature-based Clean Architecture

---

## Folder Structure

```
domestics-planning/
├── app/
│   ├── page.tsx              # Entry page — renders <GanttChart />
│   ├── layout.tsx           # Root layout
│   └── globals.css          # Global styles & CSS variables
│
├── components/
│   └── GanttChart.tsx       # Root Gantt component — no props needed
│
├── features/
│   └── gantt/
│       ├── components/
│       │   ├── GanttChartFeature.tsx   # Main feature component — orchestrates all sub-components
│       │   ├── TimelineBoard.tsx        # Scrollable timeline grid with vehicle rows
│       │   ├── VehicleTimelineRow.tsx   # Single vehicle row (label + timeline slots + job bars)
│       │   ├── PlacedJobBar.tsx         # Rendered job bar on the timeline
│       │   ├── TimelineSlotCell.tsx     # Individual hour slot cell (drop target)
│       │   ├── JobPalette.tsx           # Sidebar with unassigned/assigned job cards
│       │   ├── PaletteJobCard.tsx       # Individual job card in the sidebar
│       │   ├── TimelineBoardHeader.tsx  # Date/day header above timeline
│       │   ├── GanttMeta.tsx            # Top toolbar (mode toggle, today button, date picker)
│       │   └── ToolboxTray.tsx          # Bottom toolbox for templates
│       │
│       ├── hooks/
│       │   ├── useGanttChartState.ts    # Main state hook — all timeline business logic
│       │   └── useVehicles.ts           # Hook for fetching vehicle list
│       │
│       └── data/
│           └── mockVehicles.ts          # Vehicle type definition + mock data
│
└── lib/
    └── gantt.ts               # Core Gantt utilities (types, constants, helpers)
```

---

## Data Model

### Vehicle

```typescript
type Vehicle = {
  licensePlate: string;  // ทะเบียนรถ เช่น "69-3320"
  vehicleType: string;   // ประเภทรถ เช่น "6W", "10W", "Prime Mover", "4W"
  engineType: string;    // ประเภทเครื่องยนต์ "ICE", "EV"
  branch: string;        // สาขาที่ปฏิบัติการ "KSN", "CHO", "AYA", "BBT", "RA2"
};
```

### Job & Placement

See `lib/gantt.ts` for full type definitions:
- `JobItem` — job definition with segments (title, segments, plannedStart, origin)
- `JobPlacement` — which vehicle + startIndex a job is placed at

---

## Key Hooks

### `useVehicles(): Vehicle[]`

- Returns the list of vehicles to display in the timeline
- Currently returns mock data; replace the `TODO` comment with an API call when ready

```typescript
// lib/features/gantt/hooks/useVehicles.ts
const vehicles = useVehicles();
```

---

### `useGanttChartState(vehicles: Vehicle[]): GanttChartState`

The central state hook. Manages:

| State | Description |
|---|---|
| `windowStartDayOffset` | Timeline window start (days from today) |
| `windowDayCount` | Number of days visible in timeline |
| `jobs` | All job definitions |
| `placements` | Which jobs are placed on which vehicle |
| `mode` | `"move"` or `"edit"` |
| `editMode` | Boolean alias of `mode === "edit"` |
| `activeDrag` | Currently dragged job payload |
| `hoveredDrop` | Current drop target (vehicle + hour index) |
| `paletteView` | `"unassigned"` or `"assigned"` tab |
| `editingCell` | Currently inline-editing cell (job + segment) |
| `hourWidth` | Current zoom level (pixels per hour) |
| `jump*` | Navigation state for auto-scrolling to a job |
| `initializedJump` | Flag to trigger initial jump to today |

**Key functions:**

| Function | Purpose |
|---|---|
| `handleGoToToday()` | Scroll timeline to show today |
| `handleCustomDateNavigate(date: string)` | Jump to a specific date |
| `handleTimelineDrop(vehicleId, displayHourIndex, event)` | Handle job drop on timeline |
| `handleNavigateToJobPlacement(jobId)` | Scroll to where a job is placed |
| `handleUpdatePlacement(jobId, newStartIndex)` | Move a placed job |
| `handleUnplaceJob(jobId)` | Remove job from timeline |
| `handleExtendWindowLeft/Right()` | Dynamically expand timeline |

---

## Component Props Pattern

**GanttChartFeature** — No props needed. Uses `useVehicles()` internally.

**TimelineBoard** — Receives `vehicles: Vehicle[]` (not string[]).

**VehicleTimelineRow** — Receives `vehicle: Vehicle` (full object, not just a string).

**GanttMeta** — Top toolbar with callbacks:
- `onGoToToday`, `onCustomDateNavigate`, `onModeChange`

---

## Timeline Rendering

The timeline is a CSS Grid:

```
[Vehicle Label Col] [ Hour 0 ][ Hour 1 ][ Hour 2 ]...
[Vehicle A Row    ] [  slot  ][  slot  ][  slot  ]...
[Vehicle B Row    ] [  slot  ][  slot  ][  slot  ]...
```

- `windowStartHour = windowStartDayOffset * 24`
- `displayTotalHours = windowDayCount * 24`
- Each row = `slots-layer` (drop targets) + `bars-layer` (placed jobs)

---

## Key Files for Common Tasks

| Task | File |
|---|---|
| Add new vehicle field | `features/gantt/data/mockVehicles.ts` |
| Change initial timeline window | `features/gantt/hooks/useGanttChartState.ts` (`INITIAL_WINDOW_START_DAY_OFFSET`) |
| Change row height | `app/globals.css` (`--row-height`) |
| Change timeline zoom | `useGanttChartState.hourWidth` |
| Add new job type/template | `features/gantt/constants.ts` (`TOOLBOX_TEMPLATES`, `INITIAL_JOBS`) |
| Style vehicle cell | `app/globals.css` (`.vehicle-cell-*` classes) |
| Handle job drop logic | `useGanttChartState.handleTimelineDrop` |
| Change date/time format | `lib/gantt.ts` (`formatAbsoluteHourLabel`) |

---

## Important Constants

```typescript
// useGanttChartState.ts
INITIAL_WINDOW_START_DAY_OFFSET = 0   // Start at today (change to -30 to see past)
INITIAL_WINDOW_DAY_COUNT = 90          // Days visible at once
WINDOW_EXTEND_DAYS = 14               // Days added when extending left/right

// lib/gantt.ts
HOURS = [0, 1, 2, ..., 23]            // Hour indices
HOUR_WIDTH = 44                        // Default pixels per hour
LEFT_COLUMN_WIDTH = 200                // Vehicle label column width
BAR_HEIGHT = 40                        // Job bar height
```

---

## Adding a New Vehicle Data Field

1. Update `Vehicle` type in `features/gantt/data/mockVehicles.ts`
2. Update `VehicleTimelineRow` rendering in `features/gantt/components/VehicleTimelineRow.tsx`
3. Update CSS in `app/globals.css` if needed for new UI elements
4. If field is optional (may not be complete), guard with `{ field ? ... }`

---

## TODO

- [ ] Replace `useVehicles()` mock with real API call
- [ ] Persist placements to backend
- [ ] Add vehicle assignment conflict detection
