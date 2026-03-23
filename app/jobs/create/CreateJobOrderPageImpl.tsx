"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Customer, Route } from "@/lib/types";
import { TRUCK_TYPE_OPTIONS } from "@/lib/truckTypes";

const TRAILER_TYPES = new Set(["6W", "10W", "Prime Mover"]);

type CreateMode = "bulk" | "single";

function createJobNumber(seed = Date.now()) {
  const now = new Date(seed);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `JO-${y}${m}${d}-${String(seed).slice(-5)}`;
}

function fmtHours(hours: number) {
  if (!Number.isFinite(hours) || hours <= 0) return "-";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h}h`;
  return `${m}m`;
}

function endTime(start: string, hours: number) {
  const [h, m] = start.split(":").map(Number);
  const total = h * 60 + m + Math.round(hours * 60);
  const normalized = ((total % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
}

export default function CreateJobOrderPageImpl() {
  const router = useRouter();
  const [mode, setMode] = useState<CreateMode>("bulk");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [createdCount, setCreatedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [truckType, setTruckType] = useState("");
  const [routeId, setRouteId] = useState("");
  const [selectedRouteIds, setSelectedRouteIds] = useState<string[]>([]);
  const [routeSearch, setRouteSearch] = useState("");
  const [includeReturnTrip, setIncludeReturnTrip] = useState(false);
  const [plannedDate, setPlannedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [plannedTime, setPlannedTime] = useState("08:00");
  const [requireTrailer, setRequireTrailer] = useState(false);
  const [trailerPlate, setTrailerPlate] = useState("");
  const [notes, setNotes] = useState("");
  const [jobNumber, setJobNumber] = useState("");

  useEffect(() => {
    setJobNumber(createJobNumber());
    fetch("/api/customers")
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data)) throw new Error();
        setCustomers(data);
      })
      .catch(() => setError("Unable to load customers"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setRouteId("");
    setTruckType("");
    setSelectedRouteIds([]);
    setRouteSearch("");
    setIncludeReturnTrip(false);
    setRequireTrailer(false);
    setTrailerPlate("");
    if (!customerId) return void setRoutes([]);
    setRoutesLoading(true);
    fetch(`/api/routes?customerId=${customerId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data)) throw new Error();
        setRoutes(data);
      })
      .catch(() => {
        setRoutes([]);
        setError("Unable to load routes for this customer");
      })
      .finally(() => setRoutesLoading(false));
  }, [customerId]);

  useEffect(() => {
    setRouteId("");
    setSelectedRouteIds([]);
    setRouteSearch("");
    setIncludeReturnTrip(false);
  }, [truckType]);

  useEffect(() => {
    if (!TRAILER_TYPES.has(truckType)) {
      setRequireTrailer(false);
      setTrailerPlate("");
    }
  }, [truckType]);

  const customer = customers.find((item) => item.id === customerId);
  const truckOptions = useMemo(() => {
    const fromRoutes = Array.from(new Set(routes.flatMap((route) => route.requiredVehicleTypes ?? [])));
    return fromRoutes.length ? TRUCK_TYPE_OPTIONS.filter((item) => fromRoutes.includes(item)) : TRUCK_TYPE_OPTIONS;
  }, [routes]);
  const filteredRoutes = useMemo(() => {
    const query = routeSearch.trim().toLowerCase();
    return routes.filter((route) => {
      const types = route.requiredVehicleTypes ?? [];
      const truckPass = !truckType || !types.length || types.includes(truckType);
      const queryPass = !query || route.name.toLowerCase().includes(query);
      return truckPass && queryPass;
    });
  }, [routeSearch, routes, truckType]);
  const route = filteredRoutes.find((item) => item.id === routeId) ?? routes.find((item) => item.id === routeId);
  const selectedRoutes = useMemo(() => routes.filter((item) => selectedRouteIds.includes(item.id)), [routes, selectedRouteIds]);
  const selectedRouteCount = selectedRoutes.length;
  const returnHours = includeReturnTrip && route?.returnInfo?.enabled ? (route.returnInfo.dwellHours ?? 0) + (route.returnInfo.transitHours ?? 0) : 0;
  const totalHours = route ? route.totalDurationHours + returnHours : 0;
  const bulkMaxHours = useMemo(() => {
    if (!selectedRoutes.length) return 0;
    return Math.max(
      ...selectedRoutes.map((item) => item.totalDurationHours + (
        includeReturnTrip && item.returnInfo?.enabled
          ? (item.returnInfo.dwellHours ?? 0) + (item.returnInfo.transitHours ?? 0)
          : 0
      ))
    );
  }, [includeReturnTrip, selectedRoutes]);
  const trailerEnabled = TRAILER_TYPES.has(truckType);
  const canSubmitSingle = Boolean(customerId && truckType && routeId && plannedDate);
  const canSubmitBulk = Boolean(customerId && truckType && selectedRouteCount > 0 && plannedDate);
  const canSubmit = mode === "bulk" ? canSubmitBulk : canSubmitSingle;
  const checklist = [
    { label: "Customer", done: Boolean(customer), value: customer?.name ?? "Choose customer" },
    { label: "Truck", done: Boolean(truckType), value: truckType || "Choose truck type" },
    {
      label: mode === "bulk" ? "Routes" : "Route",
      done: mode === "bulk" ? selectedRouteCount > 0 : Boolean(route),
      value: mode === "bulk" ? `${selectedRouteCount} selected` : route?.name ?? "Choose route",
    },
    { label: "Start", done: Boolean(plannedDate), value: plannedDate ? `${plannedDate} ${plannedTime}` : "Choose date" },
  ];
  const progress = Math.round((checklist.filter((item) => item.done).length / checklist.length) * 100);

  const toggleRouteSelection = useCallback((nextRouteId: string) => {
    setSelectedRouteIds((current) =>
      current.includes(nextRouteId) ? current.filter((item) => item !== nextRouteId) : [...current, nextRouteId]
    );
  }, []);

  const selectAllVisibleRoutes = useCallback(() => {
    setSelectedRouteIds((current) => {
      const merged = new Set(current);
      for (const item of filteredRoutes) merged.add(item.id);
      return Array.from(merged);
    });
  }, [filteredRoutes]);

  const clearSelectedRoutes = useCallback(() => {
    setSelectedRouteIds([]);
  }, []);

  const createJobPayload = useCallback(
    (selectedRoute: Route, seed: number, isSingle: boolean) => ({
      jobNumber: isSingle ? jobNumber : createJobNumber(seed),
      customerId,
      routeId: selectedRoute.id,
      includeReturnTrip: Boolean(includeReturnTrip && selectedRoute.returnInfo?.enabled),
      plannedStartDate: plannedDate,
      plannedStartTime: plannedTime,
      requireTrailer: isSingle && requireTrailer ? true : undefined,
      trailerPlate: isSingle && requireTrailer && trailerPlate ? trailerPlate : undefined,
      notes: notes || undefined,
    }),
    [customerId, includeReturnTrip, jobNumber, notes, plannedDate, plannedTime, requireTrailer, trailerPlate]
  );

  const postJobOrder = useCallback(async (payload: Record<string, unknown>) => {
    const res = await fetch("/api/joborders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.error ?? "Failed to create job order");
    }
    return res.json();
  }, []);

  const handleSingleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmitSingle || !route) return setError("Please complete customer, truck type, route, and start date");
    setSubmitting(true);
    setError(null);
    try {
      await postJobOrder(createJobPayload(route, Date.now(), true));
      setCreatedCount(1);
      setSuccess(true);
      setTimeout(() => router.push("/jobs"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create job order");
    } finally {
      setSubmitting(false);
    }
  }, [canSubmitSingle, createJobPayload, postJobOrder, route, router]);

  const handleBulkSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmitBulk) return setError("Please choose customer, truck type, date, time, and at least one route");
    setSubmitting(true);
    setError(null);
    const failedRouteIds: string[] = [];
    let successCount = 0;
    const baseSeed = Date.now();

    try {
      for (let index = 0; index < selectedRoutes.length; index += 1) {
        const selectedRoute = selectedRoutes[index];
        try {
          await postJobOrder(createJobPayload(selectedRoute, baseSeed + index, false));
          successCount += 1;
        } catch {
          failedRouteIds.push(selectedRoute.id);
        }
      }

      if (!failedRouteIds.length) {
        setCreatedCount(successCount);
        setSuccess(true);
        setTimeout(() => router.push("/jobs"), 1400);
        return;
      }

      const failedNames = selectedRoutes.filter((item) => failedRouteIds.includes(item.id)).map((item) => item.name);
      setSelectedRouteIds(failedRouteIds);
      setError(`Created ${successCount} jobs. Failed ${failedRouteIds.length}: ${failedNames.slice(0, 4).join(", ")}${failedNames.length > 4 ? "..." : ""}`);
    } finally {
      setSubmitting(false);
    }
  }, [canSubmitBulk, createJobPayload, postJobOrder, router, selectedRoutes]);

  if (success) {
    return (
      <div className="job-create-v2 job-create-v2--success">
        <div className="job-create-v2__success-card">
          <div className="job-create-v2__success-badge">
            <span>OK</span>
          </div>
          <h1>{createdCount > 1 ? `${createdCount} job orders created` : "Job order created"}</h1>
          <p>Returning to Jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="job-create-v2">
      <div className="job-create-v2__shell">
        <header className="job-create-v2__header">
          <div className="job-create-v2__header-main">
            <button type="button" className="job-create-v2__back job-create-v2__back--icon" onClick={() => router.push("/jobs")}>
              <span>Back</span>
            </button>
            <div className="job-create-v2__title">
              <span className="job-create-v2__eyebrow">New job</span>
              <h1>{mode === "bulk" ? "Quick Multi Create" : "Create Job Order"}</h1>
            </div>
          </div>
          <div className="job-create-v2__jobno">
            <span>Job No</span>
            <strong>{mode === "bulk" ? "Auto" : jobNumber}</strong>
          </div>
        </header>

        {loading ? (
          <div className="job-create-v2__loading">Loading customers...</div>
        ) : (
          <form className="job-create-v2__layout" onSubmit={mode === "bulk" ? handleBulkSubmit : handleSingleSubmit}>
            <div className="job-create-v2__top-strip">
              <div className="job-create-v2__status-strip">
                {checklist.map((item) => (
                  <div key={item.label} className={`job-create-v2__status-pill${item.done ? " is-done" : ""}`}>
                    <i />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
              <div className="job-create-v2__top-meta">
                <div className="job-create-v2__top-meta-item">
                  <span>{mode === "bulk" ? "Selected" : "ETA"}</span>
                  <strong>{mode === "bulk" ? `${selectedRouteCount} routes` : route ? endTime(plannedTime, totalHours) : "--:--"}</strong>
                </div>
                <div className="job-create-v2__top-meta-item">
                  <span>{mode === "bulk" ? "Longest" : "Duration"}</span>
                  <strong>{mode === "bulk" ? (selectedRouteCount ? fmtHours(bulkMaxHours) : "-") : route ? fmtHours(totalHours) : "-"}</strong>
                </div>
                <div className="job-create-v2__top-meta-item job-create-v2__top-meta-item--accent">
                  <strong>{progress}%</strong>
                </div>
              </div>
            </div>

            <div className="job-create-v2__main">
              <section className="job-create-v2__card">
                <div className="job-create-v2__section-head job-create-v2__section-head--compact">
                  <span>01</span>
                  <h2>Mode</h2>
                </div>
                <div className="job-create-v2__mode-switch">
                  <button type="button" className={`job-create-v2__mode-button${mode === "bulk" ? " is-active" : ""}`} onClick={() => setMode("bulk")}>
                    Quick Multi
                  </button>
                  <button type="button" className={`job-create-v2__mode-button${mode === "single" ? " is-active" : ""}`} onClick={() => setMode("single")}>
                    Single
                  </button>
                </div>
                <p className="job-create-v2__mini-note">
                  {mode === "bulk"
                    ? "Choose date and time once, then pick multiple routes."
                    : "Use single mode when you need one route with trailer details."}
                </p>
              </section>

              <section className="job-create-v2__card">
                <div className="job-create-v2__section-head job-create-v2__section-head--compact">
                  <span>02</span>
                  <h2>Customer</h2>
                </div>
                <div className="job-create-v2__grid">
                  <label className="job-create-v2__field">
                    <span>Customer *</span>
                    <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                      <option value="">Select customer</option>
                      {customers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                    </select>
                  </label>
                  <div className="job-create-v2__info">
                    <span className="job-create-v2__eyebrow">Details</span>
                    {customer ? (
                      <div className="job-create-v2__stack">
                        <div><strong>Contact</strong><span>{customer.contactName || "-"}</span></div>
                        <div><strong>Phone</strong><span>{customer.phone || "-"}</span></div>
                        <div><strong>Address</strong><span>{customer.address || "-"}</span></div>
                      </div>
                    ) : <p>Select customer</p>}
                  </div>
                </div>
              </section>

              <section className="job-create-v2__card">
                <div className="job-create-v2__section-head job-create-v2__section-head--compact">
                  <span>03</span>
                  <h2>Plan</h2>
                </div>
                <label className="job-create-v2__field">
                  <span>Truck type *</span>
                  <div className="job-create-v2__truck-grid">
                    {truckOptions.map((item) => (
                      <button key={item} type="button" className={truckType === item ? "is-active" : ""} disabled={!customerId} onClick={() => setTruckType(item)}>
                        {item}
                      </button>
                    ))}
                  </div>
                </label>
                <div className="job-create-v2__grid">
                  <label className="job-create-v2__field">
                    <span>Start date *</span>
                    <input type="date" value={plannedDate} onChange={(e) => setPlannedDate(e.target.value)} />
                  </label>
                  <label className="job-create-v2__field">
                    <span>Start time</span>
                    <input type="time" value={plannedTime} onChange={(e) => setPlannedTime(e.target.value)} />
                  </label>
                </div>
                <div className="job-create-v2__option-grid">
                  <label className="job-create-v2__option">
                    <div>
                      <input type="checkbox" checked={includeReturnTrip} onChange={(e) => setIncludeReturnTrip(e.target.checked)} />
                      <strong>Return trip</strong>
                    </div>
                    <p>Applied only to routes that support return.</p>
                  </label>
                  <label className="job-create-v2__option">
                    <div>
                      <input
                        type="checkbox"
                        checked={requireTrailer}
                        disabled={mode === "bulk" || !trailerEnabled}
                        onChange={(e) => {
                          setRequireTrailer(e.target.checked);
                          if (!e.target.checked) setTrailerPlate("");
                        }}
                      />
                      <strong>Trailer</strong>
                    </div>
                    {mode === "single" && trailerEnabled && requireTrailer ? (
                      <input value={trailerPlate} onChange={(e) => setTrailerPlate(e.target.value)} placeholder="Optional trailer plate" />
                    ) : (
                      <p>{mode === "bulk" ? "Single mode only" : trailerEnabled ? "Optional" : "Unavailable"}</p>
                    )}
                  </label>
                </div>
                <label className="job-create-v2__field">
                  <span>Notes</span>
                  <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
                </label>
              </section>

              <section className="job-create-v2__card">
                <div className="job-create-v2__section-head job-create-v2__section-head--compact">
                  <span>04</span>
                  <h2>{mode === "bulk" ? "Routes" : "Route"}</h2>
                </div>
                <div className="job-create-v2__route-toolbar">
                  <label className="job-create-v2__field">
                    <span>{mode === "bulk" ? "Find route" : "Route *"}</span>
                    {mode === "bulk" ? (
                      <input
                        value={routeSearch}
                        onChange={(e) => setRouteSearch(e.target.value)}
                        placeholder={truckType ? "Search route name" : "Choose truck type first"}
                        disabled={!customerId || !truckType}
                      />
                    ) : (
                      <select value={routeId} onChange={(e) => setRouteId(e.target.value)} disabled={!customerId || !truckType}>
                        <option value="">{routesLoading ? "Loading routes..." : truckType ? "Select route" : "Choose truck type first"}</option>
                        {filteredRoutes.map((item) => <option key={item.id} value={item.id}>{item.name} ({fmtHours(item.totalDurationHours)})</option>)}
                      </select>
                    )}
                  </label>
                  {mode === "bulk" ? (
                    <div className="job-create-v2__route-actions">
                      <button type="button" className="job-create-v2__secondary" onClick={selectAllVisibleRoutes} disabled={!filteredRoutes.length}>
                        Select all
                      </button>
                      <button type="button" className="job-create-v2__secondary" onClick={clearSelectedRoutes} disabled={!selectedRouteCount}>
                        Clear
                      </button>
                    </div>
                  ) : null}
                </div>

                {customerId && truckType && !filteredRoutes.length && !routesLoading ? <small className="warning">No routes found for {truckType}</small> : null}

                {mode === "bulk" ? (
                  <>
                    <div className="job-create-v2__selection-summary">
                      <span>{selectedRouteCount} selected</span>
                      <span>{filteredRoutes.length} visible</span>
                      <span>{includeReturnTrip ? "Return on" : "One-way"}</span>
                    </div>
                    <div className="job-create-v2__route-picker">
                      {filteredRoutes.map((item) => {
                        const selected = selectedRouteIds.includes(item.id);
                        const routeTotalHours = item.totalDurationHours + (includeReturnTrip && item.returnInfo?.enabled ? (item.returnInfo.dwellHours ?? 0) + (item.returnInfo.transitHours ?? 0) : 0);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            className={`job-create-v2__route-choice${selected ? " is-selected" : ""}`}
                            onClick={() => toggleRouteSelection(item.id)}
                          >
                            <div className="job-create-v2__route-choice-head">
                              <strong>{item.name}</strong>
                              <span>{selected ? "Selected" : "Pick"}</span>
                            </div>
                            <div className="job-create-v2__pills">
                              <span>{item.stops.length} stops</span>
                              <span>{fmtHours(routeTotalHours)}</span>
                              {item.returnInfo?.enabled ? <span>Return</span> : null}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : route ? (
                  <div className="job-create-v2__preview">
                    <div className="job-create-v2__preview-head">
                      <div>
                        <span className="job-create-v2__eyebrow">Stops</span>
                        <strong>{route.name}</strong>
                      </div>
                      <span>{fmtHours(totalHours)}</span>
                    </div>
                    <div className="job-create-v2__stop-grid">
                      {route.stops.map((item, index) => (
                        <div key={`${item.label}-${index}`} className="job-create-v2__stop-card">
                          <b>{index + 1}</b>
                          <div>
                            <strong>{item.label}</strong>
                            <span>Transit {fmtHours(item.transitHours)} / Dwell {fmtHours(item.dwellHours)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="job-create-v2__info">
                    <p>{truckType ? "Select route" : "Choose customer and truck type first"}</p>
                  </div>
                )}
                <div className="job-create-v2__schedule-box">
                  <div><strong>{mode === "bulk" ? "Longest duration" : "Estimated duration"}</strong><span>{mode === "bulk" ? (selectedRouteCount ? fmtHours(bulkMaxHours) : "-") : route ? fmtHours(totalHours) : "-"}</span></div>
                  <div><strong>{mode === "bulk" ? "Latest end" : "Estimated end"}</strong><span>{mode === "bulk" ? (selectedRouteCount ? endTime(plannedTime, bulkMaxHours) : "--:--") : route ? endTime(plannedTime, totalHours) : "--:--"}</span></div>
                </div>
              </section>
            </div>

            <aside className="job-create-v2__aside">
              <div className="job-create-v2__summary">
                <div className="job-create-v2__summary-head">
                  <div>
                    <span className="job-create-v2__eyebrow">Summary</span>
                    <h2>Ready to create</h2>
                  </div>
                  <strong>{progress}%</strong>
                </div>
                <div className="job-create-v2__progress"><span style={{ width: `${progress}%` }} /></div>
                <div className="job-create-v2__summary-list">
                  {checklist.map((item) => (
                    <div key={item.label} className="job-create-v2__summary-row">
                      <i className={item.done ? "is-done" : ""} />
                      <div>
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="job-create-v2__meta">
                  <span className="job-create-v2__eyebrow">Planning</span>
                  <strong>{route ? `${fmtHours(totalHours)} / finish ${endTime(plannedTime, totalHours)}` : "No route selected yet"}</strong>
                </div>
                <div className="job-create-v2__meta">
                  <span className="job-create-v2__eyebrow">Options</span>
                  <div className="job-create-v2__pills">
                    <span>{includeReturnTrip ? "Return trip on" : "One-way job"}</span>
                    <span>{requireTrailer ? `Trailer ${trailerPlate || "required"}` : "No trailer"}</span>
                  </div>
                </div>
                {error ? <div className="job-create-v2__error">{error}</div> : null}
                <div className="job-create-v2__actions">
                  <button type="submit" className="job-create-v2__primary" disabled={!canSubmit || submitting}>{submitting ? "Creating..." : "Create job order"}</button>
                  <button type="button" className="job-create-v2__secondary" onClick={() => router.push("/jobs")}>Cancel</button>
                </div>
              </div>
            </aside>

            <div className="job-create-v2__action-bar">
              <div className="job-create-v2__action-meta">
                <div className="job-create-v2__action-meta-item">
                  <span>{mode === "bulk" ? "Routes" : "Route"}</span>
                  <strong>{mode === "bulk" ? `${selectedRouteCount} selected` : route?.name || "-"}</strong>
                </div>
                <div className="job-create-v2__action-meta-item">
                  <span>Trip</span>
                  <strong>{includeReturnTrip ? "Return" : "One-way"}</strong>
                </div>
                <div className="job-create-v2__action-meta-item">
                  <span>{mode === "bulk" ? "Latest end" : "ETA"}</span>
                  <strong>{mode === "bulk" ? (selectedRouteCount ? endTime(plannedTime, bulkMaxHours) : "--:--") : route ? endTime(plannedTime, totalHours) : "--:--"}</strong>
                </div>
              </div>
              <div className="job-create-v2__action-controls">
                {error ? <div className="job-create-v2__error">{error}</div> : null}
                <button type="button" className="job-create-v2__secondary" onClick={() => router.push("/jobs")}>Cancel</button>
                <button type="submit" className="job-create-v2__primary" disabled={!canSubmit || submitting}>
                  {submitting ? "Creating..." : mode === "bulk" ? `Create ${selectedRouteCount || ""} Jobs`.trim() : "Create"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
