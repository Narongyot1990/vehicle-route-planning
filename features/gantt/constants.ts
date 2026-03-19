import type { JobItem } from "@/lib/gantt";

export const INITIAL_JOBS: JobItem[] = [
  {
    id: "job-001",
    origin: "pool",
    title: "Short inspection",
    note: "2-hour short task",
    segments: [
      { id: "inspect", label: "Inspect", durationHours: 1, color: "#1f6f5f" },
      { id: "handoff", label: "Handoff", durationHours: 1, color: "#78b8ab" }
    ]
  },
  {
    id: "job-002",
    origin: "pool",
    title: "Delivery route",
    note: "8-hour continuous task",
    segments: [
      { id: "load", label: "Load", durationHours: 2, color: "#c96a3d" },
      { id: "drive", label: "Drive", durationHours: 4, color: "#eea777" },
      { id: "return", label: "Return", durationHours: 2, color: "#f2c5a2" }
    ]
  },
  {
    id: "job-003",
    origin: "pool",
    title: "Multi segment job",
    note: "11-hour segmented example",
    segments: [
      { id: "set-1", label: "Set 1", durationHours: 3, color: "#375a7f" },
      { id: "set-2", label: "Set 2", durationHours: 2, color: "#5f87b2" },
      { id: "set-3", label: "Set 3", durationHours: 4, color: "#8fb3d9" },
      { id: "set-4", label: "Set 4", durationHours: 2, color: "#bfd6eb" }
    ]
  },
  {
    id: "job-004",
    origin: "pool",
    title: "Airport pickup",
    note: "5-hour example",
    segments: [
      { id: "pickup", label: "Pickup", durationHours: 1, color: "#7d5a50" },
      { id: "trip", label: "Trip", durationHours: 3, color: "#b4846c" },
      { id: "close", label: "Close", durationHours: 1, color: "#d9b08c" }
    ]
  }
];

export const TOOLBOX_TEMPLATES: JobItem[] = [
  {
    id: "tool-pm",
    origin: "tool",
    title: "PM",
    note: "Preventive maintenance block",
    segments: [
      { id: "pm", label: "PM", durationHours: 4, color: "#4d7c0f" }
    ]
  },
  {
    id: "tool-no-driver",
    origin: "tool",
    title: "No driver",
    note: "Vehicle unavailable due to driver gap",
    segments: [
      { id: "no-driver", label: "No driver", durationHours: 8, color: "#9a3412" }
    ]
  },
  {
    id: "tool-no-job",
    origin: "tool",
    title: "No job",
    note: "Idle vehicle placeholder",
    segments: [
      { id: "no-job", label: "No job", durationHours: 6, color: "#475569" }
    ]
  }
];
