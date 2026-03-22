import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type UIEvent
} from "react";
import {
  HOUR_WIDTH,
  HOURS,
  LEFT_COLUMN_WIDTH,
  type DayColumn,
  type DragPayload,
  type JobItem,
  type JobPlacement
} from "@/lib/gantt";
import type { EditingCell } from "@/features/gantt/hooks/useGanttChartState";
import type { Vehicle } from "@/features/gantt/data/mockVehicles";
import { TimelineBoardHeader } from "@/features/gantt/components/TimelineBoardHeader";
import { VehicleTimelineRow } from "@/features/gantt/components/VehicleTimelineRow";

type TimelineBoardProps = {
  vehicles: Vehicle[];
  days: DayColumn[];
  windowStartHour: number;
  displayTotalHours: number;
  jobs: JobItem[];
  placements: JobPlacement[];
  editMode: boolean;
  jumpToken: number;
  jumpAbsoluteHour: number;
  jumpJobId: string | null;
  jumpVehicleId: string | null;
  jumpJobToken: number;
  prependHours: number;
  prependToken: number;
  activeDrag: DragPayload | null;
  hoveredDrop: { vehicleId: string; startIndex: number } | null;
  editingCell: EditingCell | null;
  canDrop: (vehicleId: string, startIndex: number, payload: DragPayload | null) => boolean;
  toDisplayIndex: (absoluteHourIndex: number) => number;
  onRequestExtendLeft: () => void;
  onRequestExtendRight: () => void;
  onPlacedJobPointerStart: (jobId: string) => void;
  onPlacedJobPointerHover: (vehicleId: string, startIndex: number) => void;
  onPlacedJobPointerLeave: () => void;
  onPlacedJobPointerCommit: (vehicleId: string, startIndex: number) => void;
  onPlacedJobPointerCancel: () => void;
  onTimelineSlotDragOver: (vehicleId: string, hourIndex: number, event: DragEvent<HTMLButtonElement>) => void;
  onTimelineDrop: (vehicleId: string, rawStartIndex: number, event: DragEvent<HTMLButtonElement>) => void;
  onSegmentClick: (jobId: string, segmentId: string, durationHours: number) => void;
  onSegmentInputChange: (value: string) => void;
  onSegmentInputBlur: (jobId: string, segmentId: string, value: string) => void;
  onSegmentInputKeyDown: (
    event: KeyboardEvent<HTMLInputElement>,
    jobId: string,
    segmentId: string,
    value: string
  ) => void;
  onGoToPlacedJobInPalette: (jobId: string) => void;
  onResizeToolInstance: (jobId: string, nextDurationHours: number) => boolean;
  hourWidth: number;
  onJobBarClick: (jobId: string) => void;
};

const EDGE_TRIGGER_PX = 360;
const EXTEND_COOLDOWN_MS = 180;

type PointerDragSession = {
  jobId: string;
  grabOffsetHours: number;
};

