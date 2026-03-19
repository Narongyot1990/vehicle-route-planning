import type {
  FocusEvent,
  KeyboardEvent,
  MouseEvent,
  PointerEvent as ReactPointerEvent
} from "react";
import { BAR_HEIGHT, getDurationHours, HOUR_WIDTH, type DragPayload, type JobItem, type JobPlacement } from "@/lib/gantt";
import type { EditingCell } from "@/features/gantt/hooks/useGanttChartState";

type PlacedJobBarProps = {
  job: JobItem;
  placement: JobPlacement;
  editMode: boolean;
  activeDrag: DragPayload | null;
  editingCell: EditingCell | null;
  isJumpTarget: boolean;
  toDisplayIndex: (absoluteHourIndex: number) => number;
  onPlacedJobPointerDown: (jobId: string, event: ReactPointerEvent<HTMLDivElement>) => void;
  onGoToPlacedJobInPalette: (jobId: string) => void;
  onSegmentClick: (jobId: string, segmentId: string, durationHours: number) => void;
  onSegmentInputChange: (value: string) => void;
  onSegmentInputBlur: (jobId: string, segmentId: string, value: string) => void;
  onSegmentInputKeyDown: (
    event: KeyboardEvent<HTMLInputElement>,
    jobId: string,
    segmentId: string,
    value: string
  ) => void;
  hourWidth: number;
  jumpJobId: string | null;
};

export function PlacedJobBar({
  job,
  placement,
  editMode,
  activeDrag,
  editingCell,
  isJumpTarget,
  toDisplayIndex,
  onPlacedJobPointerDown,
  onGoToPlacedJobInPalette,
  onSegmentClick,
  onSegmentInputChange,
  onSegmentInputBlur,
  onSegmentInputKeyDown,
  hourWidth,
  jumpJobId
}: PlacedJobBarProps) {
  const durationHours = getDurationHours(job);
  const isDragging = activeDrag?.jobId === job.id;
  const goToLabel = "Go to list";

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.stopPropagation();
    onPlacedJobPointerDown(job.id, event);
  };

  const handleGoToPlacedList = () => {
    onGoToPlacedJobInPalette(job.id);
  };

  const handleGoToPlacedListMouseDown = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleGoToPlacedListPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleGoToPlacedListClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    handleGoToPlacedList();
  };

  return (
    <div
      className={`job-stack${isDragging ? " is-dragging" : ""}${editMode ? " edit-mode" : ""}${isJumpTarget ? " jump-target" : ""}`}
      data-job-id={job.id}
      style={{
        left: toDisplayIndex(placement.startIndex) * hourWidth,
        width: durationHours * hourWidth,
        height: BAR_HEIGHT
      }}
      title={`${job.title} (${durationHours}h)`}
      onPointerDown={handlePointerDown}
    >
      <button
        type="button"
        className="job-go-to-list"
        aria-label={goToLabel}
        title={goToLabel}
        onMouseDown={handleGoToPlacedListMouseDown}
        onPointerDown={handleGoToPlacedListPointerDown}
        onClick={handleGoToPlacedListClick}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8l4 4-4 4" />
          <path d="M8 12h8" />
        </svg>
      </button>
      <div className="job-stack-content">
        <div className="job-stack-header">
          <span>{job.title}</span>
        </div>
        <div className="job-bar single">
          <div className="job-bar-segments">
            {job.segments.map((segment) => {
              const isEditing =
                editingCell?.jobId === job.id && editingCell.segmentId === segment.id;
              const segmentStyle = {
                width: `${(segment.durationHours / durationHours) * 100}%`,
                background: segment.color
              };

              if (!editMode) {
                return (
                  <div key={segment.id} className="job-segment" style={segmentStyle}>
                    <span>{segment.label}</span>
                  </div>
                );
              }

              const handleSegmentButtonClick = () => {
                onSegmentClick(job.id, segment.id, segment.durationHours);
              };

              const handleSegmentInputBlur = (event: FocusEvent<HTMLInputElement>) => {
                onSegmentInputBlur(job.id, segment.id, event.currentTarget.value);
              };

              const handleSegmentInputKeyDownInternal = (event: KeyboardEvent<HTMLInputElement>) => {
                onSegmentInputKeyDown(event, job.id, segment.id, event.currentTarget.value);
              };

              return (
                <button
                  key={segment.id}
                  type="button"
                  className={`job-segment editable${isEditing ? " editing" : ""}`}
                  style={segmentStyle}
                  onClick={handleSegmentButtonClick}
                >
                  {isEditing ? (
                    <input
                      autoFocus
                      inputMode="decimal"
                      className="segment-hours-input"
                      value={editingCell.value}
                      onChange={(event) => onSegmentInputChange(event.target.value)}
                      onBlur={handleSegmentInputBlur}
                      onKeyDown={handleSegmentInputKeyDownInternal}
                    />
                  ) : (
                    <>
                      <span>{segment.label}</span>
                      <strong>{segment.durationHours}h</strong>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
