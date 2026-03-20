# AGENTS.md - Vehicle Route Planning Project

_Standards and workflows for AI agents working in this codebase._

---

## First Contact

Welcome! Before writing any code, read `ARCHITECTURE.md` — it documents the data model, folder structure, and key hooks. This file assumes you have read it.

---

## Core Rules

### Think Before You Code

1. Identify the **core files** involved
2. Identify the **side effects** of any change
3. Plan your approach — **one small change at a time**
4. Verify the change solves the problem without breaking other things

### No Hallucinations

If context, types, or utilities are missing — **STOP and ASK**. Do not invent missing pieces.

### Minimal Changes First

Start with the smallest fix that solves the problem. Prefer editing one file over changing many. Add new files only when truly necessary.

### Respect Existing Patterns

Match the project's architecture and naming conventions:
- Feature-based folder structure under `features/`
- `use*` prefix for hooks
- Props are typed — no `any`
- Business logic extracted into hooks, not inline in components

### Incremental Refactoring

If you encounter messy code while fixing a bug, clean up only the **local scope** (Boy Scout Rule). Do NOT rewrite unrelated parts of the codebase.

---

## Code Style

### UI Components

- Max ~100-150 lines per component `return`
- No multi-line inline event handlers → extract to named functions
- No large `.map()` inline → extract to a sub-component
- Complex state (>3 `useState`) → extract to a custom hook

### Naming

- `camelCase` for variables and functions
- `PascalCase` for React components and TypeScript types
- `SCREAMING_SNAKE_CASE` for constants
- `kebab-case` for CSS class names

### Types

- Always use explicit types — avoid `any`
- Co-locate types with their usage when possible
- Document exported types in `ARCHITECTURE.md`

---

## Working with Vehicles

Vehicles are typed as:

```typescript
type Vehicle = {
  licensePlate: string;  // ทะเบียนรถ เช่น "69-3320"
  vehicleType: string;   // ประเภทรถ เช่น "6W", "10W", "Prime Mover", "4W"
  engineType: string;   // ประเภทเครื่องยนต์ "ICE", "EV"
  branch: string;        // สาขา "KSN", "CHO", "AYA", "BBT", "RA2"
};
```

Vehicles come from `useVehicles()` hook. To add a new field:

1. Update `features/gantt/data/mockVehicles.ts` — add field to `Vehicle` type + mock data
2. Update `VehicleTimelineRow.tsx` rendering
3. Update `ARCHITECTURE.md`
4. Optional: guard with `{ field ? ... }` if field can be undefined

---

## Working with the Timeline State

All timeline state lives in `useGanttChartState(vehicles: Vehicle[])`. Key things:

- `windowStartDayOffset` — controls which day the timeline starts at
- `handleGoToToday()` — scrolls to today
- `handleCustomDateNavigate(date: string)` — jump to specific date
- `placements` — array of `{ jobId, vehicleId, startIndex }` — where jobs sit on the timeline

**Common tasks:**

| Task | Where |
|---|---|
| Change default timeline window | `useGanttChartState.ts` (`INITIAL_WINDOW_START_DAY_OFFSET`) |
| Change row height | `globals.css` (`--row-height`) |
| Handle job drop on timeline | `useGanttChartState.handleTimelineDrop` |
| Add/remove job types | `features/gantt/constants.ts` |

---

## Asking for Clarification

When the user's request is ambiguous, **ask before acting**. Good questions:

- "Which component should I modify?"
- "Should this change affect the mobile layout too?"
- "Is this data required or optional?"

---

## Definition of Done

Before finishing a task:

1. The requested problem is solved
2. The change is minimal — no unnecessary rewrites
3. If new types/fields were added, `ARCHITECTURE.md` is updated
4. No TypeScript errors (if type system is involved)
