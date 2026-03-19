import { useEffect, useRef, type DragEvent } from "react";
import type { DragPayload, JobItem } from "@/lib/gantt";
import type { PaletteView } from "@/features/gantt/hooks/useGanttChartState";
import { PaletteJobCard } from "@/features/gantt/components/PaletteJobCard";

type JobPaletteProps = {
  editMode: boolean;
  paletteActive: boolean;
  paletteView: PaletteView;
  paletteFocusJobId: string | null;
  paletteFocusToken: number;
  paletteJobs: JobItem[];
  assignedJobs: Array<{ job: JobItem; atLabel: string }>;
  activeDrag: DragPayload | null;
  editingJobId: string | null;
  editingPlacementJobId: string | null;
  editingPlannedStartJobId: string | null;
  timelineOrigin: Date;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onPaletteViewChange: (nextView: PaletteView) => void;
  onPaletteDragOver: (event: DragEvent<HTMLElement>) => void;
  onPaletteDragLeave: () => void;
  onPaletteDrop: (event: DragEvent<HTMLDivElement>) => void;
  onJobDragStart: (jobId: string, event: DragEvent<HTMLElement>) => void;
  onDragEnd: () => void;
  onNavigateToJobPlacement: (jobId: string) => void;
  onUnplaceJob: (jobId: string) => void;
  onEditJob: (updatedJob: JobItem) => void;
  onStartEditJob: (jobId: string) => void;
  onCancelEditJob: () => void;
  onStartEditPlacement: (jobId: string) => void;
  onUpdatePlacement: (jobId: string, newStartIndex: number) => void;
  onCancelEditPlacement: () => void;
  onStartEditPlannedStart: (jobId: string) => void;
  onSavePlannedStart: (jobId: string, plannedStart: number) => void;
  onCancelEditPlannedStart: () => void;
};

export function JobPalette({
  editMode,
  paletteActive,
  paletteView,
  paletteFocusJobId,
  paletteFocusToken,
  paletteJobs,
  assignedJobs,
  activeDrag,
  editingJobId,
  editingPlacementJobId,
  editingPlannedStartJobId,
  timelineOrigin,
  sidebarOpen,
  onToggleSidebar,
  onPaletteViewChange,
  onPaletteDragOver,
  onPaletteDragLeave,
  onPaletteDrop,
  onJobDragStart,
  onDragEnd,
  onNavigateToJobPlacement,
  onUnplaceJob,
  onEditJob,
  onStartEditJob,
  onCancelEditJob,
  onStartEditPlacement,
  onUpdatePlacement,
  onCancelEditPlacement,
  onStartEditPlannedStart,
  onSavePlannedStart,
  onCancelEditPlannedStart
}: JobPaletteProps) {
  const showingAssigned = paletteView === "assigned";
  const assignedCardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const handleShowUnassigned = () => onPaletteViewChange("unassigned");
  const handleShowAssigned = () => onPaletteViewChange("assigned");
  const visibleCount = showingAssigned ? assignedJobs.length : paletteJobs.length;

  useEffect(() => {
    if (!showingAssigned || !paletteFocusJobId || paletteFocusToken === 0) {
      return;
    }

    const targetCard = assignedCardRefs.current[paletteFocusJobId];
    if (!targetCard) {
      return;
    }

    targetCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [paletteFocusJobId, paletteFocusToken, showingAssigned]);

  return (
    <aside
      className={`job-palette${!showingAssigned && paletteActive ? " drop-ready" : ""}${editMode ? " disabled" : ""}`}
      onDragOver={onPaletteDragOver}
      onDragLeave={onPaletteDragLeave}
      onDrop={onPaletteDrop}
    >
      <header className="palette-header">
        <button
          type="button"
          onClick={onToggleSidebar}
          title={sidebarOpen ? "Hide palette [ ]" : "Show palette [ ]"}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            border: "1px solid var(--line)",
            borderRadius: "var(--radius)",
            background: "var(--surface)",
            color: "var(--text-muted)",
            cursor: "pointer",
            fontSize: "0.8rem",
            fontWeight: 700,
            flexShrink: 0
          }}
        >
          {sidebarOpen ? "≡" : "☰"}
        </button>

        <div className="palette-stat" aria-label={`${visibleCount} jobs in the current list`}>
          <strong>{visibleCount}</strong>
          <span>jobs</span>
        </div>
      </header>

      <div className="palette-header-minimal">
        <div className="palette-tabs">
          <button
            type="button"
            className={`palette-tab${showingAssigned ? "" : " active"}`}
            onClick={handleShowUnassigned}
          >
            Not Placed
          </button>
          <button
            type="button"
            className={`palette-tab${showingAssigned ? " active" : ""}`}
            onClick={handleShowAssigned}
          >
            Placed
          </button>
        </div>
      </div>

      <div className="palette-list">
        {!showingAssigned && paletteJobs.length === 0 ? (
          <div className="empty-palette">No jobs left in the pool. Drag a bar back from the timeline to unassign it.</div>
        ) : null}
        {showingAssigned && assignedJobs.length === 0 ? (
          <div className="empty-palette">No jobs have been placed on the timeline yet.</div>
        ) : (
          <>
            {!showingAssigned
              ? paletteJobs.map((job) => (
                  <PaletteJobCard
                    key={job.id}
                    job={job}
                    editMode={editMode}
                    isEditing={editingJobId === job.id}
                    isEditingPlannedStart={editingPlannedStartJobId === job.id}
                    timelineOrigin={timelineOrigin}
                    draggable
                    isDragging={activeDrag?.jobId === job.id}
                    onJobDragStart={onJobDragStart}
                    onDragEnd={onDragEnd}
                    onStartEdit={onStartEditJob}
                    onSaveEdit={onEditJob}
                    onCancelEdit={onCancelEditJob}
                    onStartEditPlannedStart={onStartEditPlannedStart}
                    onSavePlannedStart={onSavePlannedStart}
                    onCancelEditPlannedStart={onCancelEditPlannedStart}
                  />
                ))
              : assignedJobs.map((item) => (
                  <PaletteJobCard
                    key={item.job.id}
                    job={item.job}
                    atLabel={item.atLabel}
                    editMode={editMode}
                    isEditing={editingJobId === item.job.id}
                    isEditingPlacement={editingPlacementJobId === item.job.id}
                    isEditingPlannedStart={editingPlannedStartJobId === item.job.id}
                    timelineOrigin={timelineOrigin}
                    draggable={false}
                    clickable
                    highlighted={paletteFocusJobId === item.job.id}
                    cardRef={(node) => {
                      assignedCardRefs.current[item.job.id] = node;
                    }}
                    isDragging={false}
                    onNavigate={onNavigateToJobPlacement}
                    onUnplace={onUnplaceJob}
                    onStartEdit={onStartEditJob}
                    onSaveEdit={onEditJob}
                    onCancelEdit={onCancelEditJob}
                    onStartEditPlacement={onStartEditPlacement}
                    onUpdatePlacement={onUpdatePlacement}
                    onCancelEditPlacement={onCancelEditPlacement}
                    onStartEditPlannedStart={onStartEditPlannedStart}
                    onSavePlannedStart={onSavePlannedStart}
                    onCancelEditPlannedStart={onCancelEditPlannedStart}
                  />
                ))}
          </>
        )}
      </div>
    </aside>
  );
}
