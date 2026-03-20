import { useState, useEffect, useRef, type DragEvent, type KeyboardEvent, type MouseEvent, type Ref, type PointerEvent as ReactPointerEvent } from "react";
import { getDurationHours, type JobItem } from "@/lib/gantt";

type PaletteJobCardProps = {
  job: JobItem;
  atLabel?: string;
  editMode: boolean;
  isEditing: boolean;
  isEditingPlacement?: boolean;
  isEditingPlannedStart?: boolean;
  timelineOrigin?: Date;
  draggable: boolean;
  clickable?: boolean;
  highlighted?: boolean;
  cardRef?: Ref<HTMLDivElement>;
  isDragging: boolean;
  onJobDragStart?: (jobId: string, event: DragEvent<HTMLElement>) => void;
  onDragEnd?: () => void;
  onNavigate?: (jobId: string) => void;
  onUnplace?: (jobId: string) => void;
  onStartEdit?: (jobId: string) => void;
  onSaveEdit?: (updatedJob: JobItem) => void;
  onCancelEdit?: () => void;
  onStartEditPlacement?: (jobId: string) => void;
  onUpdatePlacement?: (jobId: string, newStartIndex: number) => void;
  onCancelEditPlacement?: () => void;
  onStartEditPlannedStart?: (jobId: string) => void;
  onSavePlannedStart?: (jobId: string, plannedStart: number) => void;
  onCancelEditPlannedStart?: () => void;
  // Pointer drag handlers for mobile support
  onPointerDragStart?: (jobId: string, event: ReactPointerEvent<HTMLElement>) => void;
  onPointerDragMove?: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerDragEnd?: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerDragCancel?: (event: ReactPointerEvent<HTMLElement>) => void;
};

const LONG_PRESS_DURATION = 300; // ms

