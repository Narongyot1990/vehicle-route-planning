// ── Job Status ───────────────────────────────────────────────────────────────
// Canonical types live in lib/types.ts — re-export for backward compatibility
export type { JobOrderStatus as JobStatus } from "@/lib/types";
import type { JobOrderStatus as JobStatus } from "@/lib/types";

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  draft: "Draft",
  confirmed: "Confirmed",
  assigned: "Assigned",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const JOB_STATUS_COLORS: Record<JobStatus, string> = {
  draft: "#6b7280",
  confirmed: "#2563eb",
  assigned: "#7c3aed",
  in_progress: "#d97706",
  completed: "#16a34a",
  cancelled: "#dc2626",
};

// ── Job Priority ─────────────────────────────────────────────────────────────
// Canonical types live in lib/types.ts — re-export for backward compatibility
export type { JobOrderPriority as JobPriority } from "@/lib/types";
import type { JobOrderPriority as JobPriority } from "@/lib/types";

export const JOB_PRIORITY_LABELS: Record<JobPriority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

export const JOB_PRIORITY_COLORS: Record<JobPriority, string> = {
  low: "#6b7280",
  normal: "#2563eb",
  high: "#d97706",
  urgent: "#dc2626",
};

// ── Stop Status ───────────────────────────────────────────────────────────────

export type StopStatus = "pending" | "done" | "skipped";

// ── Job Stop ─────────────────────────────────────────────────────────────────

// Predefined color palette for timeline segments
export const STOP_COLORS = [
  "#1f6f5f", // teal
  "#c96a3d", // burnt orange
  "#375a7f", // slate blue
  "#7d5a50", // brown
  "#4d7c0f", // olive
  "#7c3aed", // violet
  "#2563eb", // blue
  "#b45309", // amber
  "#be185d", // pink
  "#065f46", // emerald
];

export function getStopColor(label: string, index: number): string {
  if (!label) return STOP_COLORS[index % STOP_COLORS.length];
  
  const text = label.toLowerCase();
  
  // 1. Loading/Pickup (Amber/Orange) - Signifies preparation & goods handling
  if (text.includes("load") || text.includes("pickup") || text.includes("รับ") || text.includes("แพ็ค") || text.includes("ขึ้น")) {
    return "#f59e0b"; // amber-500
  }
  
  // 2. Unloading/Delivery (Emerald/Green) - Signifies completion & success
  if (text.includes("unload") || text.includes("deliver") || text.includes("drop") || text.includes("ลง") || text.includes("ส่ง") || text.includes("ปลายทาง")) {
    return "#10b981"; // emerald-500
  }

  // 3. Intransit/Moving (Blue) - Signifies active motion & flow
  if (text.includes("transit") || text.includes("drive") || text.includes("travel") || text.includes("วิ่ง") || text.includes("ขับ") || text.includes("เดินทาง")) {
    return "#3b82f6"; // blue-500
  }

  // 4. Others/Maintenance (Slate/Gray) - Signifies resting, waiting, or neutral operations
  if (text.includes("rest") || text.includes("wait") || text.includes("pm") || text.includes("maintenance") || text.includes("พัก") || text.includes("ซ่อม") || text.includes("รอ")) {
    return "#64748b"; // slate-500
  }

  // Fallback to beautiful sequential palette
  return STOP_COLORS[index % STOP_COLORS.length];
}

export type JobStop = {
  id: string;
  label: string;
  address: string;
  lat?: number;
  lng?: number;
  contactName: string;
  contactPhone: string;
  scheduledTime: string;    // "HH:mm" — เวลาที่จะถึง (ตามลำดับจาก template)
  timeWindowStart: string;  // "HH:mm"
  timeWindowEnd: string;    // "HH:mm"
  dwellHours?: number;
  transitFromPrevHours: number;
  order: number;
  status: StopStatus;
  color: string;            // for timeline segment display
  notes?: string;
};

// ── Job ───────────────────────────────────────────────────────────────────────

export type Job = {
  id: string;
  jobNumber: string;
  status: JobStatus;
  priority: JobPriority;

  // Template link
  routeTemplateId?: string;
  routeName?: string;
  stops: JobStop[];

  // Quick job (no template)
  directLeadTimeHours?: number;

  // Vehicle requirements
  requiredVehicleTypes: string[];
  trailerPlate?: string;

  // Assignment
  assignedVehiclePlate?: string;
  assignedDriverName?: string;
  plannedStart?: number; // absolute hour index from timeline origin

  // Branch
  branch: string;

  // Customer
  customerName: string;
  customerContact: string;
  customerPhone: string;

  // Pricing
  quotedPrice?: number;
  currency?: string;

  // Meta
  createdAt: string;
  updatedAt: string;
  notes?: string;
};

// ── Computed / Display Helpers ────────────────────────────────────────────────

export function getJobTotalHours(job: Job): number {
  if (job.directLeadTimeHours !== undefined) {
    return job.directLeadTimeHours;
  }
  return job.stops.reduce((total, stop) => total + stop.transitFromPrevHours, 0);
}

export function getJobTimeWindow(job: Job): string {
  if (job.stops.length === 0) return "—";
  const allStarts = job.stops.map((s) => s.timeWindowStart);
  const allEnds = job.stops.map((s) => s.timeWindowEnd);
  const earliest = allStarts.reduce((min, v) => (v < min ? v : min), "23:59");
  const latest = allEnds.reduce((max, v) => (v > max ? v : max), "00:00");
  return `${earliest} – ${latest}`;
}

export function getCompletedStopsCount(job: Job): number {
  return job.stops.filter((s) => s.status === "done").length;
}
