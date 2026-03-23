# Project Structure & Architecture

## Overview

This is a **Vehicle Route Planning** web app built with Next.js 15 + TypeScript. The core UI is a Gantt-style timeline where users can drag and drop jobs onto vehicles.

**Data Flow:**

```
Customer → Route (stops + duration) → JobOrder (snapshot + schedule) → Gantt Timeline
```

---

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Database:** MongoDB (via `mongodb` driver)
- **Styling:** CSS Modules / Global CSS with CSS Variables
- **State Management:** React hooks (`useState`, `useEffect`, `useRef`, `useMemo`)
- **Architecture:** Feature-based Clean Architecture

---

## Folder Structure

```
domestics-planning/
├── app/
│   ├── page.tsx                    # Entry — <GanttChart />
│   ├── layout.tsx                  # Root layout
│   ├── globals.css                 # Global styles & CSS variables
│   │
│   ├── customers/
│   │   ├── page.tsx                # Customer list
│   │   ├── create/page.tsx         # Create customer + first route
│   │   └── [id]/page.tsx           # Customer detail (edit, routes CRUD)
│   │
│   ├── jobs/
│   │   ├── page.tsx                # Job Orders table
│   │   └── create/page.tsx         # Create Job Order (customer → truck type+route → schedule + trailer)
│   │
│   ├── vehicles/
│   │   └── page.tsx                # Vehicle management (CRUD)
│   │
│   └── api/
│       ├── customers/route.ts      # CRUD /api/customers
│       ├── routes/route.ts         # CRUD /api/routes
│       ├── joborders/route.ts      # CRUD /api/joborders
│       ├── vehicles/route.ts       # CRUD /api/vehicles
│       ├── jobs/route.ts           # Legacy jobs API (direct Job type)
│       ├── seed/route.ts           # POST: reset & seed demo data
│       └── clear/route.ts          # DELETE: wipe all collections
│
├── assets/
│   └── icons/                      # SVG icons (TruckIcon, PlusIcon, EditIcon, etc.)
│
├── components/
│   ├── GanttChart.tsx              # Root Gantt component — no props needed
│   └── ui/
│       ├── ModalShell.tsx          # Shared modal overlay
│       └── Icon.tsx                # SVG image wrapper component
│
├── features/
│   └── gantt/
│       ├── components/
│       │   ├── GanttChartFeature.tsx    # Main orchestrator
│       │   ├── TimelineBoard.tsx        # Scrollable timeline grid
│       │   ├── VehicleTimelineRow.tsx   # Single vehicle row
│       │   ├── PlacedJobBar.tsx         # Job bar on timeline (shows [VT][FT/C] badges)
│       │   ├── TimelineSlotCell.tsx     # Hour slot (drop target)
│       │   ├── JobPalette.tsx           # Sidebar with job cards
│       │   ├── PaletteJobCard.tsx        # Orchestrator for job card views
│       │   ├── PaletteJobCardViews.tsx  # Normal, Edit, PlacementEdit, PlannedStartEdit sub-views
│       │   ├── JobModal.tsx             # Job detail modal
│       │   ├── JobOrderEditModal.tsx    # Job order edit modal
│       │   ├── JobOrderEditFormFields.tsx # Form sections layout
│       │   ├── TimelineBoardHeader.tsx  # Date header
│       │   ├── GanttMeta.tsx            # Top toolbar (nav tabs: Jobs, Customers, Routes, Trucks)
│       │   ├── ToolboxTray.tsx          # Bottom toolbox
│       │   ├── ToolboxPopup.tsx         # Toolbox popup
│       │   └── ToolboxTemplateCard.tsx  # Template card
│       │
│       ├── hooks/
│       │   ├── useGanttChartState.ts    # Timeline orchestrator (composes nav, placements, tools)
│       │   ├── useTimelineNavigation.ts # Zoom, window, jump, and offset state
│       │   ├── usePlacements.ts         # Job positioning and droppable logic
│       │   ├── useToolInstances.ts      # Dummy tools (PM, No driver) logic
│       │   ├── usePaletteJobCard.ts     # State for PaletteJobCard
│       │   ├── useJobOrderEditForm.ts   # State for JobOrderEditModal
│       │   ├── useJobs.ts               # Fetch JobOrders → convert to Job[]
│       │   └── useVehicles.ts           # Fetch vehicle list from /api/vehicles
│       │
│       ├── types/
│       │   └── job.ts                  # Job, JobStop, JobStatus, JobPriority
│       │
│       ├── data/
│       │   └── mockVehicles.ts         # Re-exports Vehicle types from lib/types
│       │
│       └── constants.ts                # TOOLBOX_TEMPLATES
│
└── lib/
    ├── db.ts                       # MongoDB connection (cached)
    ├── types.ts                    # Canonical types: Customer, Route, RouteStop, JobOrder, Vehicle
    ├── gantt.ts                    # Gantt utilities, JobItem, jobToJobItem converter
    └── truckTypes.ts               # TRUCK_TYPE_OPTIONS (6 types)
```

