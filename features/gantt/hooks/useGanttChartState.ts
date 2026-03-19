"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent
} from "react";
import {
  buildDaysFromOffset,
  canDropJob,
  getDurationHours,
  HOURS,
  isPlacementConflict,
  parseDragPayload,
  type DragPayload,
  type JobItem,
  type JobPlacement
} from "@/lib/gantt";
import { INITIAL_JOBS, TOOLBOX_TEMPLATES } from "@/features/gantt/constants";

export type InteractionMode = "move" | "edit";

export type EditingCell = {
  jobId: string;
  segmentId: string;
  value: string;
};

export type PaletteView = "unassigned" | "assigned";

const INITIAL_WINDOW_START_DAY_OFFSET = -30;
const INITIAL_WINDOW_DAY_COUNT = 90;
const WINDOW_EXTEND_DAYS = 14;

export function useGanttChartState(vehicles: string[]) {
  const timelineOrigin = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);

  const [windowStartDayOffset, setWindowStartDayOffset] = useState(INITIAL_WINDOW_START_DAY_OFFSET);
  const [windowDayCount, setWindowDayCount] = useState(INITIAL_WINDOW_DAY_COUNT);

  const days = useMemo(
    () => buildDaysFromOffset(timelineOrigin, windowStartDayOffset, windowDayCount),
    [timelineOrigin, windowStartDayOffset, windowDayCount]
  );

  const windowStartHour = windowStartDayOffset * HOURS.length;
  const displayTotalHours = windowDayCount * HOURS.length;

  const [jobs, setJobs] = useState<JobItem[]>(INITIAL_JOBS);
  const [placements, setPlacements] = useState<JobPlacement[]>(() => buildInitialPlacements(vehicles));
  const [hoveredDrop, setHoveredDrop] = useState<{ vehicleId: string; startIndex: number } | null>(null);
  const [paletteActive, setPaletteActive] = useState(false);
  const [activeDrag, setActiveDrag] = useState<DragPayload | null>(null);
  const [mode, setMode] = useState<InteractionMode>("move");
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [paletteView, setPaletteView] = useState<PaletteView>("unassigned");
  const [paletteFocusJobId, setPaletteFocusJobId] = useState<string | null>(null);
  const [paletteFocusToken, setPaletteFocusToken] = useState(0);
  const [toolDragJobId, setToolDragJobId] = useState<string | null>(null);
  const [activeToolTemplateId, setActiveToolTemplateId] = useState<string | null>(null);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [editingPlacementJobId, setEditingPlacementJobId] = useState<string | null>(null);
  const [editingPlannedStartJobId, setEditingPlannedStartJobId] = useState<string | null>(null);
  const placementsRef = useRef(placements);
  const toolDragJobIdRef = useRef<string | null>(null);

  const [jumpAbsoluteHour, setJumpAbsoluteHour] = useState(0);
  const [jumpToken, setJumpToken] = useState(0);
  const [jumpJobId, setJumpJobId] = useState<string | null>(null);
  const [jumpVehicleId, setJumpVehicleId] = useState<string | null>(null);
  const [jumpJobToken, setJumpJobToken] = useState(0);
  const [prependHours, setPrependHours] = useState(0);
  const [prependToken, setPrependToken] = useState(0);
  const [hourWidth, setHourWidth] = useState(44);
  const [initializedJump, setInitializedJump] = useState(false);

  const editMode = mode === "edit";
  const findJob = (jobId: string) => jobs.find((job) => job.id === jobId);
  const findPlacement = (jobId: string) => placements.find((placement) => placement.jobId === jobId);
  const findToolTemplate = (templateId: string) => TOOLBOX_TEMPLATES.find((template) => template.id === templateId);
  const paletteJobs = jobs.filter((job) => job.origin === "pool" && !findPlacement(job.id));
  const assignedJobs = placements
    .map((placement) => {
      const job = findJob(placement.jobId);
      if (!job) {
        return null;
      }

      return {
        job,
        placement,
        atLabel: formatAbsoluteHourLabel(timelineOrigin, placement.startIndex)
      };
    })
    .filter((item): item is { job: JobItem; placement: JobPlacement; atLabel: string } => item !== null);

  useEffect(() => {
    placementsRef.current = placements;
  }, [placements]);

  useEffect(() => {
    toolDragJobIdRef.current = toolDragJobId;
  }, [toolDragJobId]);

  const requestJumpToAbsoluteHour = (targetAbsoluteHour: number) => {
    const targetDayOffset = Math.floor(targetAbsoluteHour / HOURS.length);

    if (targetDayOffset < windowStartDayOffset || targetDayOffset >= windowStartDayOffset + windowDayCount) {
      const nextStart = targetDayOffset - 7;
      setWindowStartDayOffset(nextStart);
      setWindowDayCount(INITIAL_WINDOW_DAY_COUNT);
    }

    setJumpAbsoluteHour(targetAbsoluteHour);
    setJumpToken((current) => current + 1);
  };

  useEffect(() => {
    if (initializedJump) {
      return;
    }

    requestJumpToAbsoluteHour(0);
    setInitializedJump(true);
  }, [initializedJump]);

  const toDisplayIndex = (absoluteHourIndex: number) => {
    return absoluteHourIndex - windowStartHour;
  };

  const toAbsoluteIndex = (displayHourIndex: number) => {
    return windowStartHour + displayHourIndex;
  };

  const canDrop = (vehicleId: string, startIndex: number, payload: DragPayload | null) => {
    return canDropJob(jobs, placements, vehicleId, startIndex, payload);
  };

  const clearInteractionState = () => {
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
    setJumpJobId(null);
    setJumpVehicleId(null);
    requestJumpToAbsoluteHour(0);
    clearInteractionState();
  };

  const handlePaletteViewChange = (nextView: PaletteView) => {
    setPaletteView(nextView);
  };

  const handleCustomDateNavigate = (dateValue: string) => {
    if (!dateValue) {
      return;
    }

    const targetDate = new Date(`${dateValue}T00:00:00`);
    targetDate.setHours(0, 0, 0, 0);
    const diffMs = targetDate.getTime() - timelineOrigin.getTime();
    const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
    setJumpJobId(null);
    setJumpVehicleId(null);
    requestJumpToAbsoluteHour(diffHours);
    clearInteractionState();
  };

  const handleNavigateToJobPlacement = (jobId: string) => {
    const placement = findPlacement(jobId);
    if (!placement) {
      return;
    }

    setJumpJobId(jobId);
    setJumpVehicleId(placement.vehicleId);
    setJumpJobToken((current) => current + 1);
    requestJumpToAbsoluteHour(placement.startIndex);
    clearInteractionState();
  };

  const handleGoToPlacedJobInPalette = (jobId: string) => {
    setPaletteView("assigned");
    setPaletteFocusJobId(jobId);
    setPaletteFocusToken((current) => current + 1);
  };

  const handleUnplaceJob = (jobId: string) => {
    const job = findJob(jobId);

    setPlacements((current) => current.filter((placement) => placement.jobId !== jobId));

    if (job?.origin === "tool") {
      setJobs((current) => current.filter((currentJob) => currentJob.id !== jobId));
    }
  };

  const handleEditJob = (updatedJob: JobItem) => {
    setJobs((current) =>
      current.map((job) => (job.id === updatedJob.id ? updatedJob : job))
    );
    setEditingJobId(null);
  };

  const handleUpdatePlacement = (jobId: string, newStartIndex: number) => {
    const currentPlacement = placements.find((p) => p.jobId === jobId);
    if (!currentPlacement) {
      setEditingPlacementJobId(null);
      return;
    }

    const job = findJob(jobId);
    if (!job) {
      setEditingPlacementJobId(null);
      return;
    }

    const durationHours = getDurationHours(job);
    const hasConflict = isPlacementConflict(
      jobs,
      placements,
      jobId,
      currentPlacement.vehicleId,
      newStartIndex,
      durationHours
    );

    if (hasConflict) {
      setEditingPlacementJobId(null);
      return;
    }

    setPlacements((current) =>
      current.map((placement) =>
        placement.jobId === jobId ? { ...placement, startIndex: newStartIndex } : placement
      )
    );
    setEditingPlacementJobId(null);
  };

  const handleSavePlannedStart = (jobId: string, plannedStart: number) => {
    setJobs((current) =>
      current.map((job) =>
        job.id === jobId ? { ...job, plannedStart } : job
      )
    );
    setEditingPlannedStartJobId(null);
  };

  const handleClearSelection = () => {
    setJumpJobId(null);
    setJumpVehicleId(null);
    setPaletteFocusJobId(null);
  };

  const handleExtendWindowLeft = () => {
    const addedHours = WINDOW_EXTEND_DAYS * HOURS.length;
    setWindowStartDayOffset((current) => current - WINDOW_EXTEND_DAYS);
    setWindowDayCount((current) => current + WINDOW_EXTEND_DAYS);
    setPrependHours(addedHours);
    setPrependToken((current) => current + 1);
  };

  const handleExtendWindowRight = () => {
    setWindowDayCount((current) => current + WINDOW_EXTEND_DAYS);
  };

  const buildJobDragPayload = (jobId: string) => {
    return { kind: "job", jobId } satisfies DragPayload;
  };

  const buildToolInstance = (templateId: string) => {
    const template = findToolTemplate(templateId);
    if (!template) {
      return null;
    }

    const nextJobId = `tool-instance-${templateId}-${Date.now()}`;
    return {
      ...template,
      id: nextJobId,
      segments: template.segments.map((segment) => ({
        ...segment,
        id: `${nextJobId}-${segment.id}`
      }))
    } satisfies JobItem;
  };

  const cleanupPendingToolDrag = (jobId: string | null) => {
    if (!jobId) {
      setActiveToolTemplateId(null);
      return;
    }

    const placement = placementsRef.current.find((currentPlacement) => currentPlacement.jobId === jobId);
    if (!placement) {
      setJobs((current) => current.filter((job) => job.id !== jobId));
    }

    setToolDragJobId(null);
    setActiveToolTemplateId(null);
  };

  const getDragPayload = (event: DragEvent<HTMLElement>) => {
    return (
      parseDragPayload(event.dataTransfer.getData("application/json")) ??
      parseDragPayload(event.dataTransfer.getData("text/plain")) ??
      activeDrag
    );
  };

  const commitSegmentHours = (jobId: string, segmentId: string, rawValue: string) => {
    const nextHours = Number.parseFloat(rawValue);
    if (!Number.isFinite(nextHours) || nextHours <= 0) {
      setEditingCell(null);
      return;
    }

    const job = findJob(jobId);
    if (!job) {
      setEditingCell(null);
      return;
    }

    const nextJob: JobItem = {
      ...job,
      segments: job.segments.map((segment) =>
        segment.id === segmentId ? { ...segment, durationHours: nextHours } : segment
      )
    };

    const placement = findPlacement(jobId);
    if (placement) {
      const nextDuration = getDurationHours(nextJob);
      const blockedByConflict = isPlacementConflict(
        jobs,
        placements,
        jobId,
        placement.vehicleId,
        placement.startIndex,
        nextDuration
      );

      if (blockedByConflict) {
        setEditingCell(null);
        return;
      }
    }

    setJobs((current) => current.map((currentJob) => (currentJob.id === jobId ? nextJob : currentJob)));
    setEditingCell(null);
  };

  const handleTimelineDrop = (vehicleId: string, displayHourIndex: number, event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (editMode) {
      return;
    }

    const payload = getDragPayload(event);
    const startIndex = toAbsoluteIndex(displayHourIndex);

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

    if (payload.jobId === toolDragJobId) {
      setToolDragJobId(null);
      setActiveToolTemplateId(null);
    }

    clearInteractionState();
  };

  const handlePaletteDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (editMode) {
      return;
    }

    const payload = getDragPayload(event);
    if (!payload) {
      clearInteractionState();
      return;
    }

    if (payload.jobId === toolDragJobId) {
      setJobs((current) => current.filter((job) => job.id !== payload.jobId));
      setToolDragJobId(null);
      setActiveToolTemplateId(null);
      clearInteractionState();
      return;
    }

    setPlacements((current) => current.filter((placement) => placement.jobId !== payload.jobId));
    clearInteractionState();
  };

  const handleTimelineSlotDragOver = (vehicleId: string, displayHourIndex: number, event: DragEvent<HTMLButtonElement>) => {
    if (editMode) {
      return;
    }

    event.preventDefault();
    const payload = getDragPayload(event);
    setActiveDrag(payload);
    setPaletteActive(false);
    setHoveredDrop({
      vehicleId,
      startIndex: toAbsoluteIndex(displayHourIndex)
    });
  };

  const handlePaletteDragOver = (event: DragEvent<HTMLElement>) => {
    if (editMode) {
      return;
    }

    event.preventDefault();
    setPaletteActive(true);
    setHoveredDrop(null);
  };

  const handlePaletteDragLeave = () => {
    setPaletteActive(false);
  };

  const handlePlacedJobPointerStart = (jobId: string) => {
    if (editMode) {
      return;
    }

    setActiveDrag(buildJobDragPayload(jobId));
    setPaletteActive(false);
    setHoveredDrop(null);
  };

  const handlePlacedJobPointerHover = (vehicleId: string, startIndex: number) => {
    if (editMode || !activeDrag) {
      return;
    }

    setPaletteActive(false);
    setHoveredDrop({ vehicleId, startIndex });
  };

  const handlePlacedJobPointerLeave = () => {
    if (editMode) {
      return;
    }

    setHoveredDrop(null);
    setPaletteActive(false);
  };

  const handlePlacedJobPointerCommit = (vehicleId: string, startIndex: number) => {
    if (editMode) {
      return;
    }

    if (!activeDrag || !canDrop(vehicleId, startIndex, activeDrag)) {
      clearInteractionState();
      return;
    }

    setPlacements((current) =>
      current.map((placement) =>
        placement.jobId === activeDrag.jobId ? { ...placement, vehicleId, startIndex } : placement
      )
    );
    clearInteractionState();
  };

  const handlePlacedJobPointerCancel = () => {
    clearInteractionState();
  };

  const handleJobDragStart = (jobId: string, event: DragEvent<HTMLElement>) => {
    if (editMode) {
      event.preventDefault();
      return;
    }

    const payload = buildJobDragPayload(jobId);
    const rawPayload = JSON.stringify(payload);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/json", rawPayload);
    event.dataTransfer.setData("text/plain", rawPayload);
    setActiveDrag(payload);
  };

  const handleToolTemplateDragStart = (templateId: string, event: DragEvent<HTMLElement>) => {
    if (editMode) {
      event.preventDefault();
      return;
    }

    const nextToolInstance = buildToolInstance(templateId);
    if (!nextToolInstance) {
      event.preventDefault();
      return;
    }

    const payload = buildJobDragPayload(nextToolInstance.id);
    const rawPayload = JSON.stringify(payload);

    setJobs((current) => [...current, nextToolInstance]);
    setToolDragJobId(nextToolInstance.id);
    setActiveToolTemplateId(templateId);
    setActiveDrag(payload);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/json", rawPayload);
    event.dataTransfer.setData("text/plain", rawPayload);
  };

  const handleToolTemplateDragEnd = () => {
    cleanupPendingToolDrag(toolDragJobIdRef.current);
    clearInteractionState();
  };

  const handleSegmentClick = (jobId: string, segmentId: string, durationHours: number) => {
    if (!editMode) {
      return;
    }

    setEditingCell({
      jobId,
      segmentId,
      value: String(durationHours)
    });
  };

  const handleSegmentInputChange = (value: string) => {
    setEditingCell((current) =>
      current
        ? { ...current, value: value.replace(/[^0-9.]/g, "") }
        : current
    );
  };

  const handleSegmentInputKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
    jobId: string,
    segmentId: string,
    value: string
  ) => {
    if (event.key === "Enter") {
      commitSegmentHours(jobId, segmentId, value);
    }

    if (event.key === "Escape") {
      setEditingCell(null);
    }
  };

  return {
    days,
    displayTotalHours,
    windowStartHour,
    jobs,
    placements,
    hoveredDrop,
    paletteActive,
    activeDrag,
    mode,
    paletteView,
    paletteFocusJobId,
    paletteFocusToken,
    activeToolTemplateId,
    jumpAbsoluteHour,
    jumpToken,
    jumpJobId,
    jumpVehicleId,
    jumpJobToken,
    prependHours,
    prependToken,
    hourWidth,
    editingCell,
    editMode,
    paletteJobs,
    assignedJobs,
    canDrop,
    toDisplayIndex,
    toAbsoluteIndex,
    clearInteractionState,
    setHourWidth,
    handleModeChange,
    handlePaletteViewChange,
    handleGoToToday,
    handleCustomDateNavigate,
    handleNavigateToJobPlacement,
    handleGoToPlacedJobInPalette,
    handleUnplaceJob,
    handleEditJob,
    handleClearSelection,
    editingJobId,
    setEditingJobId,
    editingPlacementJobId,
    setEditingPlacementJobId,
    handleUpdatePlacement,
    handleSavePlannedStart,
    editingPlannedStartJobId,
    setEditingPlannedStartJobId,
    timelineOrigin,
    handleExtendWindowLeft,
    handleExtendWindowRight,
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
    handleSegmentClick,
    handleSegmentInputChange,
    handleSegmentInputKeyDown,
    commitSegmentHours
  };
}

function formatAbsoluteHourLabel(origin: Date, absoluteHourIndex: number) {
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

function buildInitialPlacements(vehicles: string[]): JobPlacement[] {
  const firstVehicle = vehicles[0];
  const secondVehicle = vehicles[1] ?? firstVehicle;

  if (!firstVehicle) {
    return [];
  }

  return [
    { jobId: "job-002", vehicleId: firstVehicle, startIndex: 9 },
    { jobId: "job-003", vehicleId: secondVehicle, startIndex: 30 }
  ];
}
