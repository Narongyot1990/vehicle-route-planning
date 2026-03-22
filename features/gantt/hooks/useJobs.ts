"use client";

import { useState, useCallback, useEffect } from "react";
import type { Job, JobStatus, JobPriority } from "@/features/gantt/types/job";
import type { JobOrder } from "@/lib/types";
import { getStopColor } from "@/features/gantt/types/job";

// Convert JobOrder (new DB format) → Job (Gantt display format)
function jobOrderToJob(jo: JobOrder): Job {
  const hasStops = jo.routeSnapshot.stops && jo.routeSnapshot.stops.length > 0;

  return {
    id: jo.id,
    jobNumber: jo.jobNumber,
    status: jo.status,
    priority: jo.priority,
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
    assignedVehiclePlate: jo.vehiclePlate,
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
    plannedStart: jo.plannedStart,
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/joborders");
      const data = await res.json();
      if (Array.isArray(data)) setOrders(data);
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
    const res = await fetch("/api/joborders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: updated.id,
        status: updated.status,
        priority: updated.priority,
        vehiclePlate: updated.assignedVehiclePlate,
        driverName: updated.assignedDriverName,
        notes: updated.notes,
      }),
    });
    if (res.ok) load();
  }, [load]);

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

  const unplacedJobs = useCallback(() => filteredJobs().filter((j) => !j.assignedVehiclePlate), [filteredJobs]);
  const placedJobs = useCallback(() => filteredJobs().filter((j) => !!j.assignedVehiclePlate), [filteredJobs]);

  const stats = useCallback(() => ({
    total: jobs.length,
    draft: jobs.filter((j) => j.status === "draft").length,
    confirmed: jobs.filter((j) => j.status === "confirmed").length,
    assigned: jobs.filter((j) => j.status === "assigned").length,
    in_progress: jobs.filter((j) => j.status === "in_progress").length,
    completed: jobs.filter((j) => j.status === "completed").length,
    cancelled: jobs.filter((j) => j.status === "cancelled").length,
    unassigned: jobs.filter((j) => !j.assignedVehiclePlate).length,
  }), [jobs]);

  return {
    jobs,
    loading,
    filter,
    setFilter,
    createJob,
    updateJob,
    deleteJob,
    filteredJobs,
    unplacedJobs,
    placedJobs,
    stats,
    reload: load,
  };
}