---

## Data Model

### Customer (`lib/types.ts`)

```typescript
type Customer = {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  address: string;
  createdAt: string;
  updatedAt: string;
};
```

### RouteStop (`lib/types.ts`)

```typescript
type RouteStop = {
  label: string;
  address: string;
  contactName: string;
  contactPhone: string;
  dwellHours: number;       // loading/unloading time at this stop
  transitHours: number;     // travel time from previous stop
  order: number;
};
```

### Route (`lib/types.ts`)

```typescript
type Route = {
  id: string;
  customerId: string;
  name: string;
  description: string;
  stops: RouteStop[];
  requiredVehicleTypes?: string[];    // e.g. ["6W", "10W"]
  returnInfo?: {
    enabled: boolean;
    label: string;
    address: string;
    dwellHours: number;
    transitHours: number;
  };
  totalDurationHours: number;         // transit + dwell total
  createdAt: string;
  updatedAt: string;
};
```

Route creation/editing in [`app/routes/page.tsx`](app/routes/page.tsx) includes clickable truck type selection for `requiredVehicleTypes`, editable route records, and optional `returnInfo` shaped like a return stop (`label`, `address`, `dwellHours`, `transitHours`). This is then used by [`app/jobs/create/page.tsx`](app/jobs/create/page.tsx) to dynamically filter route choices after a truck type is selected and to surface return-job details.

### JobOrder (`lib/types.ts`)

```typescript
type JobOrder = {
  id: string;
  jobNumber: string;
  customerId: string;
  routeId: string;
  routeSnapshot: {                    // frozen at creation time
    name: string;
    stops: RouteStop[];
    totalDurationHours: number;
    requiredVehicleTypes: string[];
  };
  includeReturnTrip?: boolean;
  plannedStartDate: string;           // "YYYY-MM-DD"
  plannedStartTime: string;           // "HH:mm"
  plannedStart: number;               // absolute hour index from today midnight
  vehiclePlate?: string;
  driverName?: string;
  trailerPlate?: string;              // ทะเบียนตู้ Trailer (e.g. "T-001")
  requireTrailer?: boolean;            // ลูกค้า request ให้ใช้ trailer
  status: JobOrderStatus;
  priority: JobOrderPriority;
  quotedPrice?: number;
  currency?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};
```

### Vehicle (`lib/types.ts`)

```typescript
type VehicleType = "6W" | "10W" | "Prime Mover" | "Car carrier" | "4W" | "Van";
type Branch = "KSN" | "CHO" | "AYA" | "BBT" | "RA2";
type EngineType = "ICE" | "EV";

type Vehicle = {
  id: string;
  licensePlate: string;  // ทะเบียนรถ เช่น "69-3320"
  vehicleType: VehicleType;
  engineType: EngineType;
  branch: Branch;
  createdAt: string;
  updatedAt: string;
};
```

### Job & JobItem (Gantt display types)

- **Job** (`features/gantt/types/job.ts`) — rich business format with stops, customer info, assignment
- **JobItem** (`lib/gantt.ts`) — timeline display format (segments → colored bars), includes `trailerPlate`, `requireTrailer`, `requiredVehicleTypes` for badge display
- **JobPlacement** (`lib/gantt.ts`) — where a job sits on the timeline: `{ jobId, vehicleId, startIndex }`

`Job.routeName` is carried from `JobOrder.routeSnapshot.name` so the timeline bar header can display the saved route name instead of reconstructing it from stops.

---

## UI Visual Language (Semantic Mapping)

To ensure a professional and intuitive experience, the application uses a **Semantic Mapping** system for segment icons and colors based on activity types.

### 1. Icons (`features/gantt/components/GanttIcons.tsx`)
We use dedicated SVG line-icons instead of generic emojis:
- **Origin (`🏭`):** `IconOrigin` — Start of the job (Loading/Pickup).
- **Transit (`🚚/🚛`):** `IconTransit` / `IconDirect` — En-route or non-stop driving.
- **Stop (`🏁`):** `IconDestination` — Final delivery.
- **Waypoint (`📦`):** `IconWaypoint` — Intermediate stops.