export function PaletteJobCard({
  job,
  atLabel,
  editMode,
  isEditing,
  isEditingPlacement = false,
  isEditingPlannedStart = false,
  timelineOrigin,
  draggable,
  clickable = false,
  highlighted = false,
  cardRef,
  isDragging,
  onJobDragStart,
  onDragEnd,
  onNavigate,
  onUnplace,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onStartEditPlacement,
  onUpdatePlacement,
  onCancelEditPlacement,
  onStartEditPlannedStart,
  onSavePlannedStart,
  onCancelEditPlannedStart,
  onPointerDragStart,
  onPointerDragMove,
  onPointerDragEnd,
  onPointerDragCancel
}: PaletteJobCardProps) {
  const [draft, setDraft] = useState<JobItem>(job);
  const [isPointerDragging, setIsPointerDragging] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!isEditing) {
      setDraft(job);
    }
  }, [job, isEditing]);

  // Placement editing state
  const [placementDate, setPlacementDate] = useState("");
  const [placementHour, setPlacementHour] = useState(0);

  // Planned start editing state
  const [plannedDate, setPlannedDate] = useState("");
  const [plannedHour, setPlannedHour] = useState(0);

  // Cleanup long press timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  // Init placement form
  useEffect(() => {
    if (isEditingPlacement && timelineOrigin) {
      const target = new Date(timelineOrigin);
      target.setHours(target.getHours() + (parsePlacementStartIndex(atLabel) ?? 0));
      const yyyy = target.getFullYear();
      const mm = String(target.getMonth() + 1).padStart(2, "0");
      const dd = String(target.getDate()).padStart(2, "0");
      setPlacementDate(`${yyyy}-${mm}-${dd}`);
      setPlacementHour(target.getHours());
    }
  }, [isEditingPlacement, atLabel, timelineOrigin]);

  // Init planned start form
  useEffect(() => {
    if (isEditingPlannedStart && timelineOrigin) {
      const target = new Date(timelineOrigin);
      if (job.plannedStart != null) {
        target.setHours(target.getHours() + job.plannedStart);
      }
      const yyyy = target.getFullYear();
      const mm = String(target.getMonth() + 1).padStart(2, "0");
      const dd = String(target.getDate()).padStart(2, "0");
      setPlannedDate(`${yyyy}-${mm}-${dd}`);
      setPlannedHour(target.getHours());
    }
  }, [isEditingPlannedStart, job.plannedStart, timelineOrigin]);

  // ── Pointer Event Handlers (Mobile DnD) ──────────────────────────────────
  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    // Only handle primary button or touch
    if (event.button !== 0 && event.pointerType === "mouse") {
      return;
    }

    if (!draggable || editMode || isEditing || isEditingPlacement || isEditingPlannedStart) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    startPosRef.current = { x: event.clientX, y: event.clientY };

    // Start long press timer
    longPressTimerRef.current = setTimeout(() => {
      setIsPointerDragging(true);
      onPointerDragStart?.(job.id, event);
    }, LONG_PRESS_DURATION);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isPointerDragging) {
      // Cancel long press if pointer moved too much
      if (startPosRef.current) {
        const dx = event.clientX - startPosRef.current.x;
        const dy = event.clientY - startPosRef.current.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance > 10 && longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
          startPosRef.current = null;
        }
      }
      return;
    }

    onPointerDragMove?.(event);
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.releasePointerCapture(event.pointerId);

    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (isPointerDragging) {
      setIsPointerDragging(false);
      onPointerDragEnd?.(event);
    }

    startPosRef.current = null;
  };

  const handlePointerCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (isPointerDragging) {
      setIsPointerDragging(false);
      onPointerDragCancel?.(event);
    }

    startPosRef.current = null;
  };

  // ── HTML5 DnD Handlers (Desktop) ──────────────────────────────────────────
  const handleDragStart = (event: DragEvent<HTMLElement>) => {
    if (!onJobDragStart) return;
    onJobDragStart(job.id, event);
  };

  const handleDragEnd = () => onDragEnd?.();

  const handleNavigate = () => onNavigate?.(job.id);

  const handleCardClick = () => {
    if (!clickable || isEditing || isEditingPlacement || isEditingPlannedStart) return;
    handleNavigate();
  };

  const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!clickable || isEditing || isEditingPlacement || isEditingPlannedStart) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleNavigate();
    }
  };

  const handleUnplaceClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onUnplace?.(job.id);
  };

  const handleEditClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setDraft(job);
    onStartEdit?.(job.id);
  };

  const handleCancelEdit = () => {
    setDraft(job);
    onCancelEdit?.();
  };

  const handleSaveEdit = () => {
    onSaveEdit?.(draft);
  };

  const handleDraftTitleChange = (value: string) => {
    setDraft((prev) => ({ ...prev, title: value }));
  };

  const handleSegmentLabelChange = (segmentId: string, label: string) => {
    setDraft((prev) => ({
      ...prev,
      segments: prev.segments.map((s) => (s.id === segmentId ? { ...s, label } : s))
    }));
  };

  const handleSegmentHoursChange = (segmentId: string, hours: string) => {
    const num = parseFloat(hours);
    setDraft((prev) => ({
      ...prev,
      segments: prev.segments.map((s) =>
        s.id === segmentId ? { ...s, durationHours: isFinite(num) && num > 0 ? num : s.durationHours } : s
      )
    }));
  };

  const handleAddSegment = () => {
    const newId = `${job.id}-seg-${Date.now()}`;
    setDraft((prev) => ({
      ...prev,
      segments: [
        ...prev.segments,
        { id: newId, label: "New Stop", durationHours: 1, color: "#94a3b8" }
      ]
    }));
  };

  const handleRemoveSegment = (segmentId: string) => {
    setDraft((prev) => ({
      ...prev,
      segments: prev.segments.filter((s) => s.id !== segmentId)
    }));
  };

  const handlePlacementAtClick = (event: MouseEvent) => {
    event.stopPropagation();
    onStartEditPlacement?.(job.id);
  };

  const handleSavePlacement = () => {
    if (!timelineOrigin || !placementDate) return;
    const [yyyy, mm, dd] = placementDate.split("-").map(Number);
    const newStart = new Date(yyyy, mm - 1, dd, placementHour, 0, 0, 0);
    const diffMs = newStart.getTime() - timelineOrigin.getTime();
    const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
    onUpdatePlacement?.(job.id, diffHours);
  };

  const handleCancelPlacement = () => {
    onCancelEditPlacement?.();
  };

  const handlePlannedStartClick = (event: MouseEvent) => {
    event.stopPropagation();
    onStartEditPlannedStart?.(job.id);
  };

  const handleSavePlannedStart = () => {
    if (!timelineOrigin || !plannedDate) return;
    const [yyyy, mm, dd] = plannedDate.split("-").map(Number);
    const newStart = new Date(yyyy, mm - 1, dd, plannedHour, 0, 0, 0);
    const diffMs = newStart.getTime() - timelineOrigin.getTime();
    const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
    onSavePlannedStart?.(job.id, diffHours);
  };

  const handleCancelPlannedStart = () => {
    onCancelEditPlannedStart?.();
  };

  const totalDuration = getDurationHours(draft);
  const cardDraggable = draggable && !editMode && !isEditing && !isEditingPlacement && !isEditingPlannedStart;

  // ── Placement Edit Mode ──────────────────────────────────────────────────
  if (isEditingPlacement) {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    return (
      <div className="palette-card palette-edit-card" ref={cardRef}>
        <div className="palette-head">
          <div>
            <h4>{job.title}</h4>
            <p>{job.note}</p>
          </div>
          <div className="palette-actions">
            <span className="duration-pill">{totalDuration}h</span>
          </div>
        </div>

        <div className="placement-edit-row">
          <label className="placement-edit-label">At:</label>
          <input
            type="date"
            className="placement-edit-date"
            value={placementDate}
            onChange={(e) => setPlacementDate(e.target.value)}
          />
          <select
            className="placement-edit-hour"
            value={placementHour}
            onChange={(e) => setPlacementHour(Number(e.target.value))}
          >
            {hours.map((h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, "0")}:00
              </option>
            ))}
          </select>
        </div>

        <div className="palette-edit-footer">
          <span className="palette-edit-total">{getDurationHours(draft)}h total</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" className="palette-edit-cancel" onClick={handleCancelPlacement}>
              Cancel
            </button>
            <button type="button" className="palette-edit-save" onClick={handleSavePlacement}>
              Save
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Job Edit Mode ────────────────────────────────────────────────────────
  if (isEditing) {
    return (
      <div className="palette-card palette-edit-card" ref={cardRef}>
        <div className="palette-edit-header">
          <input
            type="text"
            className="palette-edit-title"
            value={draft.title}
            onChange={(e) => handleDraftTitleChange(e.target.value)}
            placeholder="Job title"
            autoFocus
          />
        </div>

        <div className="palette-edit-segments">
          {draft.segments.map((seg) => (
            <div key={seg.id} className="palette-edit-segment-row">
              <div className="palette-edit-seg-color" style={{ background: seg.color }} />
              <input
                type="text"
                className="palette-edit-seg-label"
                value={seg.label}
                onChange={(e) => handleSegmentLabelChange(seg.id, e.target.value)}
                placeholder="Stop name"
              />
              <input
                type="number"
                className="palette-edit-seg-hours"
                value={seg.durationHours}
                min="0.5"
                step="0.5"
                onChange={(e) => handleSegmentHoursChange(seg.id, e.target.value)}
              />
              <span className="palette-edit-seg-unit">h</span>
              <button
                type="button"
                className="palette-edit-remove-seg"
                onClick={() => handleRemoveSegment(seg.id)}
                title="Remove stop"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <div className="palette-edit-footer">
          <span className="palette-edit-total">{getDurationHours(draft)}h total</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" className="palette-edit-add-seg" onClick={handleAddSegment}>
              + Stop
            </button>
            <button type="button" className="palette-edit-cancel" onClick={handleCancelEdit}>
              Cancel
            </button>
            <button type="button" className="palette-edit-save" onClick={handleSaveEdit}>
              Save
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Planned Start Edit Mode (for unplaced cards) ──────────────────────────
  if (isEditingPlannedStart) {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    return (
      <div className="palette-card palette-edit-card" ref={cardRef}>
        <div className="palette-head">
          <div>
            <h4>{job.title}</h4>
            <p>{job.note}</p>
          </div>
          <div className="palette-actions">
            <span className="duration-pill">{totalDuration}h</span>
          </div>
        </div>

        <div className="placement-edit-row">
          <label className="placement-edit-label">Schedule:</label>
          <input
            type="date"
            className="placement-edit-date"
            value={plannedDate}
            onChange={(e) => setPlannedDate(e.target.value)}
          />
          <select
            className="placement-edit-hour"
            value={plannedHour}
            onChange={(e) => setPlannedHour(Number(e.target.value))}
          >
            {hours.map((h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, "0")}:00
              </option>
            ))}
          </select>
        </div>

        <div className="palette-edit-footer">
          <span className="palette-edit-total" style={{ color: "var(--text-muted)", fontSize: "0.72rem" }}>
            Drag to timeline to place
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            <button type="button" className="palette-edit-cancel" onClick={handleCancelPlannedStart}>
              Cancel
            </button>
            <button type="button" className="palette-edit-save" onClick={handleSavePlannedStart}>
              Save
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Normal View ───────────────────────────────────────────────────────────
  return (
    <div
      ref={cardRef}
      className={`palette-card${isDragging ? " is-dragging" : ""}${isPointerDragging ? " is-pointer-dragging" : ""}${editMode ? " disabled" : ""}${clickable ? " clickable" : ""}${highlighted ? " highlighted" : ""}`}
      draggable={cardDraggable}
      tabIndex={clickable ? 0 : -1}
      role={clickable ? "button" : undefined}
      // HTML5 DnD (desktop)
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      // Pointer events (mobile)
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      style={{ touchAction: cardDraggable ? "none" : undefined }}
    >
      <div className="palette-head">
        <div>
          <h4>{job.title}</h4>
          <p>{job.note}</p>
        </div>
        <div className="palette-actions">
          <span className="duration-pill">{totalDuration}h</span>
          {onStartEdit && (
            <button
              type="button"
              className="edit-button"
              title="Edit job"
              onClick={handleEditClick}
            >
              &#9998;
            </button>
          )}
          {onUnplace ? (
            <button
              type="button"
              className="unplace-button"
              title="Unplace"
              onClick={handleUnplaceClick}
            >
              ×
            </button>
          ) : null}
        </div>
      </div>

      {/* Schedule display - clean inline layout */}
      <div className="schedule-section">
        <div className="schedule-row-inline">
          <span className="schedule-key">Schedule:</span>
          <span className="schedule-value">
            {job.plannedStart != null ? formatPlannedLabel(job.plannedStart, timelineOrigin) : "--"}
          </span>
          {onStartEditPlannedStart && (
            <button
              type="button"
              className="schedule-edit-btn"
              onClick={handlePlannedStartClick}
              title="Edit schedule"
            >
              &#9998;
            </button>
          )}
        </div>

        <div className="schedule-row-inline">
          <span className="schedule-key">At:</span>
          <span className={`schedule-value${atLabel ? " accent" : " muted"}`}>
            {atLabel ?? "-- (drag to place)"}
          </span>
          {onStartEditPlacement && (
            <button
              type="button"
              className="schedule-edit-btn"
              onClick={handlePlacementAtClick}
              title="Edit start time"
            >
              &#9998;
            </button>
          )}
        </div>
      </div>

      <div className="segment-preview single">
        {job.segments.map((segment) => (
          <div
            key={segment.id}
            className="segment-chip"
            style={{
              width: `${(segment.durationHours / totalDuration) * 100}%`,
              background: segment.color
            }}
          >
            {segment.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────
function parsePlacementStartIndex(atLabel: string | undefined): number | null {
  if (!atLabel) return null;
  return null;
}

function formatPlannedLabel(absoluteHourIndex: number, origin: Date | undefined): string {
  if (!origin) return "--";
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
