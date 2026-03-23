import { useRef, type ChangeEvent } from "react";
import Link from "next/link";
import type { JobHistoryEntry } from "@/features/gantt/hooks/useJobHistory";
import type { SaveIndicatorState } from "@/features/gantt/hooks/useJobs";
import { HistorySplitButton } from "@/features/gantt/components/HistorySplitButton";
import { SaveStatusIndicator } from "@/features/gantt/components/SaveStatusIndicator";
import { Icon } from "@/components/ui/Icon";
import TruckIcon from "@/assets/icons/TruckIcon.svg?url";

type GanttMetaProps = {
  onGoToToday: () => void;
  onCustomDateNavigate: (dateValue: string) => void;
  hourWidth: number;
  onHourWidthChange: (width: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  undoLabel: string | null;
  redoLabel: string | null;
  undoEntries: JobHistoryEntry[];
  redoEntries: JobHistoryEntry[];
  historyBusy: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onUndoMany: (count: number) => void;
  onRedoMany: (count: number) => void;
  saveIndicator: SaveIndicatorState;
};

export function GanttMeta({
  onGoToToday,
  onCustomDateNavigate,
  hourWidth,
  onHourWidthChange,
  canUndo,
  canRedo,
  undoLabel,
  redoLabel,
  undoEntries,
  redoEntries,
  historyBusy,
  onUndo,
  onRedo,
  onUndoMany,
  onRedoMany,
  saveIndicator
}: GanttMetaProps) {
  const customDateInputRef = useRef<HTMLInputElement>(null);
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
      {/* App Navigation Links (Left side) */}
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <Link href="/jobs" style={{ padding: "0.3rem 0.75rem", fontSize: "0.8rem", fontWeight: 600, color: "#475569", background: "#f1f5f9", borderRadius: "6px", textDecoration: "none" }}>📋 Job Orders</Link>
        <Link href="/customers" style={{ padding: "0.3rem 0.75rem", fontSize: "0.8rem", fontWeight: 600, color: "#475569", background: "#f1f5f9", borderRadius: "6px", textDecoration: "none" }}>👥 Customers</Link>
        <Link href="/routes" style={{ padding: "0.3rem 0.75rem", fontSize: "0.8rem", fontWeight: 600, color: "#475569", background: "#f1f5f9", borderRadius: "6px", textDecoration: "none" }}>🗺️ Routes</Link>
        <Link href="/vehicles" style={{ padding: "0.3rem 0.75rem", fontSize: "0.8rem", fontWeight: 600, color: "#475569", background: "#f1f5f9", borderRadius: "6px", textDecoration: "none", display: "flex", alignItems: "center", gap: "0.3rem" }}>
          <Icon src={TruckIcon} width={14} height={14} /> Trucks
        </Link>
      </div>

      {/* Date navigation & Controls (Right side) */}
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

        <div className="control-cluster" aria-label="Undo and redo">
          <div className="history-controls">
            <HistorySplitButton
              direction="undo"
              disabled={!canUndo}
              busy={historyBusy}
              nextLabel={undoLabel}
              entries={undoEntries}
              onSingle={onUndo}
              onMany={onUndoMany}
            />
            <HistorySplitButton
              direction="redo"
              disabled={!canRedo}
              busy={historyBusy}
              nextLabel={redoLabel}
              entries={redoEntries}
              onSingle={onRedo}
              onMany={onRedoMany}
            />
          </div>
        </div>

        <div className="control-cluster save-status-cluster" aria-label="Auto-save status">
          <SaveStatusIndicator state={saveIndicator} />
        </div>
      </div>
    </div>
  );
}
