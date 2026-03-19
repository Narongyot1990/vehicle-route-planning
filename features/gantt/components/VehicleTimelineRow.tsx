import type { DragEvent, KeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import {
  BAR_HEIGHT,
  getDurationHours,
  HOUR_WIDTH,
  type DragPayload,
  type JobItem,
  type JobPlacement
} from "@/lib/gantt";
import type { EditingCell } from "@/features/gantt/hooks/useGanttChartState";
import { PlacedJobBar } from "@/features/gantt/components/PlacedJobBar";
import { TimelineSlotCell } from "@/features/gantt/components/TimelineSlotCell";

type VehicleTimelineRowProps = {
  vehicle: string;
  displayTotalHours: number;
  editMode: boolean;
  jobs: JobItem[];
  placements: JobPlacement[];
  activeDrag: DragPayload | null;
  hoveredDrop: { vehicleId: string; startIndex: number } | null;
  editingCell: EditingCell | null;
  canDrop: (vehicleId: string, startIndex: number, payload: DragPayload | null) => boolean;
  toDisplayIndex: (absoluteHourIndex: number) => number;
  onTimelineSlotDragOver: (vehicleId: string, hourIndex: number, event: DragEvent<HTMLButtonElement>) => void;
  onTimelineDrop: (vehicleId: string, rawStartIndex: number, event: DragEvent<HTMLButtonElement>) => void;
  onPlacedJobPointerDown: (jobId: string, event: ReactPointerEvent<HTMLDivElement>) => void;
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
  jumpJobId: string | null;
  hourWidth: number;
};

export function VehicleTimelineRow({
  vehicle,
  displayTotalHours,
  editMode,
  jobs,
  placements,
  activeDrag,
  hoveredDrop,
  editingCell,
  canDrop,
  toDisplayIndex,
  onTimelineSlotDragOver,
  onTimelineDrop,
  onPlacedJobPointerDown,
  onSegmentClick,
  onSegmentInputChange,
  onSegmentInputBlur,
  onSegmentInputKeyDown,
  onGoToPlacedJobInPalette,
  jumpJobId,
  hourWidth
}: VehicleTimelineRowProps) {
  const vehiclePlacements = placements.filter((placement) => placement.vehicleId === vehicle);
  const findJob = (jobId: string) => jobs.find((job) => job.id === jobId);
  const vehicleParts = vehicle.split(" ");
  const vehiclePlate = vehicleParts.slice(0, 2).join(" ");
  const vehicleRegion = vehicleParts.slice(2).join(" ");

  const renderDropPreview = () => {
    if (editMode || !hoveredDrop || hoveredDrop.vehicleId !== vehicle || !activeDrag) {
      return null;
    }

    const hoveredJob = jobs.find((job) => job.id === activeDrag.jobId);
    if (!hoveredJob) {
      return null;
    }

    const dropAllowed = canDrop(vehicle, hoveredDrop.startIndex, activeDrag);
    return (
      <div
        className={`drop-preview${dropAllowed ? "" : " invalid"}`}
        style={{
          left: toDisplayIndex(hoveredDrop.startIndex) * hourWidth,
          width: getDurationHours(hoveredJob) * hourWidth,
          height: BAR_HEIGHT
        }}
      >
        <span>{hoveredJob.title}</span>
      </div>
    );
  };

  return (
    <>
      <div className="vehicle-cell" data-vehicle-id={vehicle} title={vehicle}>
        <span className="vehicle-cell-main">{vehiclePlate}</span>
        {vehicleRegion ? <span className="vehicle-cell-sub">{vehicleRegion}</span> : null}
      </div>
      <div className={`timeline-row${editMode ? " edit-mode" : ""}`}>
        <div className="slots-layer">
          {Array.from({ length: displayTotalHours }, (_, hourIndex) => {
            const previewVisible =
              hoveredDrop?.vehicleId === vehicle && toDisplayIndex(hoveredDrop.startIndex) === hourIndex;
            const previewConflict = previewVisible && !canDrop(vehicle, hoveredDrop.startIndex, activeDrag);

            return (
              <TimelineSlotCell
                key={`${vehicle}-${hourIndex}`}
                vehicle={vehicle}
                hourIndex={hourIndex}
                editMode={editMode}
                previewVisible={previewVisible}
                previewConflict={previewConflict}
                onTimelineSlotDragOver={onTimelineSlotDragOver}
                onTimelineDrop={onTimelineDrop}
                hourWidth={hourWidth}
              />
            );
          })}
        </div>

        <div className="bars-layer">
          {vehiclePlacements.map((placement) => {
            const job = findJob(placement.jobId);
            if (!job) {
              return null;
            }
            const isJumpTarget = jumpJobId === job.id;

            return (
              <PlacedJobBar
                key={placement.jobId}
                job={job}
                placement={placement}
                editMode={editMode}
                activeDrag={activeDrag}
                editingCell={editingCell}
                isJumpTarget={isJumpTarget}
                toDisplayIndex={toDisplayIndex}
                onPlacedJobPointerDown={onPlacedJobPointerDown}
                onGoToPlacedJobInPalette={onGoToPlacedJobInPalette}
                onSegmentClick={onSegmentClick}
                onSegmentInputChange={onSegmentInputChange}
                onSegmentInputBlur={onSegmentInputBlur}
                onSegmentInputKeyDown={onSegmentInputKeyDown}
                jumpJobId={jumpJobId}
                hourWidth={hourWidth}
              />
            );
          })}
          {renderDropPreview()}
        </div>
      </div>
    </>
  );
}
