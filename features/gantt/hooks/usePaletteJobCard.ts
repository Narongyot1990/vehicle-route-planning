import { useState, useEffect, useRef, type DragEvent, type KeyboardEvent, type MouseEvent, type PointerEvent as ReactPointerEvent, type Ref } from "react";
import { jobToJobItem, getDurationHours, type JobItem } from "@/lib/gantt";
import type { Job } from "@/features/gantt/types/job";

export type PaletteJobCardProps = {
  job: Job;
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
  onPointerDragStart?: (jobId: string, event: ReactPointerEvent<HTMLElement>) => void;
  onPointerDragMove?: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerDragEnd?: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerDragCancel?: (event: ReactPointerEvent<HTMLElement>) => void;
};

const LONG_PRESS_DURATION = 300;

export function usePaletteJobCard(props: PaletteJobCardProps) {
  const {
    job, atLabel, editMode, isEditing, isEditingPlacement, isEditingPlannedStart,
    timelineOrigin, draggable, clickable, highlighted, cardRef, isDragging,
    onJobDragStart, onDragEnd, onNavigate, onUnplace, onStartEdit, onSaveEdit,
    onCancelEdit, onStartEditPlacement, onUpdatePlacement, onCancelEditPlacement,
    onStartEditPlannedStart, onSavePlannedStart, onCancelEditPlannedStart,
    onPointerDragStart, onPointerDragMove, onPointerDragEnd, onPointerDragCancel
  } = props;

  const [draft, setDraft] = useState<JobItem>(() => jobToJobItem(job));
  const displayTitle = job.routeName || draft.title;
  const [isPointerDragging, setIsPointerDragging] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!isEditing) {
      setDraft(jobToJobItem(job));
    }
  }, [job, isEditing]);

  const [placementDate, setPlacementDate] = useState("");
  const [placementHour, setPlacementHour] = useState(0);
  const [plannedDate, setPlannedDate] = useState("");
  const [plannedHour, setPlannedHour] = useState(0);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isEditingPlacement && timelineOrigin) {
      const target = new Date(timelineOrigin);
      target.setHours(target.getHours() + 0);
      const yyyy = target.getFullYear();
      const mm = String(target.getMonth() + 1).padStart(2, "0");
      const dd = String(target.getDate()).padStart(2, "0");
      setPlacementDate(`${yyyy}-${mm}-${dd}`);
      setPlacementHour(target.getHours());
    }
  }, [isEditingPlacement, atLabel, timelineOrigin]);

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

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    if (!draggable || editMode || isEditing || isEditingPlacement || isEditingPlannedStart) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    startPosRef.current = { x: event.clientX, y: event.clientY };

    longPressTimerRef.current = setTimeout(() => {
      setIsPointerDragging(true);
      onPointerDragStart?.(job.id, event);
    }, LONG_PRESS_DURATION);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isPointerDragging) {
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
    const confirmed = window.confirm(`Are you sure you want to delete \"${job.jobNumber}\"?`);
    if (!confirmed) return;
    onUnplace?.(job.id);
  };

  const handleEditClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setDraft(jobToJobItem(job));
    onStartEdit?.(job.id);
  };

  const handleCancelEdit = () => {
    setDraft(jobToJobItem(job));
    onCancelEdit?.();
  };

  const handleSaveEdit = () => onSaveEdit?.(draft);

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

  const handleCancelPlacement = () => onCancelEditPlacement?.();

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

  const handleCancelPlannedStart = () => onCancelEditPlannedStart?.();

  const totalDuration = getDurationHours(draft);
  const cardDraggable = draggable && !editMode && !isEditing && !isEditingPlacement && !isEditingPlannedStart;

  return {
    props,
    draft,
    displayTitle,
    isPointerDragging,
    placementDate, setPlacementDate,
    placementHour, setPlacementHour,
    plannedDate, setPlannedDate,
    plannedHour, setPlannedHour,
    totalDuration,
    cardDraggable,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel,
    handleDragStart,
    handleDragEnd,
    handleCardClick,
    handleCardKeyDown,
    handleUnplaceClick,
    handleEditClick,
    handleCancelEdit,
    handleSaveEdit,
    handleDraftTitleChange,
    handleSegmentLabelChange,
    handleSegmentHoursChange,
    handleAddSegment,
    handleRemoveSegment,
    handlePlacementAtClick,
    handleSavePlacement,
    handleCancelPlacement,
    handlePlannedStartClick,
    handleSavePlannedStart,
    handleCancelPlannedStart
  };
}

export type PaletteJobCardState = ReturnType<typeof usePaletteJobCard>;
