"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { JobItem } from "@/lib/gantt";
import type { VehicleBlock, VehicleBlockStatus, VehicleBlockType } from "@/lib/types";
import type { Job } from "@/features/gantt/types/job";
import type { SaveIndicatorState } from "@/features/gantt/hooks/useJobs";

export const VEHICLE_BLOCK_BRANCH = "BLOCKS";

function formatSaveIndicatorTime(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function buildPlannedStartFields(plannedStart: number) {
  const origin = new Date();
  origin.setHours(0, 0, 0, 0);

  const target = new Date(origin);
  target.setHours(target.getHours() + plannedStart);

  const yyyy = target.getFullYear();
  const mm = String(target.getMonth() + 1).padStart(2, "0");
  const dd = String(target.getDate()).padStart(2, "0");
  const hh = String(target.getHours()).padStart(2, "0");
  const min = String(target.getMinutes()).padStart(2, "0");

  return {
    plannedStart,
    plannedStartDate: `${yyyy}-${mm}-${dd}`,
    plannedStartTime: `${hh}:${min}`,
  };
}

function inferBlockTypeFromTitle(title: string): VehicleBlockType {
  const normalized = title.trim().toLowerCase();
  if (normalized === "pm") {
    return "pm";
  }
  if (normalized.includes("driver")) {
    return "no_driver";
  }
  return "no_job";
}

function showSaveIndicator(
  setSaveIndicator: (nextState: SaveIndicatorState) => void,
  kind: SaveIndicatorState["kind"],
  message: string,
) {
  setSaveIndicator({
    kind,
    message,
    timeLabel: formatSaveIndicatorTime(new Date()),
    updatedAtMs: Date.now(),
  });
}

export function isVehicleBlockJob(job: Job) {
  return job.branch === VEHICLE_BLOCK_BRANCH;
}

export function vehicleBlockToPlanningJob(block: VehicleBlock): Job {
  const isActive = block.status === "active" && block.vehiclePlate && block.plannedStart != null;

  return {
    id: block.id,
    jobNumber: block.title,
    status: "assigned",
    priority: "normal",
    stops: [],
    directLeadTimeHours: block.durationHours,
    routeName: block.title,
    requiredVehicleTypes: [],
    assignmentStatus: isActive ? "assigned" : "unassigned",
    assignedVehiclePlate: isActive ? block.vehiclePlate : undefined,
    assignedDriverName: undefined,
    plannedStart: isActive ? block.plannedStart : undefined,
    branch: VEHICLE_BLOCK_BRANCH,
    customerName: "Vehicle Block",
    customerContact: "",
    customerPhone: "",
    createdAt: block.createdAt,
    updatedAt: block.updatedAt,
    notes: block.reason,
  };
}

function blockJobToPayload(job: Job): {
  blockType: VehicleBlockType;
  title: string;
  reason?: string;
  vehiclePlate: string | null;
  durationHours: number;
  status: VehicleBlockStatus;
  plannedStart: number;
  plannedStartDate: string;
  plannedStartTime: string;
} {
  const isActive = job.assignedVehiclePlate && job.plannedStart != null;
  const title = job.routeName?.trim() || job.jobNumber.trim() || "Vehicle Block";

  return {
    blockType: inferBlockTypeFromTitle(title),
    title,
    reason: job.notes,
    vehiclePlate: isActive ? (job.assignedVehiclePlate ?? null) : null,
    durationHours: Math.max(1, Math.round(job.directLeadTimeHours ?? 1)),
    status: isActive ? "active" : "removed",
    ...(buildPlannedStartFields(job.plannedStart ?? 0)),
  };
}

export function useVehicleBlocks() {
  const [blocks, setBlocks] = useState<VehicleBlock[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveIndicator, setSaveIndicator] = useState<SaveIndicatorState>({
    kind: "idle",
    message: "No save yet",
    timeLabel: "--:--",
    updatedAtMs: 0,
  });
  const blocksRef = useRef<VehicleBlock[]>([]);
  const latestSaveRequestIdRef = useRef(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/vehicle-blocks");
      const data = await res.json();
      if (Array.isArray(data)) {
        blocksRef.current = data;
        setBlocks(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updateBlockJob = useCallback(async (updated: Job) => {
    const requestId = latestSaveRequestIdRef.current + 1;
    latestSaveRequestIdRef.current = requestId;
    const payload = {
      id: updated.id,
      ...blockJobToPayload(updated),
    };
    const optimisticStatus = payload.status;

    setBlocks((current) => {
      const nextBlocks: VehicleBlock[] = current.map((block) =>
        block.id === updated.id
          ? {
              ...block,
              blockType: payload.blockType,
              title: payload.title,
              reason: payload.reason,
              vehiclePlate: payload.vehiclePlate ?? undefined,
              plannedStart: payload.plannedStart,
              plannedStartDate: payload.plannedStartDate,
              plannedStartTime: payload.plannedStartTime,
              durationHours: payload.durationHours,
              status: optimisticStatus,
              updatedAt: new Date().toISOString(),
            }
          : block
      );
      blocksRef.current = nextBlocks;
      return nextBlocks;
    });

    showSaveIndicator(setSaveIndicator, "saving", "Saving");

    try {
      const res = await fetch("/api/vehicle-blocks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(
          errorData && typeof errorData.error === "string"
            ? errorData.error
            : "Auto-save failed"
        );
      }

      const savedBlock = await res.json().catch(() => null);
      if (!savedBlock || typeof savedBlock.id !== "string") {
        await load();
      } else {
        setBlocks((current) => {
          const nextBlocks: VehicleBlock[] = current.map((block) =>
            block.id === savedBlock.id ? { ...block, ...savedBlock } : block
          );
          blocksRef.current = nextBlocks;
          return nextBlocks;
        });
      }

      if (requestId === latestSaveRequestIdRef.current) {
        showSaveIndicator(setSaveIndicator, "success", "Saved");
      }
      return true;
    } catch (error) {
      await load();
      if (requestId === latestSaveRequestIdRef.current) {
        showSaveIndicator(
          setSaveIndicator,
          "error",
          error instanceof Error ? error.message : "Auto-save failed",
        );
      }
      return false;
    }
  }, [load]);

  const createBlockFromTemplate = useCallback(async (
    templateItem: JobItem,
    vehiclePlate: string,
    plannedStart: number,
  ) => {
    const payload = {
      ...blockJobToPayload({
        id: "",
        jobNumber: templateItem.title,
        status: "assigned",
        priority: "normal",
        stops: [],
        directLeadTimeHours: templateItem.segments.reduce((sum, segment) => sum + segment.durationHours, 0),
        routeName: templateItem.title,
        requiredVehicleTypes: [],
        assignmentStatus: "assigned",
        assignedVehiclePlate: vehiclePlate,
        assignedDriverName: undefined,
        plannedStart,
        branch: VEHICLE_BLOCK_BRANCH,
        customerName: "Vehicle Block",
        customerContact: "",
        customerPhone: "",
        createdAt: "",
        updatedAt: "",
        notes: templateItem.note,
      } satisfies Job),
    };

    showSaveIndicator(setSaveIndicator, "saving", "Saving");

    try {
      const res = await fetch("/api/vehicle-blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(
          errorData && typeof errorData.error === "string"
            ? errorData.error
            : "Failed to create vehicle block"
        );
      }

      const savedBlock = await res.json();
      setBlocks((current) => {
        const nextBlocks: VehicleBlock[] = [...current, savedBlock];
        blocksRef.current = nextBlocks;
        return nextBlocks;
      });
      showSaveIndicator(setSaveIndicator, "success", "Saved");
      return vehicleBlockToPlanningJob(savedBlock);
    } catch (error) {
      showSaveIndicator(
        setSaveIndicator,
        "error",
        error instanceof Error ? error.message : "Failed to create vehicle block",
      );
      return null;
    }
  }, []);

  const activeBlocks = blocks.filter((block) => block.status === "active");
  const blockJobs = activeBlocks.map(vehicleBlockToPlanningJob);

  return {
    blocks,
    activeBlocks,
    blockJobs,
    loading,
    saveIndicator,
    reload: load,
    updateBlockJob,
    createBlockFromTemplate,
  };
}
