import type { DragEvent } from "react";
import { HOUR_WIDTH } from "@/lib/gantt";

type TimelineSlotCellProps = {
  vehicle: string;
  hourIndex: number;
  editMode: boolean;
  previewVisible: boolean;
  previewConflict: boolean;
  onTimelineSlotDragOver: (vehicleId: string, hourIndex: number, event: DragEvent<HTMLButtonElement>) => void;
  onTimelineDrop: (vehicleId: string, rawStartIndex: number, event: DragEvent<HTMLButtonElement>) => void;
  hourWidth: number;
};

export function TimelineSlotCell({
  vehicle,
  hourIndex,
  editMode,
  previewVisible,
  previewConflict,
  onTimelineSlotDragOver,
  onTimelineDrop,
  hourWidth
}: TimelineSlotCellProps) {
  const handleDragOver = (event: DragEvent<HTMLButtonElement>) => {
    onTimelineSlotDragOver(vehicle, hourIndex, event);
  };

  const handleDrop = (event: DragEvent<HTMLButtonElement>) => {
    onTimelineDrop(vehicle, hourIndex, event);
  };

  return (
    <button
      type="button"
      disabled={editMode}
      data-slot-vehicle-id={vehicle}
      data-slot-hour-index={hourIndex}
      className={`slot-cell${hourIndex % 24 === 0 ? " day-start" : ""}${Math.floor(hourIndex / 24) % 2 === 0 ? " odd-day" : ""}${previewVisible ? " preview-target" : ""}${previewConflict ? " invalid-drop" : ""}`}
      style={{ width: hourWidth }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    />
  );
}
