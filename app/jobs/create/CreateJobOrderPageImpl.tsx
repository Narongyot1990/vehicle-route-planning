"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Customer, Route } from "@/lib/types";
import { TRUCK_TYPE_OPTIONS } from "@/lib/truckTypes";

const TRAILER_TYPES = new Set(["6W", "10W", "Prime Mover"]);

function createJobNumber() {
  const now = new Date();
  return `JO-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
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
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [routesLoading, setRoutesLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [truckType, setTruckType] = useState("");
  const [routeId, setRouteId] = useState("");
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
    if (!truckType) return [];
    return routes.filter((route) => {
      const types = route.requiredVehicleTypes ?? [];
      return !types.length || types.includes(truckType);
    });
  }, [routes, truckType]);
  const route = filteredRoutes.find((item) => item.id === routeId);
  const returnHours = includeReturnTrip && route?.returnInfo?.enabled ? (route.returnInfo.dwellHours ?? 0) + (route.returnInfo.transitHours ?? 0) : 0;
  const totalHours = route ? route.totalDurationHours + returnHours : 0;
  const trailerEnabled = TRAILER_TYPES.has(truckType);
  const canSubmit = Boolean(customerId && truckType && routeId && plannedDate);
  const checklist = [
    { label: "Customer", done: Boolean(customer), value: customer?.name ?? "Choose customer" },
    { label: "Truck", done: Boolean(truckType), value: truckType || "Choose truck type" },
    { label: "Route", done: Boolean(route), value: route?.name ?? "Choose route" },
    { label: "Start", done: Boolean(plannedDate), value: plannedDate ? `${plannedDate} ${plannedTime}` : "Choose date" },
  ];
  const progress = Math.round((checklist.filter((item) => item.done).length / checklist.length) * 100);

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return setError("Please complete customer, truck type, route, and start date");
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/joborders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobNumber,
          customerId,
          routeId,
          includeReturnTrip,
          plannedStartDate: plannedDate,
          plannedStartTime: plannedTime,
          requireTrailer: requireTrailer || undefined,
          trailerPlate: trailerPlate || undefined,
          notes: notes || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create job order");
      }
      setSuccess(true);
      setTimeout(() => router.push("/jobs"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create job order");
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, customerId, includeReturnTrip, jobNumber, notes, plannedDate, plannedTime, requireTrailer, routeId, router, trailerPlate]);

  if (success) {
    return (
      <div className="job-create-v2 job-create-v2--success">
        <div className="job-create-v2__success-card">
          <div className="job-create-v2__success-badge">
            <span>OK</span>
          </div>
          <h1>Job order created</h1>
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
              <h1>Create Job Order</h1>
            </div>
          </div>
          <div className="job-create-v2__jobno">
            <span>Job No</span>
            <strong>{jobNumber}</strong>
          </div>
        </header>

        {loading ? (
          <div className="job-create-v2__loading">Loading customers...</div>
        ) : (
          <form className="job-create-v2__layout" onSubmit={handleSubmit}>
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
                  <span>ETA</span>
                  <strong>{route ? endTime(plannedTime, totalHours) : "--:--"}</strong>
                </div>
                <div className="job-create-v2__top-meta-item">
                  <span>Duration</span>
                  <strong>{route ? fmtHours(totalHours) : "-"}</strong>
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
                  <span>02</span>
                  <h2>Route</h2>
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
                    <span>Route *</span>
                    <select value={routeId} onChange={(e) => setRouteId(e.target.value)} disabled={!customerId || !truckType}>
                      <option value="">{routesLoading ? "Loading routes..." : truckType ? "Select route" : "Choose truck type first"}</option>
                      {filteredRoutes.map((item) => <option key={item.id} value={item.id}>{item.name} ({fmtHours(item.totalDurationHours)})</option>)}
                    </select>
                    {customerId && truckType && !filteredRoutes.length && !routesLoading ? <small className="warning">No routes found for {truckType}</small> : null}
                  </label>
                  <div className="job-create-v2__info">
                    <span className="job-create-v2__eyebrow">Snapshot</span>
                    {route ? (
                      <>
                        <div className="job-create-v2__pills">
                          <span>{route.stops.length} stops</span>
                          <span>{fmtHours(route.totalDurationHours)}</span>
                          <span>{(route.requiredVehicleTypes ?? []).join(", ") || "Any truck"}</span>
                        </div>
                      </>
                    ) : <p>Select route</p>}
                  </div>
                </div>
                {route ? (
                  <div className="job-create-v2__preview">
                    <div className="job-create-v2__preview-head">
                      <div>
                        <span className="job-create-v2__eyebrow">Stops</span>
                        <strong>{route.name}</strong>
                      </div>
                      <span>Base {fmtHours(route.totalDurationHours)}</span>
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
                ) : null}
                <div className="job-create-v2__option-grid">
                  <label className="job-create-v2__option">
                    <div>
                      <input type="checkbox" checked={includeReturnTrip} disabled={!route?.returnInfo?.enabled} onChange={(e) => setIncludeReturnTrip(e.target.checked)} />
                      <strong>Return trip</strong>
                    </div>
                    <p>{route?.returnInfo?.enabled ? `+ ${fmtHours((route.returnInfo.dwellHours ?? 0) + (route.returnInfo.transitHours ?? 0))}` : "Unavailable"}</p>
                  </label>
                  <label className="job-create-v2__option">
                    <div>
                      <input type="checkbox" checked={requireTrailer} disabled={!trailerEnabled} onChange={(e) => { setRequireTrailer(e.target.checked); if (!e.target.checked) setTrailerPlate(""); }} />
                      <strong>Trailer</strong>
                    </div>
                    {trailerEnabled && requireTrailer ? (
                      <input value={trailerPlate} onChange={(e) => setTrailerPlate(e.target.value)} placeholder="Optional trailer plate" />
                    ) : (
                      <p>{trailerEnabled ? "Optional" : "Unavailable"}</p>
                    )}
                  </label>
                </div>
              </section>

              <section className="job-create-v2__card">
                <div className="job-create-v2__section-head job-create-v2__section-head--compact">
                  <span>03</span>
                  <h2>Schedule</h2>
                </div>
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
                <div className="job-create-v2__schedule-box">
                  <div><strong>Estimated duration</strong><span>{route ? fmtHours(totalHours) : "-"}</span></div>
                  <div><strong>Estimated end</strong><span>{route ? endTime(plannedTime, totalHours) : "-"}</span></div>
                </div>
                <label className="job-create-v2__field">
                  <span>Notes</span>
                  <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
                </label>
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
                  <span>Route</span>
                  <strong>{route?.name || "-"}</strong>
                </div>
                <div className="job-create-v2__action-meta-item">
                  <span>Trip</span>
                  <strong>{includeReturnTrip ? "Return" : "One-way"}</strong>
                </div>
                <div className="job-create-v2__action-meta-item">
                  <span>Trailer</span>
                  <strong>{requireTrailer ? trailerPlate || "Required" : "-"}</strong>
                </div>
              </div>
              <div className="job-create-v2__action-controls">
                {error ? <div className="job-create-v2__error">{error}</div> : null}
                <button type="button" className="job-create-v2__secondary" onClick={() => router.push("/jobs")}>Cancel</button>
                <button type="submit" className="job-create-v2__primary" disabled={!canSubmit || submitting}>{submitting ? "Creating..." : "Create"}</button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
