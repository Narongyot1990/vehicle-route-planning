"use client";

import { useState, useEffect, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";
import { TimelineBoard } from "@/features/gantt/components/TimelineBoard";
import { JobPalette } from "@/features/gantt/components/JobPalette";
import { GanttMeta } from "@/features/gantt/components/GanttMeta";
import { ToolboxTray } from "@/features/gantt/components/ToolboxTray";
import { useGanttChartState } from "@/features/gantt/hooks/useGanttChartState";
import { useVehicles } from "@/features/gantt/hooks/useVehicles";
import { useJobs } from "@/features/gantt/hooks/useJobs";
import type { Vehicle } from "@/features/gantt/data/mockVehicles";
import { JobOrderEditModal } from "@/features/gantt/components/JobOrderEditModal";

export function GanttChartFeature() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [modalJobId, setModalJobId] = useState<string | null>(null);
  const vehicles: Vehicle[] = useVehicles();
  const { jobs, reload } = useJobs();
  const state = useGanttChartState(vehicles, jobs);

  const handleJobBarClick = (jobId: string) => {
    setModalJobId(jobId);
  };

  // Keyboard shortcut: [ to toggle sidebar
  useEffect(() => {
    const handleKey = (e: KeyboardEvent<HTMLElement>) => {
      if (e.key === "[" && !e.ctrlKey && !e.metaKey) {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        setSidebarOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKey as any);
    return () => window.removeEventListener("keydown", handleKey as any);
  }, []);

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
    const isPlacedCard = target.closest(".palette-card.clickable");

    if (isJobBar || isPlacedCard) {
      return;
    }

    state.handleClearSelection();
  };

  return (
    <section className="planner-page" onPointerDownCapture={handleShellPointerDownCapture}>
      <section className="gantt-card" aria-label="Planning workspace">
        <GanttMeta
          mode={state.mode}
          onModeChange={state.handleModeChange}
          onGoToToday={state.handleGoToToday}
          onCustomDateNavigate={state.handleCustomDateNavigate}
          hourWidth={state.hourWidth}
          onHourWidthChange={state.setHourWidth}
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
              onGoToPlacedJobInPalette={state.handleGoToPlacedJobInPalette}
              onResizeToolInstance={state.handleResizeToolInstance}
              onJobBarClick={handleJobBarClick}
            />
          </section>

          <JobPalette
            editMode={state.editMode}
            paletteActive={state.paletteActive}
            paletteView={state.paletteView}
            paletteFocusJobId={state.paletteFocusJobId}
            paletteFocusToken={state.paletteFocusToken}
            paletteJobs={state.paletteJobs}
            assignedJobs={state.assignedJobs}
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
            onUnplaceJob={state.handleUnplaceJob}
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
          onSaved={reload}
        />
      )}
    </section>
  );
}