### 2. Colors (`getSemanticSegmentColor`)
Background colors are mapped to these icons across the entire UI (Gantt and Palette):
- **🟡 Amber (`#f59e0b`):** Origin / Preparation / Pickup (Action Required).
- **🔵 Blue (`#3b82f6`):** Transit / Path (Progress).
- **🟢 Emerald (`#10b981`):** Destination / Success (Completion).
- **🔘 Slate (`#64748b`):** Waypoints / Others (Neutral).

**Implementation Details:**
- Icons are rendered as white (`#fff`) on top of these vibrant backgrounds for maximum contrast and an Apple/Linear-style premium "Enterprise SaaS" aesthetic.
- Logic is centralized in `GanttIcons.tsx` so any future AI assistant can update the theme in one place.

### 3. Gantt Bar Badges (Trailer Display)

Gantt bar headers display `[VT][FT/C]` badges for quick visual verification:
- **Vehicle type badge:** From `requiredVehicleTypes[0]` in route (e.g. `[6W]`, `[PM]`, `[10W]`)
- **Trailer badge:** `[FT]` = Full Trailer (has trailer), `[C]` = Chassis (awaiting trailer attachment)

---

## Data Conversion Pipeline

```
DB (JobOrder) → useJobs.ts (jobOrderToJob) → Job → gantt.ts (jobToJobItem) → JobItem → Gantt UI
```

| Step | Function | From | To |
|---|---|---|---|
| 1 | `jobOrderToJob()` | `JobOrder` | `Job` |
| 2 | `jobToJobItem()` | `Job` | `JobItem` |

Jobs with `stops` → multi-segment bars. Jobs with `directLeadTimeHours` only → single bar.

Timeline display uses explicit segment-type metadata (`origin`, `transit`, `waypoint`, `destination`, `direct`) so both the table bars and right-side previews can render consistent visual markers instead of inferring meaning from text labels via [`jobToJobItem()`](lib/gantt.ts:211).

---