export function TimelineBoard({
  vehicles,
  days,
  windowStartHour,
  displayTotalHours,
  jobs,
  placements,
  editMode,
  jumpToken,
  jumpAbsoluteHour,
  jumpJobId,
  jumpVehicleId,
  jumpJobToken,
  prependHours,
  prependToken,
  activeDrag,
  hoveredDrop,
  editingCell,
  canDrop,
  toDisplayIndex,
  onRequestExtendLeft,
  onRequestExtendRight,
  onPlacedJobPointerStart,
  onPlacedJobPointerHover,
  onPlacedJobPointerLeave,
  onPlacedJobPointerCommit,
  onPlacedJobPointerCancel,
  onTimelineSlotDragOver,
  onTimelineDrop,
  onSegmentClick,
  onSegmentInputChange,
  onSegmentInputBlur,
  onSegmentInputKeyDown,
  onGoToPlacedJobInPalette,
  onResizeToolInstance,
  hourWidth,
  onJobBarClick
}: TimelineBoardProps) {
  const leftColumnWidth = `clamp(52px, 16vw, ${LEFT_COLUMN_WIDTH}px)`;
  const boardScrollRef = useRef<HTMLDivElement>(null);
  const lastExtendAtRef = useRef(0);
  const prevHourWidthRef = useRef(hourWidth);

  // Maintain scroll center during zoom with easing
  useEffect(() => {
    const board = boardScrollRef.current;
    if (!board || hourWidth === prevHourWidthRef.current) {
      prevHourWidthRef.current = hourWidth;
      return;
    }

    const startWidth = prevHourWidthRef.current;
    const endWidth = hourWidth;
    const scrollLeft = board.scrollLeft;
    const clientWidth = board.clientWidth;
    const centerOffset = scrollLeft + clientWidth / 2;
    const centerDisplayHour = centerOffset / startWidth;

    const nextLeft = centerDisplayHour * endWidth - clientWidth / 2;
    
    board.scrollLeft = nextLeft;
    prevHourWidthRef.current = hourWidth;
  }, [hourWidth]);
  const [pointerDragSession, setPointerDragSession] = useState<PointerDragSession | null>(null);
  const pointerPreviewFrameRef = useRef<number | null>(null);
  const queuedPointerTargetRef = useRef<{ vehicleId: string; startIndex: number } | null>(null);
  const lastAppliedPointerTargetKeyRef = useRef<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  useEffect(() => {
    if (jumpToken === 0) {
      return;
    }

    const board = boardScrollRef.current;
    if (!board) {
      return;
    }

    const targetDisplayHour = jumpAbsoluteHour - windowStartHour;
    const targetLeft = targetDisplayHour * hourWidth;
    const centeredLeft = Math.max(0, targetLeft - board.clientWidth / 2 + (HOURS.length * hourWidth) / 2);
    board.scrollTo({ left: centeredLeft, behavior: "smooth" });
  }, [jumpAbsoluteHour, jumpToken, windowStartHour]); // Removed hourWidth from deps

  useEffect(() => {
    if (jumpJobToken === 0 || !jumpJobId) {
      return;
    }

    const board = boardScrollRef.current;
    if (!board) {
      return;
    }

    if (jumpVehicleId) {
      const vehicleCell = board.querySelector<HTMLElement>(`[data-vehicle-id="${jumpVehicleId}"]`);
      if (vehicleCell) {
        vehicleCell.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      }
    }

    // Start with horizontal positioning by absolute hour, then retry until the job bar exists in DOM.
    const targetDisplayHour = jumpAbsoluteHour - windowStartHour;
    const targetLeft = targetDisplayHour * hourWidth;
    const centeredLeft = Math.max(0, targetLeft - board.clientWidth / 2 + (HOURS.length * hourWidth) / 2);
    board.scrollTo({ left: centeredLeft, behavior: "smooth" });

    let attempts = 0;
    const maxAttempts = 40;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const tryScrollToJob = () => {
      const target = board.querySelector<HTMLElement>(`[data-job-id="${jumpJobId}"]`);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
        return;
      }

      attempts += 1;
      if (attempts >= maxAttempts) {
        return;
      }

      timeoutId = setTimeout(tryScrollToJob, 50);
    };

    timeoutId = setTimeout(tryScrollToJob, 0);

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [jumpAbsoluteHour, jumpJobId, jumpJobToken, jumpVehicleId, windowStartHour]);

  useEffect(() => {
    if (prependToken === 0 || prependHours <= 0) {
      return;
    }

    const board = boardScrollRef.current;
    if (!board) {
      return;
    }

    board.scrollLeft += prependHours * hourWidth;
  }, [prependHours, prependToken]);

  const canExtendNow = () => {
    const now = Date.now();
    if (now - lastExtendAtRef.current < EXTEND_COOLDOWN_MS) {
      return false;
    }

    lastExtendAtRef.current = now;
    return true;
  };

  const handleBoardScroll = (event: UIEvent<HTMLDivElement>) => {
    const target = event.currentTarget;
    const distanceToRight = target.scrollWidth - target.clientWidth - target.scrollLeft;

    if (target.scrollLeft < EDGE_TRIGGER_PX && canExtendNow()) {
      onRequestExtendLeft();
      return;
    }

    if (distanceToRight < EDGE_TRIGGER_PX && canExtendNow()) {
      onRequestExtendRight();
    }
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    // Only left click for mouse, or any touch
    if (event.button !== 0 && event.pointerType === "mouse") {
      return;
    }

    const target = event.target as HTMLElement;
    const isSlot = target.closest(".slot-cell") || target.closest(".hour-cell") || target.closest(".day-cell");
    const isInteractive =
      target.closest("button:not(.slot-cell)") ||
      target.closest("input") ||
      target.closest("select") ||
      target.closest(".palette-card");

    if (target.closest("[data-job-id]") || (isInteractive && !isSlot)) {
      return;
    }

    const board = boardScrollRef.current;
    if (!board) {
      return;
    }

    setIsPanning(true);
    panStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      scrollLeft: board.scrollLeft,
      scrollTop: board.scrollTop
    };

    board.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isPanning) {
      return;
    }

    const board = boardScrollRef.current;
    if (!board) {
      return;
    }

    const dx = event.clientX - panStartRef.current.x;
    const dy = event.clientY - panStartRef.current.y;

    board.scrollLeft = panStartRef.current.scrollLeft - dx;
    board.scrollTop = panStartRef.current.scrollTop - dy;
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isPanning) {
      return;
    }
    setIsPanning(false);
    const board = boardScrollRef.current;
    if (board) {
      board.releasePointerCapture(event.pointerId);
    }
  };

  const getPointerDropTarget = useCallback((clientX: number, clientY: number, grabOffsetHours: number) => {
    const element = document.elementFromPoint(clientX, clientY);
    const slot = element?.closest<HTMLElement>("[data-slot-vehicle-id][data-slot-hour-index]");
    const vehicleId = slot?.dataset.slotVehicleId;
    const rawDisplayHour = slot?.dataset.slotHourIndex;

    if (!vehicleId || rawDisplayHour === undefined) {
      return null;
    }

    const displayHourIndex = Number.parseInt(rawDisplayHour, 10);
    if (!Number.isFinite(displayHourIndex)) {
      return null;
    }

    return {
      vehicleId,
      startIndex: windowStartHour + displayHourIndex - grabOffsetHours
    };
  }, [windowStartHour]);

  const applyPointerTarget = useCallback((target: { vehicleId: string; startIndex: number } | null) => {
    const nextKey = target ? `${target.vehicleId}:${target.startIndex}` : null;
    if (lastAppliedPointerTargetKeyRef.current === nextKey) {
      return;
    }

    lastAppliedPointerTargetKeyRef.current = nextKey;

    if (target) {
      onPlacedJobPointerHover(target.vehicleId, target.startIndex);
      return;
    }

    onPlacedJobPointerLeave();
  }, [onPlacedJobPointerHover, onPlacedJobPointerLeave]);

  const queuePointerTarget = useCallback((target: { vehicleId: string; startIndex: number } | null) => {
    queuedPointerTargetRef.current = target;

    if (pointerPreviewFrameRef.current !== null) {
      return;
    }

    pointerPreviewFrameRef.current = window.requestAnimationFrame(() => {
      pointerPreviewFrameRef.current = null;
      applyPointerTarget(queuedPointerTargetRef.current);
    });
  }, [applyPointerTarget]);

  const handlePlacedJobPointerDown = (jobId: string, event: ReactPointerEvent<HTMLDivElement>) => {
    if (editMode || event.button !== 0) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const totalHours = Math.max(1, Math.round(rect.width / hourWidth));
    const rawGrabOffset = Math.floor((event.clientX - rect.left) / hourWidth);
    const grabOffsetHours = Math.max(0, Math.min(totalHours - 1, rawGrabOffset));

    event.preventDefault();
    lastAppliedPointerTargetKeyRef.current = null;
    setPointerDragSession({ jobId, grabOffsetHours });
    onPlacedJobPointerStart(jobId);

    const initialTarget = getPointerDropTarget(event.clientX, event.clientY, grabOffsetHours);
    applyPointerTarget(initialTarget);
  };

  useEffect(() => {
    if (!pointerDragSession) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const target = getPointerDropTarget(event.clientX, event.clientY, pointerDragSession.grabOffsetHours);
      queuePointerTarget(target);
    };

    const finishPointerDrag = (event: PointerEvent) => {
      if (pointerPreviewFrameRef.current !== null) {
        window.cancelAnimationFrame(pointerPreviewFrameRef.current);
        pointerPreviewFrameRef.current = null;
      }

      const target = getPointerDropTarget(event.clientX, event.clientY, pointerDragSession.grabOffsetHours);

      if (target) {
        onPlacedJobPointerCommit(target.vehicleId, target.startIndex);
      } else {
        onPlacedJobPointerCancel();
      }

      queuedPointerTargetRef.current = null;
      lastAppliedPointerTargetKeyRef.current = null;
      setPointerDragSession(null);
    };

    document.body.style.userSelect = "none";
    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", finishPointerDrag);
    document.addEventListener("pointercancel", finishPointerDrag);

    return () => {
      document.body.style.userSelect = "";
      if (pointerPreviewFrameRef.current !== null) {
        window.cancelAnimationFrame(pointerPreviewFrameRef.current);
        pointerPreviewFrameRef.current = null;
      }
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", finishPointerDrag);
      document.removeEventListener("pointercancel", finishPointerDrag);
    };
  }, [
    onPlacedJobPointerCancel,
    onPlacedJobPointerCommit,
    applyPointerTarget,
    pointerDragSession,
    getPointerDropTarget,
    queuePointerTarget
  ]);

  return (
    <div
      className={`board-scroll${isPanning ? " is-panning" : ""}`}
      ref={boardScrollRef}
      onScroll={handleBoardScroll}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <div className="board-grid" style={{ gridTemplateColumns: `${leftColumnWidth} ${displayTotalHours * hourWidth}px` }}>
        <TimelineBoardHeader
          days={days}
          displayTotalHours={displayTotalHours}
          windowStartHour={windowStartHour}
          hourWidth={hourWidth}
        />

        {vehicles.map((vehicle) => (
          <VehicleTimelineRow
            key={vehicle.licensePlate}
            vehicle={vehicle}
            displayTotalHours={displayTotalHours}
            editMode={editMode}
            jobs={jobs}
            placements={placements}
            activeDrag={activeDrag}
            hoveredDrop={hoveredDrop}
            editingCell={editingCell}
            canDrop={canDrop}
            toDisplayIndex={toDisplayIndex}
            onTimelineSlotDragOver={onTimelineSlotDragOver}
            onTimelineDrop={onTimelineDrop}
            onPlacedJobPointerDown={handlePlacedJobPointerDown}
            onSegmentClick={onSegmentClick}
            onSegmentInputChange={onSegmentInputChange}
            onSegmentInputBlur={onSegmentInputBlur}
            onSegmentInputKeyDown={onSegmentInputKeyDown}
            onGoToPlacedJobInPalette={onGoToPlacedJobInPalette}
            onResizeToolInstance={onResizeToolInstance}
            jumpJobId={jumpJobId}
            hourWidth={hourWidth}
            onJobBarClick={onJobBarClick}
          />
        ))}
      </div>
    </div>
  );
}
