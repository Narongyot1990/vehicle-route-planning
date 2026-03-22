import { formatAbsoluteHourLabel } from "@/lib/gantt";
import type { PaletteJobCardState } from "@/features/gantt/hooks/usePaletteJobCard";
import { getSegmentIcon, getSemanticSegmentColor } from "./GanttIcons";

// ── Shared Helper ────────────────────────────────────────────────────────────
const hours = Array.from({ length: 24 }, (_, i) => i);

// ── Placement Edit Mode ──────────────────────────────────────────────────────
export function PaletteJobCardPlacementEdit({ state }: { state: PaletteJobCardState }) {
  const {
    props, draft, displayTitle, placementDate, setPlacementDate,
    placementHour, setPlacementHour, totalDuration,
    handleCancelPlacement, handleSavePlacement
  } = state;

  return (
    <div className="palette-card palette-edit-card" ref={props.cardRef}>
      <div className="palette-head">
        <div>
          <h4>{draft.title}</h4>
          <h4>{displayTitle}</h4>
          <p>{draft.note}</p>
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
        <span className="palette-edit-total">{totalDuration}h total</span>
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

// ── Job Edit Mode ────────────────────────────────────────────────────────────
export function PaletteJobCardEdit({ state }: { state: PaletteJobCardState }) {
  const {
    props, draft,
    handleDraftTitleChange, handleSegmentLabelChange, handleSegmentHoursChange,
    handleRemoveSegment, handleAddSegment, handleCancelEdit, handleSaveEdit, totalDuration
  } = state;

  return (
    <div className="palette-card palette-edit-card" ref={props.cardRef}>
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
        <span className="palette-edit-total">{totalDuration}h total</span>
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

// ── Planned Start Edit Mode ──────────────────────────────────────────────────
export function PaletteJobCardPlannedStartEdit({ state }: { state: PaletteJobCardState }) {
  const {
    props, draft, displayTitle, plannedDate, setPlannedDate,
    plannedHour, setPlannedHour, totalDuration,
    handleCancelPlannedStart, handleSavePlannedStart
  } = state;

  return (
    <div className="palette-card palette-edit-card" ref={props.cardRef}>
      <div className="palette-head">
        <div>
          <h4>{displayTitle}</h4>
          <p>{draft.note}</p>
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

// ── Normal View ──────────────────────────────────────────────────────────────
export function PaletteJobCardNormal({ state }: { state: PaletteJobCardState }) {
  const {
    props, draft, displayTitle,
    handleDragStart, handleDragEnd,
    handlePointerDown, handlePointerMove, handlePointerUp, handlePointerCancel,
    handleCardClick, handleCardKeyDown, handleUnplaceClick, handleEditClick,
    handlePlannedStartClick, handlePlacementAtClick,
    cardDraggable, isPointerDragging, totalDuration
  } = state;

  const {
    job, atLabel, editMode, clickable, highlighted, isDragging,
    onStartEdit, onUnplace, onStartEditPlannedStart, onStartEditPlacement,
    timelineOrigin, cardRef
  } = props;

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
            <h4>{displayTitle}</h4>
            <p>{draft.note}</p>
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
            {job.plannedStart != null ? formatAbsoluteHourLabel(timelineOrigin!, job.plannedStart) : "--"}
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
        {draft.segments.map((segment) => {
          const markerType = segment.segmentType ?? "waypoint";
          return (
            <div
              key={segment.id}
              className="segment-chip"
              title={`${segment.label} • ${segment.durationHours}h`}
              style={{
                width: `${(segment.durationHours / totalDuration) * 100}%`,
                background: getSemanticSegmentColor(markerType)
              }}
            >
              <span style={{ color: "#fff", fontSize: "0.95rem", paddingRight: "4px", display: "inline-flex", opacity: 1 }} aria-hidden="true">
                {getSegmentIcon(markerType)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
