"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { Job, JobStatus, JobPriority } from "@/features/gantt/types/job";
import type { JobOrder, RouteStop } from "@/lib/types";
import { getStopColor } from "@/features/gantt/types/job";

type PlannedStartFields = Pick<JobOrder, "plannedStart" | "plannedStartDate" | "plannedStartTime">;
export type SaveIndicatorState = {
  kind: "idle" | "saving" | "success" | "error";
  message: string;
  timeLabel: string;
  updatedAtMs: number;
};

function formatSaveIndicatorTime(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function buildPlannedStartFields(plannedStart: number): PlannedStartFields {
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

function buildRouteSnapshotFromJob(order: JobOrder, updated: Job): JobOrder["routeSnapshot"] {
  const nextStops: RouteStop[] = updated.stops.map((stop, index) => {
    const originalStop = order.routeSnapshot.stops[index];
    const dwellHours = originalStop?.dwellHours ?? stop.dwellHours ?? 0;
    const totalHours = Math.max(stop.transitFromPrevHours, 0);

    return {
      label: stop.label,
      address: stop.address,
      contactName: stop.contactName,
      contactPhone: stop.contactPhone,
      dwellHours,
      transitHours: Math.max(totalHours - dwellHours, 0),
      order: index + 1,
    };
  });

  const totalDurationHours = updated.directLeadTimeHours
    ?? nextStops.reduce((sum, stop) => sum + stop.transitHours + stop.dwellHours, 0);

  return {
    name: updated.routeName ?? order.routeSnapshot.name,
    stops: nextStops,
    totalDurationHours,
    requiredVehicleTypes: updated.requiredVehicleTypes,
  };
}

function buildFallbackOrderFromJob(updated: Job): JobOrder {
  return {
    id: updated.id,
    jobNumber: updated.jobNumber,
    customerId: updated.customerName,
    routeId: updated.routeTemplateId ?? updated.id,
    routeSnapshot: {
      name: updated.routeName ?? updated.jobNumber,
      stops: [],
      totalDurationHours: updated.directLeadTimeHours ?? 0,
      requiredVehicleTypes: updated.requiredVehicleTypes,
    },
    includeReturnTrip: false,
    plannedStartDate: "",
    plannedStartTime: "00:00",
    plannedStart: updated.plannedStart ?? 0,
    assignmentStatus: updated.assignmentStatus,
    vehiclePlate: updated.assignedVehiclePlate,
    driverName: updated.assignedDriverName,
    trailerPlate: updated.trailerPlate,
    requireTrailer: updated.requireTrailer,
    status: updated.status,
    priority: updated.priority,
    quotedPrice: updated.quotedPrice,
    currency: updated.currency,
    notes: updated.notes,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  };
}

function mergeUpdatedJobIntoOrder(order: JobOrder, updated: Job): JobOrder {
  const scheduleFields = updated.plannedStart != null
    ? buildPlannedStartFields(updated.plannedStart)
    : {};

  return {
    ...order,
    routeSnapshot: buildRouteSnapshotFromJob(order, updated),
    ...scheduleFields,
    status: updated.status,
    priority: updated.priority,
    assignmentStatus: updated.assignmentStatus,
    vehiclePlate: updated.assignedVehiclePlate,
    driverName: updated.assignedDriverName,
    notes: updated.notes,
    updatedAt: new Date().toISOString(),
  };
}

// Convert JobOrder (new DB format) → Job (Gantt display format)
function jobOrderToJob(jo: JobOrder): Job {
  const hasStops = jo.routeSnapshot.stops && jo.routeSnapshot.stops.length > 0;

  return {
    id: jo.id,
    jobNumber: jo.jobNumber,
    status: jo.status,
    priority: jo.priority,
    assignmentStatus:
      jo.assignmentStatus ?? (jo.vehiclePlate && jo.plannedStart != null ? "assigned" : "unassigned"),
    stops: hasStops
      ? jo.routeSnapshot.stops.map((s, i) => ({
          id: s.order ? String(s.order) : String(i),
          label: s.label,
          address: s.address,
          contactName: s.contactName,
          contactPhone: s.contactPhone,
          scheduledTime: "08:00",
          timeWindowStart: "08:00",
          timeWindowEnd: "18:00",
          dwellHours: s.dwellHours,
          transitFromPrevHours: (s.transitHours ?? 0) + (s.dwellHours ?? 0),
          order: s.order,
          status: "pending" as const,
          color: getStopColor(s.address || `Stop ${i}`, i),
        }))
      : [],
    // Only set directLeadTimeHours for truly direct jobs (no stops)
    directLeadTimeHours: hasStops ? undefined : jo.routeSnapshot.totalDurationHours,
    routeTemplateId: jo.routeId,
    routeName: jo.routeSnapshot.name,
    requiredVehicleTypes: jo.routeSnapshot.requiredVehicleTypes ?? [],
    trailerPlate: jo.trailerPlate,
    requireTrailer: jo.requireTrailer,
    assignedVehiclePlate: jo.vehiclePlate ?? undefined,
    assignedDriverName: jo.driverName,
    branch: "",
    customerName: jo.customerId,
    customerContact: "",
    customerPhone: "",
    quotedPrice: jo.quotedPrice,
    currency: jo.currency,
    createdAt: jo.createdAt,
    updatedAt: jo.updatedAt,
    notes: jo.notes,
    plannedStart: jo.plannedStart ?? undefined,
  };
}

export type JobFilter = {
  status?: JobStatus[];
  search?: string;
  priority?: JobPriority[];
};

export function useJobs() {
  const [orders, setOrders] = useState<JobOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<JobFilter>({});
  const [saveIndicator, setSaveIndicator] = useState<SaveIndicatorState>({
    kind: "idle",
    message: "No save yet",
    timeLabel: "--:--",
    updatedAtMs: 0,
  });
  const ordersRef = useRef<JobOrder[]>([]);
  const latestSaveRequestIdRef = useRef(0);

  const showSaveIndicator = useCallback((
    kind: SaveIndicatorState["kind"],
    message: string,
  ) => {
    setSaveIndicator({
      kind,
      message,
      timeLabel: formatSaveIndicatorTime(new Date()),
      updatedAtMs: Date.now(),
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/joborders");
      const data = await res.json();
      if (Array.isArray(data)) {
        ordersRef.current = data;
        setOrders(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Convert to Job[] for Gantt compatibility
  const jobs: Job[] = orders.map(jobOrderToJob);

  const createJob = useCallback(async (job: Job) => {
    // Not used in new flow — jobs come from joborders
  }, []);

  const updateJob = useCallback(async (updated: Job) => {
    const requestId = latestSaveRequestIdRef.current + 1;
    latestSaveRequestIdRef.current = requestId;
    const sourceOrder = ordersRef.current.find((order) => order.id === updated.id) ?? buildFallbackOrderFromJob(updated);

    const payload: Record<string, unknown> = {
      id: updated.id,
      routeSnapshot: buildRouteSnapshotFromJob(sourceOrder, updated),
      status: updated.status,
      priority: updated.priority,
      assignmentStatus: updated.assignmentStatus,
      vehiclePlate: updated.assignedVehiclePlate ?? null,
    };

    if (updated.plannedStart != null) {
      Object.assign(payload, buildPlannedStartFields(updated.plannedStart));
    }

    if (updated.assignedDriverName !== undefined) {
      payload.driverName = updated.assignedDriverName;
    }

    if (updated.notes !== undefined) {
      payload.notes = updated.notes;
    }

    setOrders((current) => {
      const nextOrders = current.map((order) => (
        order.id === updated.id
          ? mergeUpdatedJobIntoOrder(order, updated)
          : order
      ));
      ordersRef.current = nextOrders;
      return nextOrders;
    });

    showSaveIndicator("saving", "Saving");

    try {
      const res = await fetch("/api/joborders", {
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

      const savedOrder = await res.json().catch(() => null);
      if (!savedOrder || typeof savedOrder.id !== "string") {
        load();
      } else {
        setOrders((current) => {
          const nextOrders = current.map((order) => (
            order.id === savedOrder.id
              ? { ...order, ...savedOrder }
              : order
          ));
          ordersRef.current = nextOrders;
          return nextOrders;
        });
      }

      if (requestId === latestSaveRequestIdRef.current) {
        showSaveIndicator("success", "Saved");
      }
      return true;
    } catch (error) {
      load();
      if (requestId !== latestSaveRequestIdRef.current) {
        return false;
      }

      showSaveIndicator(
        "error",
        error instanceof Error ? error.message : "Auto-save failed",
      );
      return false;
    }
  }, [load, showSaveIndicator]);

  const deleteJob = useCallback(async (jobId: string) => {
    await fetch(`/api/joborders?id=${jobId}`, { method: "DELETE" });
    load();
  }, [load]);

  const filteredJobs = useCallback(() => {
    return jobs.filter((job) => {
      if (filter.status && filter.status.length > 0 && !filter.status.includes(job.status)) return false;
      if (filter.priority && filter.priority.length > 0 && !filter.priority.includes(job.priority)) return false;
      if (filter.search) {
        const q = filter.search.toLowerCase();
        if (!job.jobNumber.toLowerCase().includes(q) && !job.customerName.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [jobs, filter]);

  const unplacedJobs = useCallback(
    () => filteredJobs().filter((j) => j.assignmentStatus !== "assigned"),
    [filteredJobs]
  );
  const placedJobs = useCallback(
    () => filteredJobs().filter((j) => j.assignmentStatus === "assigned"),
    [filteredJobs]
  );

  const stats = useCallback(() => ({
    total: jobs.length,
    draft: jobs.filter((j) => j.status === "draft").length,
    confirmed: jobs.filter((j) => j.status === "confirmed").length,
    assigned: jobs.filter((j) => j.status === "assigned").length,
    in_progress: jobs.filter((j) => j.status === "in_progress").length,
    completed: jobs.filter((j) => j.status === "completed").length,
    cancelled: jobs.filter((j) => j.status === "cancelled").length,
    unassigned: jobs.filter((j) => j.assignmentStatus !== "assigned").length,
  }), [jobs]);

  return {
    jobs,
    loading,
    filter,
    setFilter,
    createJob,
    updateJob,
    deleteJob,
    saveIndicator,
    filteredJobs,
    unplacedJobs,
    placedJobs,
    stats,
    reload: load,
  };
}
