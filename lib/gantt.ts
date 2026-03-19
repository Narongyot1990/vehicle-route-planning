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
};

export type JobItem = {
  id: string;
  origin: "pool" | "tool";
  title: string;
  note: string;
  segments: JobSegment[];
  plannedStart?: number; // absolute hour index from timeline origin
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

export function buildDays(dayCount = DAY_COUNT): DayColumn[] {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

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

export function buildDaysForMonth(year: number, monthIndex: number): DayColumn[] {
  const start = new Date(year, monthIndex, 1);
  start.setHours(0, 0, 0, 0);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  return Array.from({ length: daysInMonth }, (_, index) => {
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
  jobs: JobItem[],
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
    const currentEnd = currentStart + getDurationHours(currentJob);
    return startIndex < currentEnd && nextEnd > currentStart;
  });
}

export function canDropJob(
  jobs: JobItem[],
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
    getDurationHours(job)
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