## API Routes

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/customers` | List all customers (or `?id=` for single) |
| POST | `/api/customers` | Create customer |
| PATCH | `/api/customers` | Update customer |
| DELETE | `/api/customers?id=` | Delete customer + cascade routes + joborders |
| GET | `/api/routes` | List routes (or `?customerId=` filter) |
| POST | `/api/routes` | Create route |
| DELETE | `/api/routes?id=` | Delete route |
| GET | `/api/joborders` | List job orders (or `?customerId=` filter) |
| POST | `/api/joborders` | Create job order (snapshots route, includes trailer fields) |
| PATCH | `/api/joborders` | Update job order |
| DELETE | `/api/joborders?id=` | Delete job order |
| GET | `/api/vehicles` | List vehicles (filter: `?branch=`, `?vehicleType=`) |
| POST | `/api/vehicles` | Create vehicle |
| PATCH | `/api/vehicles` | Update vehicle |
| DELETE | `/api/vehicles?id=` | Delete vehicle (fails if has active jobs) |
| POST | `/api/seed` | Reset + seed demo data (customers, routes, joborders) |
| DELETE | `/api/clear` | Wipe all collections |

---

## Key Hooks

### `useVehicles(): { vehicles: Vehicle[]; loading: boolean; error: string | null }`

Fetches vehicles from `/api/vehicles`. Replaced mock data with real API.

### `useJobs()`

Fetches `JobOrder[]` from `/api/joborders`, converts to `Job[]` via `jobOrderToJob()`. Provides:
- `jobs`, `loading`, `filter`, `setFilter`
- `createJob`, `updateJob`, `deleteJob`
- `filteredJobs()`, `unplacedJobs()`, `placedJobs()`, `stats()`

### `useGanttChartState(vehicles, jobs, onJobUpdate?)`

Central timeline orchestrator. To adhere to single-responsibility and keep files under ~150 lines, the core state is split across specialized hooks:

1. **`useTimelineNavigation`**: Manages window offsets, horizontal zoom (`hourWidth`), and jump functionalities (`handleGoToToday`, `jumpVehicleId`).
2. **`usePlacements`**: Manages job positions (`placements`) and handles the logic for detecting valid drops (`canDrop`, `handleUpdatePlacement`).
3. **`useToolInstances`**: Manages dummy toolbox elements like "PM" blocks directly within the timeline grid (`toolInstances`, `handleResizeToolInstance`).

`useGanttChartState` pulls these together alongside central pointer-events drag handlers.

Drag/drop performance design (hot path):

- Conflict checks are optimized in-hook via memoized indexes (`jobsById`, `placementsByJobId`, `jobDurationById`, `placementsByVehicle`) in [`useGanttChartState`](features/gantt/hooks/useGanttChartState.ts:42)
- Hover state updates during drag are guarded to avoid redundant React state writes in [`handleTimelineSlotDragOver`](features/gantt/hooks/useGanttChartState.ts:596), [`handlePlacedJobPointerHover`](features/gantt/hooks/useGanttChartState.ts:671), and [`handlePointerDragMove`](features/gantt/hooks/useGanttChartState.ts:808)
- Payload equality is checked with [`isSameDragPayload`](features/gantt/hooks/useGanttChartState.ts:1014) so repeated `dragover` events do not trigger unnecessary rerenders
- Toolbox dummy blocks (`PM`, `No driver`, `No job`) are stored as local tool instances in timeline state and can be resized directly on the table with mouse/touch via [`handleResizeToolInstance`](features/gantt/hooks/useGanttChartState.ts:408) and the resize handle in [`PlacedJobBar`](features/gantt/components/PlacedJobBar.tsx:183)
- Toolbox dummy blocks can be tapped/clicked on the timeline to focus the right-side placed list via [`handleGoToPlacedJobInPalette`](features/gantt/hooks/useGanttChartState.ts:325); removal from the sidebar is guarded by a browser confirmation dialog in [`PaletteJobCard`](features/gantt/components/PaletteJobCard.tsx:220)

---

## Key Files for Common Tasks

| Task | File |
|---|---|
| Add/edit Vehicle type | `lib/types.ts` (`VehicleType`) + `lib/truckTypes.ts` (`TRUCK_TYPE_OPTIONS`) |
| Vehicle API | `app/api/vehicles/route.ts` |
| Vehicle management page | `app/vehicles/page.tsx` |
| Change initial timeline window | `features/gantt/hooks/useGanttChartState.ts` |
| Change row height | `app/globals.css` (`--row-height`) |
| Change timeline zoom | `useGanttChartState.hourWidth` |
| Add toolbox template | `features/gantt/constants.ts` (`TOOLBOX_TEMPLATES`) |
| Style vehicle cell | `app/globals.css` (`.vehicle-cell-*`) |
| Handle job drop logic | `usePlacements.ts` (`handleUpdatePlacement`) + `useGanttChartState.ts` (`handleTimelineDrop`) |
| Optimize drag/drop responsiveness | `features/gantt/hooks/usePlacements.ts` (`canDrop`) + `useGanttChartState.ts` |
| Resize toolbox dummy bars on timeline | `features/gantt/components/PlacedJobBar.tsx` + `features/gantt/hooks/useToolInstances.ts` |
| Change date/time format | `lib/gantt.ts` (`formatAbsoluteHourLabel`) |
| Add/edit Customer type | `lib/types.ts` |
| Add/edit Route type | `lib/types.ts` |
| Add/edit JobOrder type | `lib/types.ts` |
| Add trailer fields to JobOrder | `lib/types.ts` (`requireTrailer`, `trailerPlate`) |
| Convert JobOrder → Job | `features/gantt/hooks/useJobs.ts` (`jobOrderToJob`) |
| Convert Job → JobItem | `lib/gantt.ts` (`jobToJobItem`) |
| Gantt bar trailer badges | `features/gantt/components/PlacedJobBar.tsx` |
| Seed demo data | `app/api/seed/route.ts` |
| Add SVG icon | `assets/icons/` (SVG files) + `components/ui/Icon.tsx` (wrapper) |

---

## Important Constants

```typescript
// useGanttChartState.ts
INITIAL_WINDOW_START_DAY_OFFSET = 0    // Start at today
INITIAL_WINDOW_DAY_COUNT = 30          // Days visible
WINDOW_EXTEND_DAYS = 14                // Days added when extending

// lib/gantt.ts
HOURS = [0, 1, 2, ..., 23]
HOUR_WIDTH = 44                        // Default px/hour
LEFT_COLUMN_WIDTH = 240                 // Vehicle label width
BAR_HEIGHT = 44                         // Job bar height

// lib/truckTypes.ts
TRUCK_TYPE_OPTIONS = ["6W", "10W", "Prime Mover", "Car carrier", "4W", "Van"]
```

---

## TODO

- [x] ~~Replace `useVehicles()` mock with real API call~~ (implemented `/api/vehicles`)
- [ ] Persist placements to backend (timeline drag-and-drop save)
- [ ] Add vehicle assignment conflict detection
- [ ] Add route editing on customer detail page
- [ ] Resolve customer name in Gantt (currently shows customerId)
- [ ] Trailer management page (CRUD for trailers - Phase 2)
- [ ] Full trailer tracking system with Trailer collection
