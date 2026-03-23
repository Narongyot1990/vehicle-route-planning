"use client";

import { useCallback, useRef, useState } from "react";
import {
  getDurationHours,
  isPlacementConflict,
  type JobItem,
  type JobPlacement,
} from "@/lib/gantt";
import { TOOLBOX_TEMPLATES } from "@/features/gantt/constants";
import type { Job } from "@/features/gantt/types/job";
import { VEHICLE_BLOCK_BRANCH } from "@/features/gantt/hooks/useVehicleBlocks";

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Manages toolbox-spawned dummy blocks (PM, No driver, No job) on the timeline.
 * These are ephemeral JobItems not synced to the backend.
 * Extracted from the monolith useGanttChartState.
 */
export function useToolInstances() {
  const [toolInstances, setToolInstances] = useState<JobItem[]>([]);
  const [activeToolTemplateId, setActiveToolTemplateId] = useState<string | null>(null);
  const [toolDragJobId, setToolDragJobId] = useState<string | null>(null);
  const pendingToolDragJobIdRef = useRef<string | null>(null);
  const pendingToolDragInstanceRef = useRef<JobItem | null>(null);

  const findToolTemplate = (templateId: string) =>
    TOOLBOX_TEMPLATES.find((template) => template.id === templateId);

  const buildToolInstance = useCallback((templateId: string): JobItem | null => {
    const template = findToolTemplate(templateId);
    if (!template) return null;

    const nextJobId = `tool-instance-${templateId}-${Date.now()}`;
    return {
      ...template,
      id: nextJobId,
      segments: template.segments.map((segment) => ({
        ...segment,
        id: `${nextJobId}-${segment.id}`,
      })),
    } satisfies JobItem;
  }, []);

  const upsertToolInstance = useCallback((nextToolInstance: JobItem) => {
    setToolInstances((current) => {
      const exists = current.some((job) => job.id === nextToolInstance.id);
      if (exists) return current;
      return [...current, nextToolInstance];
    });
  }, []);

  const removeToolInstance = useCallback((jobId: string) => {
    setToolInstances((current) => current.filter((job) => job.id !== jobId));
  }, []);

  const handleResizeToolInstance = useCallback((
    jobId: string,
    nextDurationHours: number,
    jobItems: JobItem[],
    placements: JobPlacement[],
    findPlacement: (jobId: string) => JobPlacement | undefined
  ): boolean => {
    const toolInstance = toolInstances.find((job) => job.id === jobId);
    if (!toolInstance || toolInstance.origin !== "tool" || toolInstance.segments.length !== 1) {
      return false;
    }

    const placement = findPlacement(jobId);
    if (!placement) return false;

    const normalizedDurationHours = Math.max(1, Math.round(nextDurationHours));
    if (normalizedDurationHours === toolInstance.segments[0].durationHours) return true;

    const blockedByConflict = isPlacementConflict(
      jobItems, placements, jobId, placement.vehicleId, placement.startIndex, normalizedDurationHours
    );
    if (blockedByConflict) return false;

    setToolInstances((current) =>
      current.map((job) =>
        job.id === jobId
          ? { ...job, segments: [{ ...job.segments[0], durationHours: normalizedDurationHours }] }
          : job
      )
    );

    return true;
  }, [toolInstances]);

  const cleanupPendingToolDrag = useCallback((jobId: string | null) => {
    pendingToolDragJobIdRef.current = null;
    pendingToolDragInstanceRef.current = null;

    if (!jobId) {
      setActiveToolTemplateId(null);
      return;
    }

    removeToolInstance(jobId);
    setToolDragJobId(null);
    setActiveToolTemplateId(null);
  }, [removeToolInstance]);

  return {
    toolInstances,
    activeToolTemplateId,
    toolDragJobId,
    pendingToolDragJobIdRef,
    pendingToolDragInstanceRef,
    setActiveToolTemplateId,
    setToolDragJobId,
    buildToolInstance,
    upsertToolInstance,
    removeToolInstance,
    handleResizeToolInstance,
    cleanupPendingToolDrag,
  };
}

// ── Helper: convert tool JobItem to palette-compatible Job ─────────────────

export function toolItemToPaletteJob(toolItem: JobItem, plannedStart: number): Job {
  return {
    id: toolItem.id,
    jobNumber: toolItem.title,
    status: "assigned",
    priority: "normal",
    directLeadTimeHours: getDurationHours(toolItem),
    routeTemplateId: undefined,
    stops: [],
    requiredVehicleTypes: [],
    assignmentStatus: "assigned",
    assignedVehiclePlate: undefined,
    assignedDriverName: undefined,
    plannedStart,
    branch: VEHICLE_BLOCK_BRANCH,
    customerName: "Vehicle Block",
    customerContact: "",
    customerPhone: "",
    createdAt: "",
    updatedAt: "",
    notes: toolItem.note,
  };
}

export type ToolInstancesState = ReturnType<typeof useToolInstances>;
