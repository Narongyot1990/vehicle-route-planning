"use client";

import { useState, useCallback, useEffect } from "react";
import type { JobOrder, JobOrderStatus, JobOrderPriority } from "@/lib/types";

export function useJobOrderEditForm(jobOrderId: string, onSaved: () => void, onClose: () => void) {
  const [jo, setJo] = useState<JobOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editable fields
  const [status, setStatus] = useState<JobOrderStatus>("draft");
  const [priority, setPriority] = useState<JobOrderPriority>("normal");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [driverName, setDriverName] = useState("");
  const [trailerPlate, setTrailerPlate] = useState("");
  const [plannedDate, setPlannedDate] = useState("");
  const [plannedTime, setPlannedTime] = useState("08:00");
  const [notes, setNotes] = useState("");
  const [quotedPrice, setQuotedPrice] = useState("");

  // Load the job order from API
  useEffect(() => {
    setLoading(true);
    fetch("/api/joborders")
      .then((r) => r.json())
      .then((data: JobOrder[]) => {
        const found = Array.isArray(data) ? data.find((j) => j.id === jobOrderId) : null;
        if (!found) {
          setError("ไม่พบ Job Order");
          return;
        }
        setJo(found);
        setStatus(found.status);
        setPriority(found.priority);
        setVehiclePlate(found.vehiclePlate ?? "");
        setDriverName(found.driverName ?? "");
        setTrailerPlate(found.trailerPlate ?? "");
        setPlannedDate(found.plannedStartDate);
        setPlannedTime(found.plannedStartTime);
        setNotes(found.notes ?? "");
        setQuotedPrice(found.quotedPrice != null ? String(found.quotedPrice) : "");
      })
      .catch(() => setError("โหลดข้อมูลไม่ได้"))
      .finally(() => setLoading(false));
  }, [jobOrderId]);

  const handleSave = useCallback(async () => {
    if (!jo) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/joborders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: jo.id,
          status,
          priority,
          vehiclePlate: vehiclePlate || undefined,
          driverName: driverName || undefined,
          trailerPlate: trailerPlate || undefined,
          plannedStartDate: plannedDate,
          plannedStartTime: plannedTime,
          notes: notes || undefined,
          quotedPrice: quotedPrice ? parseFloat(quotedPrice) : undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Save failed");
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }, [jo, status, priority, vehiclePlate, driverName, trailerPlate, plannedDate, plannedTime, notes, quotedPrice, onSaved, onClose]);

  // Estimated end time
  const estEnd = (() => {
    if (!jo || !plannedTime) return null;
    const [h, m] = plannedTime.split(":").map(Number);
    const endMins = h * 60 + m + Math.round(jo.routeSnapshot.totalDurationHours * 60);
    const endH = String(Math.floor(endMins / 60) % 24).padStart(2, "0");
    const endM = String(endMins % 60).padStart(2, "0");
    return `${endH}:${endM}`;
  })();

  return {
    jo,
    loading,
    saving,
    error,
    status, setStatus,
    priority, setPriority,
    vehiclePlate, setVehiclePlate,
    driverName, setDriverName,
    trailerPlate, setTrailerPlate,
    plannedDate, setPlannedDate,
    plannedTime, setPlannedTime,
    notes, setNotes,
    quotedPrice, setQuotedPrice,
    handleSave,
    estEnd,
  };
}
