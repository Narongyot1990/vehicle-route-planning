"use client";

import { useCallback, useEffect, useMemo, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { TimelineBoard } from "@/features/gantt/components/TimelineBoard";
import { JobPalette } from "@/features/gantt/components/JobPalette";
import { GanttMeta } from "@/features/gantt/components/GanttMeta";
import { ToolboxTray } from "@/features/gantt/components/ToolboxTray";
import { useGanttChartState } from "@/features/gantt/hooks/useGanttChartState";
import { useVehicles } from "@/features/gantt/hooks/useVehicles";
import { useJobs } from "@/features/gantt/hooks/useJobs";
import { isVehicleBlockJob, useVehicleBlocks } from "@/features/gantt/hooks/useVehicleBlocks";
import { JobOrderEditModal } from "@/features/gantt/components/JobOrderEditModal";

export function GanttChartFeature() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [modalJobId, setModalJobId] = useState<string | null>(null);
  const { vehicles } = useVehicles();
  const jobsState = useJobs();
  const blocksState = useVehicleBlocks();

  const handlePlanningItemUpdate = useCallback((updated: (typeof jobsState.jobs)[number]) => {
    if (isVehicleBlockJob(updated)) {
      return blocksState.updateBlockJob(updated);
    }
    return jobsState.updateJob(updated);
  }, [blocksState, jobsState]);

  const saveIndicator = useMemo(() => (
    jobsState.saveIndicator.updatedAtMs >= blocksState.saveIndicator.updatedAtMs
      ? jobsState.saveIndicator
      : blocksState.saveIndicator
  ), [blocksState.saveIndicator, jobsState.saveIndicator]);

  const state = useGanttChartState(
    vehicles,
    jobsState.jobs,
    blocksState.blockJobs,
    handlePlanningItemUpdate,
    blocksState.createBlockFromTemplate,
  );

  const handleJobBarClick = (jobId: string) => {
    setModalJobId(jobId);
  };

  // Keyboard shortcut: [ to toggle sidebar
  useEffect(() => {
    const handleKey = (e: KeyboardEvent<HTMLElement>) => {
      const tag = (e.target as HTMLElement).tagName;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        e.preventDefault();

        if (e.shiftKey) {
          state.handleRedo();
        } else {
          state.handleUndo();
        }
        return;
      }

      if (e.ctrlKey && e.key.toLowerCase() === "y") {
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        e.preventDefault();
        state.handleRedo();
        return;
      }

      if (e.key === "[" && !e.ctrlKey && !e.metaKey) {
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        setSidebarOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKey as any);
    return () => window.removeEventListener("keydown", handleKey as any);
  }, [state.handleRedo, state.handleUndo]);

  const handleSegmentInputKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
    jobId: string,
    segmentId: string,
    value: string
  ) => {
    state.handleSegmentInputKeyDown(event, jobId, segmentId, value);
  };

  // Pointer drag wrappers to match types
  const handlePointerDragMove = (event: ReactPointerEvent<HTMLElement>) => {
    state.handlePointerDragMove(event.clientX, event.clientY);
  };

  const handlePointerDragEnd = (event: ReactPointerEvent<HTMLElement>) => {
    const target = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null;
    state.handlePointerDragEnd(event.clientX, event.clientY, target);
  };

  const handlePointerDragCancel = (event: ReactPointerEvent<HTMLElement>) => {
    state.handlePointerDragCancel();
  };

  const handleShellPointerDownCapture = (event: ReactPointerEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    const isJobBar = target.closest("[data-job-id]");
    const isAssignedCard = target.closest(".palette-card.clickable");

    if (isJobBar || isAssignedCard) {
      return;
    }

    state.handleClearSelection();
  };

  return (
    <section className="planner-page" onPointerDownCapture={handleShellPointerDownCapture}>
      <section className="gantt-card" aria-label="Planning workspace">
        <GanttMeta
          onGoToToday={state.handleGoToToday}
          onCustomDateNavigate={state.handleCustomDateNavigate}
          hourWidth={state.hourWidth}
          onHourWidthChange={state.setHourWidth}
          canUndo={state.canUndo}
          canRedo={state.canRedo}
          undoLabel={state.undoLabel}
          redoLabel={state.redoLabel}
          undoEntries={state.undoEntries}
          redoEntries={state.redoEntries}
          historyBusy={state.historyBusy}
          onUndo={state.handleUndo}
          onRedo={state.handleRedo}
          onUndoMany={state.handleUndoMany}
          onRedoMany={state.handleRedoMany}
          saveIndicator={saveIndicator}
        />

        <div className={`planner-shell${sidebarOpen ? "" : " sidebar-collapsed"}`}>
          <section className="timeline-panel" aria-label="Vehicle timeline board">
            <TimelineBoard
              vehicles={vehicles}
              days={state.days}
              windowStartHour={state.windowStartHour}
              displayTotalHours={state.displayTotalHours}
              jobs={state.jobItems}
              placements={state.placements}
              editMode={state.editMode}
              jumpToken={state.jumpToken}
              jumpAbsoluteHour={state.jumpAbsoluteHour}
              jumpJobId={state.jumpJobId}
              jumpVehicleId={state.jumpVehicleId}
              jumpJobToken={state.jumpJobToken}
              prependHours={state.prependHours}
              prependToken={state.prependToken}
              activeDrag={state.activeDrag}
              hoveredDrop={state.hoveredDrop}
              editingCell={state.editingCell}
              canDrop={state.canDrop}
              hourWidth={state.hourWidth}
              toDisplayIndex={state.toDisplayIndex}
              onRequestExtendLeft={state.handleExtendWindowLeft}
              onRequestExtendRight={state.handleExtendWindowRight}
              onPlacedJobPointerStart={state.handlePlacedJobPointerStart}
              onPlacedJobPointerHover={state.handlePlacedJobPointerHover}
              onPlacedJobPointerLeave={state.handlePlacedJobPointerLeave}
              onPlacedJobPointerCommit={state.handlePlacedJobPointerCommit}
              onPlacedJobPointerCancel={state.handlePlacedJobPointerCancel}
              onTimelineSlotDragOver={state.handleTimelineSlotDragOver}
              onTimelineDrop={state.handleTimelineDrop}
              onSegmentClick={state.handleSegmentClick}
              onSegmentInputChange={state.handleSegmentInputChange}
              onSegmentInputBlur={state.commitSegmentHours}
              onSegmentInputKeyDown={handleSegmentInputKeyDown}
              onGoToPlacedJobInPalette={state.handleGoToAssignedItemInPalette}
              onResizeToolInstance={state.handleResizeAssignedItem}
              onJobBarClick={handleJobBarClick}
            />
          </section>

          <JobPalette
            editMode={state.editMode}
            paletteActive={state.paletteActive}
            paletteView={state.paletteView}
            paletteFocusJobId={state.paletteFocusJobId}
            paletteFocusToken={state.paletteFocusToken}
            unassignedJobs={state.unassignedJobs}
            assignedItems={state.assignedItems}
            activeDrag={state.activeDrag}
            editingJobId={state.editingJobId}
            editingPlacementJobId={state.editingPlacementJobId}
            editingPlannedStartJobId={state.editingPlannedStartJobId}
            timelineOrigin={state.timelineOrigin}
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen(prev => !prev)}
            onPaletteViewChange={state.handlePaletteViewChange}
            onPaletteDragOver={state.handlePaletteDragOver}
            onPaletteDragLeave={state.handlePaletteDragLeave}
            onPaletteDrop={state.handlePaletteDrop}
            onJobDragStart={state.handleJobDragStart}
            onDragEnd={state.clearInteractionState}
            onNavigateToJobPlacement={state.handleNavigateToJobPlacement}
            onUnassignJob={state.handleUnassignJob}
            onEditJob={state.handleEditJob}
            onStartEditJob={(jobId) => setModalJobId(jobId)}
            onCancelEditJob={() => state.setEditingJobId(null)}
            onStartEditPlacement={state.setEditingPlacementJobId}
            onUpdatePlacement={state.handleUpdatePlacement}
            onCancelEditPlacement={() => state.setEditingPlacementJobId(null)}
            onStartEditPlannedStart={state.setEditingPlannedStartJobId}
            onSavePlannedStart={state.handleSavePlannedStart}
            onCancelEditPlannedStart={() => state.setEditingPlannedStartJobId(null)}
            onPointerDragStart={state.handlePointerDragStart}
            onPointerDragMove={handlePointerDragMove}
            onPointerDragEnd={handlePointerDragEnd}
            onPointerDragCancel={handlePointerDragCancel}
          />
        </div>
      </section>

      {/* Floating palette toggle - shown when sidebar is collapsed */}
      {!sidebarOpen && (
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          title="Show palette"
          style={{
            position: "fixed",
            bottom: 16,
            right: 16,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 44,
            height: 44,
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-lg)",
            background: "var(--surface)",
            color: "var(--text)",
            cursor: "pointer",
            fontSize: "1.2rem",
            fontWeight: 700,
            boxShadow: "var(--shadow-lg)",
            flexShrink: 0
          }}
        >
          ☰
        </button>
      )}

      <ToolboxTray
        activeToolTemplateId={state.activeToolTemplateId}
        onToolTemplateDragStart={state.handleToolTemplateDragStart}
        onToolTemplateDragEnd={state.handleToolTemplateDragEnd}
      />

      {modalJobId && (
        <JobOrderEditModal
          jobOrderId={modalJobId}
          onClose={() => setModalJobId(null)}
          onSaved={jobsState.reload}
        />
      )}
    </section>
  );
}
