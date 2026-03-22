export type DayColumn = {
  key: string;
  label: string;
  weekday: string;
  isoDate: string;
};

export type JobSegment = {
  id: string;
  label: string;
  durationHours: number;
  color: string;
  segmentType?: "origin" | "transit" | "waypoint" | "destination" | "direct";
};

export type JobItem = {
  id: string;
  origin: "pool" | "tool";
  title: string;
  note: string;
  segments: JobSegment[];
};

export type JobPlacement = {
  jobId: string;
  vehicleId: string;
  startIndex: number;
};

export type DragPayload = {
  kind: "job";
  jobId: string;
};

export const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
export const DAY_COUNT = 30;
export const EDGE_BUFFER_DAYS = 3;
export const HOUR_WIDTH = 44;
export const LEFT_COLUMN_WIDTH = 240;
export const BAR_HEIGHT = 44;

export function buildDaysFromOffset(baseDate: Date, startDayOffset: number, dayCount: number): DayColumn[] {
  const start = new Date(baseDate);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + startDayOffset);

  return Array.from({ length: dayCount }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);

    return {
      key: date.toISOString(),
      label: new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "short"
      }).format(date),
      weekday: new Intl.DateTimeFormat("en-GB", {
        weekday: "short"
      }).format(date),
      isoDate: toIsoDate(date)
    };
  });
}

export function getDurationHours(job: JobItem) {
  return job.segments.reduce((total, segment) => total + segment.durationHours, 0);
}

export function parseDragPayload(raw: string): DragPayload | null {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as DragPayload;
  } catch {
    return null;
  }
}

export function normalizeStartIndex(
  rawStartIndex: number,
  totalHours: number,
  jobs: JobItem[],
  payload: DragPayload | null
) {
  const duration = getDurationFromPayload(jobs, payload);
  return Math.max(0, Math.min(rawStartIndex, totalHours - duration));
}

export function isPlacementConflict(
  jobs: (JobItem | { id: string; segments: { durationHours: number }[] })[],
  placements: JobPlacement[],
  jobId: string,
  vehicleId: string,
  startIndex: number,
  durationHours: number
) {
  const nextEnd = startIndex + durationHours;

  return placements.some((placement) => {
    if (placement.vehicleId !== vehicleId || placement.jobId === jobId) {
      return false;
    }

    const currentJob = jobs.find((job) => job.id === placement.jobId);
    if (!currentJob) {
      return false;
    }

    const currentStart = placement.startIndex;
    const currentEnd = currentStart + getDurationHours(currentJob as JobItem);
    return startIndex < currentEnd && nextEnd > currentStart;
  });
}

export function canDropJob(
  jobs: (JobItem | { id: string; segments: { durationHours: number }[] })[],
  placements: JobPlacement[],
  vehicleId: string,
  startIndex: number,
  payload: DragPayload | null
) {
  if (!payload) {
    return false;
  }

  const job = jobs.find((item) => item.id === payload.jobId);
  if (!job) {
    return false;
  }

  return !isPlacementConflict(
    jobs,
    placements,
    job.id,
    vehicleId,
    startIndex,
    getDurationHours(job as JobItem)
  );
}

function getDurationFromPayload(jobs: JobItem[], payload: DragPayload | null) {
  if (!payload) {
    return 0;
  }

  const job = jobs.find((item) => item.id === payload.jobId);
  return job ? getDurationHours(job) : 0;
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// ── Job ↔ JobItem converter ───────────────────────────────────────────────────
// Job is the rich business format (real stops, customer info, etc.)
// JobItem is the timeline display format (segments → colored bars)

import type { Job } from "@/features/gantt/types/job";

const DEFAULT_DIRECT_SEGMENT_COLOR = "#475569";
const TRANSIT_SEGMENT_COLOR = "#334155";

export function jobToJobItem(job: Job): JobItem {
  // Direct job (no stops): show as a single segment bar
  if (job.directLeadTimeHours !== undefined) {
    return {
      id: job.id,
      origin: "pool",
      title: job.routeName || job.customerName,
      note: `${job.customerName} — ${job.directLeadTimeHours}h direct`,
      segments: [
        {
          id: `${job.id}-direct`,
          label: job.customerName,
          durationHours: job.directLeadTimeHours,
          segmentType: "direct",
          color:
            job.priority === "urgent"
              ? "#dc2626"
              : job.priority === "high"
              ? "#d97706"
              : DEFAULT_DIRECT_SEGMENT_COLOR,
        },
      ],
    };
  }

  // Template-based job: stops → segments
  return {
    id: job.id,
    origin: "pool",
    title: job.routeName || _routeSummary(job),
    note: `${job.customerName} | ${_routeSummary(job)}`,
    segments: buildRouteSegments(job),
  };
}

function buildRouteSegments(job: Job): JobSegment[] {
  const segments: JobSegment[] = [];

  job.stops.forEach((stop, index) => {
    const dwellHours = Math.max(0, stop.dwellHours ?? 0);
    if (dwellHours > 0) {
      segments.push({
        id: `${stop.id}-stop`,
        label: `${getStopIcon(index, job.stops.length)} ${stop.label}`,
        durationHours: dwellHours,
        segmentType: getStopSegmentType(index, job.stops.length),
        color: stop.color,
      });
    }

    const nextStop = job.stops[index + 1];
    if (!nextStop) {
      return;
    }

    const nextStopDwellHours = Math.max(0, nextStop.dwellHours ?? 0);
    const transitHours = Math.max(0, nextStop.transitFromPrevHours - nextStopDwellHours);
    if (transitHours > 0) {
      segments.push({
        id: `${stop.id}-transit-${nextStop.id}`,
        label: "🚚 In Transit",
        durationHours: transitHours,
        segmentType: "transit",
        color: TRANSIT_SEGMENT_COLOR,
      });
    }
  });

  if (segments.length > 0) {
    return segments;
  }

  return job.stops.map((stop, index) => ({
    id: stop.id,
    label: `${getStopIcon(index, job.stops.length)} ${stop.label}`,
    durationHours: stop.transitFromPrevHours,
    segmentType: getStopSegmentType(index, job.stops.length),
    color: stop.color,
  }));
}

function getStopSegmentType(index: number, totalStops: number): JobSegment["segmentType"] {
  if (totalStops === 1) {
    return "destination";
  }

  if (index === 0) {
    return "origin";
  }

  if (index === totalStops - 1) {
    return "destination";
  }

  return "waypoint";
}

function getStopIcon(index: number, totalStops: number) {
  if (index === 0) {
    return "◉";
  }

  if (index === totalStops - 1) {
    return "▣";
  }

  return "⬢";
}

function _routeSummary(job: Job): string {
  if (!job.stops || job.stops.length === 0) return "No stops";
  const first = job.stops[0];
  const last = job.stops[job.stops.length - 1];
  if (job.stops.length === 1) return first.label;
  return `${first.label} → ${last.label}`;
}

// ── Shared time formatting ────────────────────────────────────────────────────

export function formatAbsoluteHourLabel(origin: Date, absoluteHourIndex: number): string {
  const target = new Date(origin);
  target.setHours(target.getHours() + absoluteHourIndex);

  const datePart = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short"
  }).format(target);
  const timePart = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(target);

  return `${datePart} ${timePart}`;
}
