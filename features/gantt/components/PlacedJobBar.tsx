import type {
  FocusEvent,
  KeyboardEvent,
  MouseEvent,
  PointerEventHandler,
  PointerEvent as ReactPointerEvent
} from "react";
import { useEffect, useRef } from "react";
import { BAR_HEIGHT, getDurationHours, HOUR_WIDTH, type DragPayload, type JobItem, type JobPlacement } from "@/lib/gantt";
import type { EditingCell } from "@/features/gantt/hooks/useGanttChartState";
import { getSegmentIcon, getSemanticSegmentColor } from "./GanttIcons";

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
  onResizeToolInstance: (jobId: string, nextDurationHours: number) => boolean;
  onJobBarClick: (jobId: string) => void;
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
  jumpJobId,
  onResizeToolInstance,
  onJobBarClick
}: PlacedJobBarProps) {
  const durationHours = getDurationHours(job);
  const isDragging = activeDrag?.jobId === job.id;
  const goToLabel = "Go to list";
  const pointerDownTimeRef = useRef(0);
  const resizeSessionRef = useRef<{
    pointerId: number;
    startClientX: number;
    startDurationHours: number;
  } | null>(null);
  const resizeHandleRef = useRef<HTMLButtonElement | null>(null);
  const isToolResizeEnabled = !editMode && job.origin === "tool" && job.segments.length === 1;

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    pointerDownTimeRef.current = Date.now();
    event.stopPropagation();
    onPlacedJobPointerDown(job.id, event);
  };

  const handleClick = () => {
    // Only treat as a click if pointer-down was recent (i.e., not a drag)
    if (Date.now() - pointerDownTimeRef.current < 300) {
      if (job.origin === "tool") {
        onGoToPlacedJobInPalette(job.id);
        return;
      }

      onJobBarClick(job.id);
    }
  };

  useEffect(() => {
    const handlePointerMove = (event: globalThis.PointerEvent) => {
      const session = resizeSessionRef.current;
      if (!session || event.pointerId !== session.pointerId) {
        return;
      }

      const deltaHours = (event.clientX - session.startClientX) / hourWidth;
      const nextDurationHours = Math.max(1, Math.round(session.startDurationHours + deltaHours));
      onResizeToolInstance(job.id, nextDurationHours);
    };

    const finishResize = (event: globalThis.PointerEvent) => {
      const session = resizeSessionRef.current;
      if (!session || event.pointerId !== session.pointerId) {
        return;
      }

      resizeSessionRef.current = null;
      const handle = resizeHandleRef.current;
      if (handle?.hasPointerCapture(event.pointerId)) {
        handle.releasePointerCapture(event.pointerId);
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", finishResize);
    window.addEventListener("pointercancel", finishResize);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", finishResize);
      window.removeEventListener("pointercancel", finishResize);
    };
  }, [hourWidth, job.id, onResizeToolInstance]);

  const handleResizePointerDown: PointerEventHandler<HTMLButtonElement> = (event) => {
    if (!isToolResizeEnabled) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    pointerDownTimeRef.current = 0;
    resizeSessionRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startDurationHours: durationHours
    };
    event.currentTarget.setPointerCapture(event.pointerId);
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
        height: BAR_HEIGHT,
        cursor: "pointer"
      }}
      title={`${job.title} (${durationHours}h)`}
      onPointerDown={handlePointerDown}
      onClick={handleClick}
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
      {isToolResizeEnabled ? (
        <button
          ref={resizeHandleRef}
          type="button"
          className="job-resize-handle"
          aria-label={`Resize ${job.title}`}
          title="Drag to resize"
          onPointerDown={handleResizePointerDown}
        >
          <span />
        </button>
      ) : null}
      <div className="job-stack-content">
        <div className="job-stack-header">
          <span>{job.title}</span>
        </div>
        <div className="job-bar single">
          <div className="job-bar-segments">
            {job.segments.map((segment) => {
              const markerType = segment.segmentType ?? "waypoint";
              const isEditing =
                editingCell?.jobId === job.id && editingCell.segmentId === segment.id;
              const segmentStyle = {
                flex: segment.durationHours,
                background: getSemanticSegmentColor(markerType),
              };

              if (!editMode) {
                return (
                  <div key={segment.id} className="job-segment" style={segmentStyle} title={`${segment.label} • ${segment.durationHours}h`}>
                    <span style={{ color: "#fff", fontSize: "1.05rem", lineHeight: 1, display: "inline-flex", marginRight: "4px" }} aria-hidden="true">
                      {getSegmentIcon(markerType)}
                    </span>
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
