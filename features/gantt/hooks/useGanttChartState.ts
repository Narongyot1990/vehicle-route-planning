"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent
} from "react";
import {
  formatAbsoluteHourLabel,
  getDurationHours,
  HOURS,
  isPlacementConflict,
  jobToJobItem,
  parseDragPayload,
  type DragPayload,
  type JobItem,
  type JobPlacement,
  type JobSegment
} from "@/lib/gantt";
import type { Vehicle } from "@/features/gantt/data/mockVehicles";
import { type Job, getJobTotalHours } from "@/features/gantt/types/job";
import { useTimelineNavigation } from "./useTimelineNavigation";
import { useToolInstances, toolItemToPaletteJob } from "./useToolInstances";

// ── Exported Types ───────────────────────────────────────────────────────────

export type InteractionMode = "move" | "edit";

export type EditingCell = {
  jobId: string;
  segmentId: string;
  value: string;
};

export type PaletteView = "unassigned" | "assigned";

// ── Main Hook ────────────────────────────────────────────────────────────────

export function useGanttChartState(
  vehicles: Vehicle[],
  jobs: Job[],
  onJobUpdate?: (updated: Job) => void,
) {
  // ── Compose Sub-Hooks ───────────────────────────────────────────────────────
  const nav = useTimelineNavigation();
  const tools = useToolInstances();

  // ── JobItem derivation ──────────────────────────────────────────────────────
  const jobItems = useMemo(
    () => [...jobs.map(jobToJobItem), ...tools.toolInstances],
    [jobs, tools.toolInstances]
  );

  // ── Placements ──────────────────────────────────────────────────────────────
  const [placements, setPlacements] = useState<JobPlacement[]>([]);

  // Sync placements from jobs when jobs data loads/changes
  useEffect(() => {
    const jobBased = jobs
      .filter((j) => j.assignedVehiclePlate && j.plannedStart != null)
      .map((j) => ({
        jobId: j.id,
        vehicleId: j.assignedVehiclePlate!,
        startIndex: j.plannedStart!,
      }));

    if (jobBased.length === 0) return;

    setPlacements((prev) => {
      const prevIds = new Set(prev.map((p) => p.jobId));
      const incoming = jobBased.filter((p) => !prevIds.has(p.jobId));
      if (incoming.length === 0) return prev;
      return [...prev, ...incoming];
    });
  }, [jobs]);

  // ── Interaction State ───────────────────────────────────────────────────────
  const [hoveredDrop, setHoveredDrop] = useState<{ vehicleId: string; startIndex: number } | null>(null);
  const [paletteActive, setPaletteActive] = useState(false);
  const [activeDrag, setActiveDrag] = useState<DragPayload | null>(null);
  const [mode, setMode] = useState<InteractionMode>("move");
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [paletteView, setPaletteView] = useState<PaletteView>("unassigned");
  const [paletteFocusJobId, setPaletteFocusJobId] = useState<string | null>(null);
  const [paletteFocusToken, setPaletteFocusToken] = useState(0);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [editingPlacementJobId, setEditingPlacementJobId] = useState<string | null>(null);
  const [editingPlannedStartJobId, setEditingPlannedStartJobId] = useState<string | null>(null);

  // Refs for hot-path drag performance (avoid React state writes on every frame)
  const hoveredDropRef = useRef<{ vehicleId: string; startIndex: number } | null>(null);
  const paletteActiveRef = useRef(false);
  const activeDragRef = useRef<DragPayload | null>(null);

  const editMode = mode === "edit";

  // ── Lookup indexes ──────────────────────────────────────────────────────────
  const jobsById = useMemo(() => {
    const next = new Map<string, Job>();
    for (const job of jobs) next.set(job.id, job);
    return next;
  }, [jobs]);

  const placementsByJobId = useMemo(() => {
    const next = new Map<string, JobPlacement>();
    for (const placement of placements) next.set(placement.jobId, placement);
    return next;
  }, [placements]);

  const findJob = (jobId: string) => jobsById.get(jobId);
  const findPlacement = (jobId: string) => placementsByJobId.get(jobId);

  const paletteJobs = useMemo(
    () => jobs.filter((job) => !placementsByJobId.has(job.id)),
    [jobs, placementsByJobId]
  );

  const assignedJobs = useMemo(
    () =>
      placements
        .map((placement) => {
          const job = jobsById.get(placement.jobId);
          if (job) {
            return {
              job,
              placement,
              atLabel: formatAbsoluteHourLabel(nav.timelineOrigin, placement.startIndex)
            };
          }

          const toolItem = tools.toolInstances.find((item) => item.id === placement.jobId);
          if (!toolItem) return null;

          return {
            job: toolItemToPaletteJob(toolItem, placement.startIndex),
            placement,
            atLabel: formatAbsoluteHourLabel(nav.timelineOrigin, placement.startIndex)
          };
        })
        .filter((item): item is { job: Job; placement: JobPlacement; atLabel: string } => item !== null),
    [jobsById, placements, nav.timelineOrigin, tools.toolInstances]
  );

  // ── Conflict detection ──────────────────────────────────────────────────────
  const jobDurationById = useMemo(() => {
    const durationById = new Map<string, number>();
    for (const job of jobItems) durationById.set(job.id, getDurationHours(job));
    return durationById;
  }, [jobItems]);

  const placementsByVehicle = useMemo(() => {
    const next = new Map<string, JobPlacement[]>();
    for (const placement of placements) {
      const vehiclePlacements = next.get(placement.vehicleId);
      if (vehiclePlacements) vehiclePlacements.push(placement);
      else next.set(placement.vehicleId, [placement]);
    }
    return next;
  }, [placements]);

  const canDrop = useCallback((vehicleId: string, startIndex: number, payload: DragPayload | null) => {
    if (!payload) return false;

    const pendingToolInstance = tools.pendingToolDragInstanceRef.current;
    const nextDuration =
      jobDurationById.get(payload.jobId) ??
      (pendingToolInstance?.id === payload.jobId ? getDurationHours(pendingToolInstance) : undefined);

    if (nextDuration === undefined) return false;

    const nextEnd = startIndex + nextDuration;
    const vehiclePlacements = placementsByVehicle.get(vehicleId);
    if (!vehiclePlacements || vehiclePlacements.length === 0) return true;

    for (const placement of vehiclePlacements) {
      if (placement.jobId === payload.jobId) continue;
      const currentDuration = jobDurationById.get(placement.jobId);
      if (currentDuration === undefined) continue;
      const currentStart = placement.startIndex;
      const currentEnd = currentStart + currentDuration;
      if (startIndex < currentEnd && nextEnd > currentStart) return false;
    }

    return true;
  }, [jobDurationById, placementsByVehicle, tools.pendingToolDragInstanceRef]);

  // ── Ref sync effects ────────────────────────────────────────────────────────
  useEffect(() => { hoveredDropRef.current = hoveredDrop; }, [hoveredDrop]);
  useEffect(() => { paletteActiveRef.current = paletteActive; }, [paletteActive]);
  useEffect(() => { activeDragRef.current = activeDrag; }, [activeDrag]);

  // ── Interaction State Helpers ───────────────────────────────────────────────
  const clearInteractionState = () => {
    hoveredDropRef.current = null;
    paletteActiveRef.current = false;
    activeDragRef.current = null;
    setHoveredDrop(null);
    setPaletteActive(false);
    setActiveDrag(null);
  };

  const handleModeChange = (nextMode: InteractionMode) => {
    setMode(nextMode);
    setEditingCell(null);
    clearInteractionState();
  };

  const handleGoToToday = () => {
    nav.handleGoToToday();
    clearInteractionState();
  };

  const handleCustomDateNavigate = (dateValue: string) => {
    nav.handleCustomDateNavigate(dateValue);
    clearInteractionState();
  };

  const handlePaletteViewChange = (nextView: PaletteView) => {
    setPaletteView(nextView);
  };

  const handleNavigateToJobPlacement = (jobId: string) => {
    const placement = findPlacement(jobId);
    if (!placement) return;

    nav.setJumpJobId(jobId);
    nav.setJumpVehicleId(placement.vehicleId);
    nav.handleNavigateToJobPlacement(jobId, placement.startIndex);
    clearInteractionState();
  };

  const handleGoToPlacedJobInPalette = (jobId: string) => {
    setPaletteView("assigned");
    setPaletteFocusJobId(jobId);
    setPaletteFocusToken((current) => current + 1);
  };

  const handleClearSelection = () => {
    nav.handleClearSelection();
    setPaletteFocusJobId(null);
  };

  // ── Placement Handlers ──────────────────────────────────────────────────────
  const handleUnplaceJob = (jobId: string) => {
    if (jobId.startsWith("tool-instance-")) {
      tools.removeToolInstance(jobId);
      setPlacements((current) => current.filter((p) => p.jobId !== jobId));
      return;
    }

    setPlacements((current) => current.filter((placement) => placement.jobId !== jobId));

    const originalJob = jobsById.get(jobId);
    if (originalJob && onJobUpdate) {
      onJobUpdate({ ...originalJob, assignedVehiclePlate: undefined, plannedStart: undefined });
    }
  };

  const handleRemovePlacedItem = (jobId: string) => {
    if (jobId.startsWith("tool-instance-")) {
      tools.removeToolInstance(jobId);
      setPlacements((current) => current.filter((p) => p.jobId !== jobId));
      return;
    }
    handleUnplaceJob(jobId);
  };

  const handleEditJob = (updatedJob: JobItem) => {
    const originalJob = jobsById.get(updatedJob.id);
    if (originalJob && onJobUpdate) {
      const updatedJobStops = updatedJob.segments.map((seg, i) => ({
        ...originalJob.stops[i],
        transitFromPrevHours: seg.durationHours,
      }));
      onJobUpdate({ ...originalJob, stops: updatedJobStops });
    }
    setEditingJobId(null);
  };

  const handleUpdatePlacement = (jobId: string, newStartIndex: number) => {
    const currentPlacement = placements.find((p) => p.jobId === jobId);
    if (!currentPlacement) { setEditingPlacementJobId(null); return; }

    const job = findJob(jobId);
    if (!job) { setEditingPlacementJobId(null); return; }

    const durationHours = getJobTotalHours(job);
    const hasConflict = isPlacementConflict(
      jobItems, placements, jobId, currentPlacement.vehicleId, newStartIndex, durationHours
    );

    if (hasConflict) { setEditingPlacementJobId(null); return; }

    setPlacements((current) =>
      current.map((placement) =>
        placement.jobId === jobId ? { ...placement, startIndex: newStartIndex } : placement
      )
    );

    if (onJobUpdate) onJobUpdate({ ...job, plannedStart: newStartIndex });
    setEditingPlacementJobId(null);
  };

  const handleSavePlannedStart = (jobId: string, plannedStart: number) => {
    const job = jobsById.get(jobId);
    if (job && onJobUpdate) onJobUpdate({ ...job, plannedStart });
    setEditingPlannedStartJobId(null);
  };

  const handleResizeToolInstance = (jobId: string, nextDurationHours: number) => {
    return tools.handleResizeToolInstance(jobId, nextDurationHours, jobItems, placements, findPlacement);
  };

  // ── Drag Payload Helpers ────────────────────────────────────────────────────
  const buildJobDragPayload = (jobId: string) => {
    return { kind: "job", jobId } satisfies DragPayload;
  };

  const getDragPayload = (event: DragEvent<HTMLElement>) => {
    return (
      parseDragPayload(event.dataTransfer.getData("application/json")) ??
      parseDragPayload(event.dataTransfer.getData("text/plain")) ??
      activeDragRef.current
    );
  };

  // ── Segment Editing ─────────────────────────────────────────────────────────
  const commitSegmentHours = (jobId: string, segmentId: string, rawValue: string) => {
    const nextHours = Number.parseFloat(rawValue);
    if (!Number.isFinite(nextHours) || nextHours <= 0) { setEditingCell(null); return; }

    const job = findJob(jobId);
    if (!job) { setEditingCell(null); return; }

    const nextJobItem: JobItem = {
      ...jobToJobItem(job),
      segments: job.stops.map((stop): JobSegment => ({
        id: stop.id,
        label: stop.label,
        color: stop.color,
        durationHours: stop.id === segmentId ? nextHours : stop.transitFromPrevHours,
      })),
    };

    const placement = findPlacement(jobId);
    if (placement) {
      const nextDuration = getDurationHours(nextJobItem);
      const blockedByConflict = isPlacementConflict(
        jobItems, placements, jobId, placement.vehicleId, placement.startIndex, nextDuration
      );
      if (blockedByConflict) { setEditingCell(null); return; }
    }

    const originalJob = jobsById.get(jobId);
    if (originalJob && onJobUpdate) {
      const segIndex = originalJob.stops.findIndex((s) => s.id === segmentId);
      if (segIndex >= 0) {
        const updatedStops = [...originalJob.stops];
        updatedStops[segIndex] = { ...updatedStops[segIndex], transitFromPrevHours: nextHours };
        onJobUpdate({ ...originalJob, stops: updatedStops });
      }
    }

    setEditingCell(null);
  };

  // ── Drop Handlers ───────────────────────────────────────────────────────────
  const handleTimelineDrop = (vehicleId: string, displayHourIndex: number, event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (editMode) return;

    const payload = getDragPayload(event);
    const startIndex = nav.toAbsoluteIndex(displayHourIndex);

    if (!payload || !canDrop(vehicleId, startIndex, payload)) {
      clearInteractionState();
      return;
    }

    setPlacements((current) => {
      const existing = current.find((placement) => placement.jobId === payload.jobId);
      if (existing) {
        return current.map((placement) =>
          placement.jobId === payload.jobId ? { ...placement, vehicleId, startIndex } : placement
        );
      }
      return [...current, { jobId: payload.jobId, vehicleId, startIndex }];
    });

    const originalJob = jobsById.get(payload.jobId);
    if (originalJob && onJobUpdate) {
      onJobUpdate({ ...originalJob, assignedVehiclePlate: vehicleId, plannedStart: startIndex });
    }

    if (payload.jobId === tools.toolDragJobId) {
      tools.pendingToolDragJobIdRef.current = null;
      tools.pendingToolDragInstanceRef.current = null;
      tools.setToolDragJobId(null);
      tools.setActiveToolTemplateId(null);
    }

    clearInteractionState();
  };

  const handlePaletteDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (editMode) return;

    const payload = getDragPayload(event);
    if (!payload) { clearInteractionState(); return; }

    if (payload.jobId === tools.toolDragJobId) {
      tools.pendingToolDragJobIdRef.current = null;
      tools.pendingToolDragInstanceRef.current = null;
      tools.removeToolInstance(payload.jobId);
      tools.setToolDragJobId(null);
      tools.setActiveToolTemplateId(null);
      setPlacements((current) => current.filter((p) => p.jobId !== payload.jobId));
      clearInteractionState();
      return;
    }

    if (payload.jobId.startsWith("tool-instance-")) {
      tools.pendingToolDragJobIdRef.current = null;
      tools.pendingToolDragInstanceRef.current = null;
      tools.removeToolInstance(payload.jobId);
      setPlacements((current) => current.filter((p) => p.jobId !== payload.jobId));
      clearInteractionState();
      return;
    }

    setPlacements((current) => current.filter((placement) => placement.jobId !== payload.jobId));
    const originalJob = jobsById.get(payload.jobId);
    if (originalJob && onJobUpdate) {
      onJobUpdate({ ...originalJob, assignedVehiclePlate: undefined, plannedStart: undefined });
    }
    clearInteractionState();
  };

  // ── DragOver / Hover Handlers ───────────────────────────────────────────────
  const handleTimelineSlotDragOver = (vehicleId: string, displayHourIndex: number, event: DragEvent<HTMLButtonElement>) => {
    if (editMode) return;

    event.preventDefault();
    const payload = getDragPayload(event);

    if (!isSameDragPayload(activeDragRef.current, payload)) {
      activeDragRef.current = payload;
      setActiveDrag(payload);
    }

    if (paletteActiveRef.current) {
      paletteActiveRef.current = false;
      setPaletteActive(false);
    }

    const nextHoveredDrop = { vehicleId, startIndex: nav.toAbsoluteIndex(displayHourIndex) };
    if (
      hoveredDropRef.current?.vehicleId !== nextHoveredDrop.vehicleId ||
      hoveredDropRef.current?.startIndex !== nextHoveredDrop.startIndex
    ) {
      hoveredDropRef.current = nextHoveredDrop;
      setHoveredDrop(nextHoveredDrop);
    }
  };

  const handlePaletteDragOver = (event: DragEvent<HTMLElement>) => {
    if (editMode) return;
    event.preventDefault();
    if (!paletteActiveRef.current) { paletteActiveRef.current = true; setPaletteActive(true); }
    if (hoveredDropRef.current !== null) { hoveredDropRef.current = null; setHoveredDrop(null); }
  };

  const handlePaletteDragLeave = () => {
    if (paletteActiveRef.current) { paletteActiveRef.current = false; setPaletteActive(false); }
  };

  // ── Placed Job Pointer Handlers (desktop timeline DnD) ──────────────────────
  const handlePlacedJobPointerStart = (jobId: string) => {
    if (editMode) return;
    const payload = buildJobDragPayload(jobId);
    activeDragRef.current = payload;
    setActiveDrag(payload);
    if (paletteActiveRef.current) { paletteActiveRef.current = false; setPaletteActive(false); }
    if (hoveredDropRef.current !== null) { hoveredDropRef.current = null; setHoveredDrop(null); }
  };

  const handlePlacedJobPointerHover = (vehicleId: string, startIndex: number) => {
    if (editMode || !activeDragRef.current) return;
    if (paletteActiveRef.current) { paletteActiveRef.current = false; setPaletteActive(false); }
    if (
      hoveredDropRef.current?.vehicleId !== vehicleId ||
      hoveredDropRef.current?.startIndex !== startIndex
    ) {
      const nextHoveredDrop = { vehicleId, startIndex };
      hoveredDropRef.current = nextHoveredDrop;
      setHoveredDrop(nextHoveredDrop);
    }
  };

  const handlePlacedJobPointerLeave = () => {
    if (editMode) return;
    if (hoveredDropRef.current !== null) { hoveredDropRef.current = null; setHoveredDrop(null); }
    if (paletteActiveRef.current) { paletteActiveRef.current = false; setPaletteActive(false); }
  };

  const handlePlacedJobPointerCommit = (vehicleId: string, startIndex: number) => {
    if (editMode) return;
    const payload = activeDragRef.current;
    if (!payload || !canDrop(vehicleId, startIndex, payload)) {
      clearInteractionState();
      return;
    }
    setPlacements((current) =>
      current.map((placement) =>
        placement.jobId === payload.jobId ? { ...placement, vehicleId, startIndex } : placement
      )
    );
    clearInteractionState();
  };

  const handlePlacedJobPointerCancel = () => clearInteractionState();

  // ── Job Drag Start (HTML5 DnD) ──────────────────────────────────────────────
  const handleJobDragStart = (jobId: string, event: DragEvent<HTMLElement>) => {
    if (editMode) { event.preventDefault(); return; }
    const payload = buildJobDragPayload(jobId);
    const rawPayload = JSON.stringify(payload);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/json", rawPayload);
    event.dataTransfer.setData("text/plain", rawPayload);
    activeDragRef.current = payload;
    setActiveDrag(payload);
  };

  // ── Tool Template Drag ──────────────────────────────────────────────────────
  const handleToolTemplateDragStart = (templateId: string, event: DragEvent<HTMLElement>) => {
    if (editMode) { event.preventDefault(); return; }

    const nextToolInstance = tools.buildToolInstance(templateId);
    if (!nextToolInstance) { event.preventDefault(); return; }

    const payload = buildJobDragPayload(nextToolInstance.id);
    const rawPayload = JSON.stringify(payload);

    tools.upsertToolInstance(nextToolInstance);
    tools.pendingToolDragJobIdRef.current = nextToolInstance.id;
    tools.pendingToolDragInstanceRef.current = nextToolInstance;
    tools.setToolDragJobId(nextToolInstance.id);
    tools.setActiveToolTemplateId(templateId);
    activeDragRef.current = payload;
    setActiveDrag(payload);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/json", rawPayload);
    event.dataTransfer.setData("text/plain", rawPayload);
  };

  const handleToolTemplateDragEnd = () => {
    tools.cleanupPendingToolDrag(tools.pendingToolDragJobIdRef.current);
    clearInteractionState();
  };

  // ── Segment Edit Handlers ───────────────────────────────────────────────────
  const handleSegmentClick = (jobId: string, segmentId: string, durationHours: number) => {
    if (!editMode) return;
    setEditingCell({ jobId, segmentId, value: String(durationHours) });
  };

  const handleSegmentInputChange = (value: string) => {
    setEditingCell((current) =>
      current ? { ...current, value: value.replace(/[^0-9.]/g, "") } : current
    );
  };

  const handleSegmentInputKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
    jobId: string,
    segmentId: string,
    value: string
  ) => {
    if (event.key === "Enter") commitSegmentHours(jobId, segmentId, value);
    if (event.key === "Escape") setEditingCell(null);
  };

  // ── Pointer Drag Handlers (Mobile Support) ──────────────────────────────────
  const handlePointerDragStart = (jobId: string) => {
    if (editMode) return;
    const payload = buildJobDragPayload(jobId);
    activeDragRef.current = payload;
    setActiveDrag(payload);
    if (paletteActiveRef.current) { paletteActiveRef.current = false; setPaletteActive(false); }
    if (hoveredDropRef.current !== null) { hoveredDropRef.current = null; setHoveredDrop(null); }
  };

  const handlePointerDragMove = (x: number, y: number) => {
    if (editMode || !activeDragRef.current) return;

    const targetElement = document.elementFromPoint(x, y);
    if (!targetElement) return;

    const slotCell = targetElement.closest("[data-slot-vehicle-id]");
    if (slotCell) {
      const vehicleId = slotCell.getAttribute("data-slot-vehicle-id");
      const hourIndex = parseInt(slotCell.getAttribute("data-slot-hour-index") ?? "0", 10);
      if (vehicleId && !isNaN(hourIndex)) {
        if (paletteActiveRef.current) { paletteActiveRef.current = false; setPaletteActive(false); }
        const nextHoveredDrop = { vehicleId, startIndex: nav.toAbsoluteIndex(hourIndex) };
        if (
          hoveredDropRef.current?.vehicleId !== nextHoveredDrop.vehicleId ||
          hoveredDropRef.current?.startIndex !== nextHoveredDrop.startIndex
        ) {
          hoveredDropRef.current = nextHoveredDrop;
          setHoveredDrop(nextHoveredDrop);
        }
        return;
      }
    }

    const palette = targetElement.closest(".job-palette");
    if (palette) {
      if (!paletteActiveRef.current) { paletteActiveRef.current = true; setPaletteActive(true); }
      if (hoveredDropRef.current !== null) { hoveredDropRef.current = null; setHoveredDrop(null); }
    }
  };

  const handlePointerDragEnd = (x: number, y: number, target: HTMLElement | null) => {
    const payload = activeDragRef.current;
    if (editMode || !payload) { clearInteractionState(); return; }
    if (!target) { clearInteractionState(); return; }

    const slotCell = target.closest("[data-slot-vehicle-id]");
    if (slotCell) {
      const vehicleId = slotCell.getAttribute("data-slot-vehicle-id");
      const hourIndex = parseInt(slotCell.getAttribute("data-slot-hour-index") ?? "0", 10);
      if (vehicleId && !isNaN(hourIndex)) {
        const startIndex = nav.toAbsoluteIndex(hourIndex);
        if (canDrop(vehicleId, startIndex, payload)) {
          setPlacements((current) => {
            const existing = current.find((placement) => placement.jobId === payload.jobId);
            if (existing) {
              return current.map((placement) =>
                placement.jobId === payload.jobId ? { ...placement, vehicleId, startIndex } : placement
              );
            }
            return [...current, { jobId: payload.jobId, vehicleId, startIndex }];
          });
        }
      }
      clearInteractionState();
      return;
    }

    const palette = target.closest(".job-palette");
    if (palette) {
      if (payload.jobId.startsWith("tool-instance-")) {
        tools.pendingToolDragJobIdRef.current = null;
        tools.pendingToolDragInstanceRef.current = null;
        tools.removeToolInstance(payload.jobId);
        setPlacements((current) => current.filter((p) => p.jobId !== payload.jobId));
      } else {
        setPlacements((current) => current.filter((placement) => placement.jobId !== payload.jobId));
      }
      clearInteractionState();
      return;
    }

    clearInteractionState();
  };

  const handlePointerDragCancel = () => clearInteractionState();

  // ── Return ──────────────────────────────────────────────────────────────────
  return {
    // From navigation sub-hook
    days: nav.days,
    displayTotalHours: nav.displayTotalHours,
    windowStartHour: nav.windowStartHour,
    jumpAbsoluteHour: nav.jumpAbsoluteHour,
    jumpToken: nav.jumpToken,
    jumpJobId: nav.jumpJobId,
    jumpVehicleId: nav.jumpVehicleId,
    jumpJobToken: nav.jumpJobToken,
    prependHours: nav.prependHours,
    prependToken: nav.prependToken,
    hourWidth: nav.hourWidth,
    setHourWidth: nav.setHourWidth,
    toDisplayIndex: nav.toDisplayIndex,
    toAbsoluteIndex: nav.toAbsoluteIndex,
    timelineOrigin: nav.timelineOrigin,
    handleExtendWindowLeft: nav.handleExtendWindowLeft,
    handleExtendWindowRight: nav.handleExtendWindowRight,

    // From tool instances sub-hook
    activeToolTemplateId: tools.activeToolTemplateId,

    // Local state
    jobs,
    jobItems,
    placements,
    hoveredDrop,
    paletteActive,
    activeDrag,
    mode,
    paletteView,
    paletteFocusJobId,
    paletteFocusToken,
    editingCell,
    editMode,
    paletteJobs,
    assignedJobs,
    editingJobId,
    setEditingJobId,
    editingPlacementJobId,
    setEditingPlacementJobId,
    editingPlannedStartJobId,
    setEditingPlannedStartJobId,

    // Handlers
    canDrop,
    clearInteractionState,
    handleModeChange,
    handlePaletteViewChange,
    handleGoToToday,
    handleCustomDateNavigate,
    handleNavigateToJobPlacement,
    handleGoToPlacedJobInPalette,
    handleUnplaceJob,
    handleRemovePlacedItem,
    handleEditJob,
    handleClearSelection,
    handleUpdatePlacement,
    handleResizeToolInstance,
    handleSavePlannedStart,
    handleTimelineDrop,
    handlePaletteDrop,
    handleTimelineSlotDragOver,
    handlePaletteDragOver,
    handlePaletteDragLeave,
    handlePlacedJobPointerStart,
    handlePlacedJobPointerHover,
    handlePlacedJobPointerLeave,
    handlePlacedJobPointerCommit,
    handlePlacedJobPointerCancel,
    handleJobDragStart,
    handleToolTemplateDragStart,
    handleToolTemplateDragEnd,
    handlePointerDragStart,
    handlePointerDragMove,
    handlePointerDragEnd,
    handlePointerDragCancel,
    handleSegmentClick,
    handleSegmentInputChange,
    handleSegmentInputKeyDown,
    commitSegmentHours,
  };
}

// ── Private Helpers ───────────────────────────────────────────────────────────

function isSameDragPayload(a: DragPayload | null, b: DragPayload | null) {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.kind === b.kind && a.jobId === b.jobId;
}
