import { useRef, type ChangeEvent } from "react";
import type { InteractionMode } from "@/features/gantt/hooks/useGanttChartState";

type GanttMetaProps = {
  mode: InteractionMode;
  onModeChange: (nextMode: InteractionMode) => void;
  onGoToToday: () => void;
  onCustomDateNavigate: (dateValue: string) => void;
  hourWidth: number;
  onHourWidthChange: (width: number) => void;
};

function PencilIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="edit-icon-svg">
      <path
        d="M4 20h4l10.5-10.5a1.414 1.414 0 0 0 0-2L16.5 5.5a1.414 1.414 0 0 0-2 0L4 16v4Z"
        fill="currentColor"
      />
      <path d="m13.5 6.5 4 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function GanttMeta({
  mode,
  onModeChange,
  onGoToToday,
  onCustomDateNavigate,
  hourWidth,
  onHourWidthChange
}: GanttMetaProps) {
  const customDateInputRef = useRef<HTMLInputElement>(null);
  const handleMoveMode = () => onModeChange("move");
  const handleEditMode = () => onModeChange("edit");
  const handleTodayClick = () => onGoToToday();
  const handleCompactZoom = () => onHourWidthChange(22);
  const handleDetailedZoom = () => onHourWidthChange(44);

  const handleCustomClick = () => {
    const input = customDateInputRef.current;
    if (!input) {
      return;
    }

    const pickerInput = input as HTMLInputElement & { showPicker?: () => void };
    if (pickerInput.showPicker) {
      pickerInput.showPicker();
      return;
    }

    input.click();
  };

  const handleCustomDateChange = (event: ChangeEvent<HTMLInputElement>) => {
    onCustomDateNavigate(event.target.value);
    event.target.value = "";
  };

  return (
    <div className="gantt-meta minimal">
      {/* Date navigation */}
      <div className="meta-panel">
        <div className="control-cluster" aria-label="Date navigation">
          <div className="calendar-controls">
            <button type="button" className="today-button primary" onClick={handleTodayClick}>
              Today
            </button>
            <button type="button" className="today-button secondary" onClick={handleCustomClick}>
              Custom date
            </button>
            <input
              ref={customDateInputRef}
              type="date"
              className="custom-date-input"
              onChange={handleCustomDateChange}
            />
          </div>
        </div>

        <div className="control-cluster" aria-label="Timeline density">
          <div className="zoom-toggle">
            <button
              type="button"
              className={`zoom-btn${hourWidth === 44 ? " active" : ""}`}
              onClick={handleDetailedZoom}
            >
              1h
            </button>
            <button
              type="button"
              className={`zoom-btn${hourWidth === 22 ? " active" : ""}`}
              onClick={handleCompactZoom}
            >
              2h
            </button>
          </div>
        </div>

        <div className="control-cluster" aria-label="Interaction mode">
          <div className="mode-switch">
            <button
              type="button"
              className={`mode-button${mode === "move" ? " active" : ""}`}
              onClick={handleMoveMode}
            >
              <span>Move</span>
            </button>
            <button
              type="button"
              className={`mode-button${mode === "edit" ? " active" : ""}`}
              onClick={handleEditMode}
            >
              <PencilIcon />
              <span>Edit</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
