"use client";

import type { SaveIndicatorState } from "@/features/gantt/hooks/useJobs";

type SaveStatusIndicatorProps = {
  state: SaveIndicatorState;
};

export function SaveStatusIndicator({ state }: SaveStatusIndicatorProps) {
  const liveMode = state.kind === "error" ? "assertive" : "polite";

  return (
    <div
      className={`save-status-inline ${state.kind}`}
      role="status"
      aria-live={liveMode}
      aria-atomic="true"
      title={state.message}
    >
      <div className="save-status-dots" aria-hidden="true">
        <span className={`save-status-dot yellow${state.kind === "saving" ? " active" : ""}`} />
        <span className={`save-status-dot green${state.kind === "success" ? " active" : ""}`} />
        <span className={`save-status-dot red${state.kind === "error" ? " active" : ""}`} />
      </div>
      <span className="save-status-time">{state.timeLabel}</span>
      <span className="save-status-sr">{state.message}</span>
    </div>
  );
}
