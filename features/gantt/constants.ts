import type { JobItem } from "@/lib/gantt";

// INITIAL_JOBS removed — jobs now come from DB via /api/joborders

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
