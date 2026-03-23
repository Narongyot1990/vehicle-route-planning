"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { Customer, Route } from "@/lib/types";
import { TRUCK_TYPE_OPTIONS } from "@/lib/truckTypes";



function generateJobNumber(): string {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const seq = String(Math.floor(Math.random() * 9000) + 1000);
  return `JO-${yyyy}${mm}-${seq}`;
}

export default function CreateJobOrderPage() {
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
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

  // Load customers on mount
  useEffect(() => {
    setJobNumber(generateJobNumber());
    fetch("/api/customers")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setCustomers(data); })
      .catch(() => setError("โหลดลูกค้าไม่ได้"))
      .finally(() => setLoading(false));
  }, []);

  // Load routes when customer changes
  useEffect(() => {
    setRouteId("");
    if (!customerId) { setRoutes([]); return; }
    fetch(`/api/routes?customerId=${customerId}`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setRoutes(data); });
  }, [customerId]);

  useEffect(() => {
    setRouteId("");
  }, [truckType]);

  useEffect(() => {
    setIncludeReturnTrip(false);
  }, [routeId]);

  useEffect(() => {
    setTruckType("");
  }, [customerId]);

  const selectedCustomer = customers.find((c) => c.id === customerId);

  const availableTruckTypes = useMemo(() => {
    const dynamicTypes = Array.from(
      new Set(
        routes.flatMap((route) => route.requiredVehicleTypes ?? [])
      )
    );

    if (dynamicTypes.length === 0) {
      return TRUCK_TYPE_OPTIONS;
    }

    return TRUCK_TYPE_OPTIONS.filter((option) => dynamicTypes.includes(option));
  }, [routes]);

  const filteredRoutes = useMemo(() => {
    if (!truckType) {
      return [];
    }

    return routes.filter((route) => {
      const supportedTruckTypes = route.requiredVehicleTypes ?? [];
      if (supportedTruckTypes.length === 0) {
        return true;
      }

      return supportedTruckTypes.includes(truckType);
    });
  }, [routes, truckType]);

  const selectedRoute = filteredRoutes.find((r) => r.id === routeId);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !truckType || !routeId || !plannedDate) {
      setError("กรุณาเลือกลูกค้า ประเภทรถ เส้นทาง และวันที่");
      return;
    }
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
        const d = await res.json();
        throw new Error(d.error ?? "Failed");
      }
      setSuccess(true);
      setTimeout(() => router.push("/jobs"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSubmitting(false);
    }
  }, [customerId, truckType, routeId, includeReturnTrip, plannedDate, plannedTime, requireTrailer, trailerPlate, notes, jobNumber, router]);

  if (success) {
    return (
      <div style={{ padding: "4rem", textAlign: "center" }}>
        <h2 style={{ color: "#16a34a", fontSize: "1.5rem", fontWeight: 700 }}>✅ สร้าง Job Order สำเร็จ!</h2>
        <p style={{ color: "#6b7280", marginTop: "0.5rem" }}>กลับไปหน้างาน...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "1.5rem 1rem", minHeight: "100vh", overflowY: "auto" }}>
      {/* Nav */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
        <button onClick={() => router.push("/jobs")} style={btnStyle("#374151")}>← งานทั้งหมด</button>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>สร้าง Job Order ใหม่</h1>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#9ca3af" }}>โหลดข้อมูล...</div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

          {/* Step 1: Customer */}
          <Card title="① เลือกลูกค้า">
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} required style={selectStyle}>
              <option value="">— เลือกลูกค้า —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            {selectedCustomer && (
              <div style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "#6b7280" }}>
                📍 {selectedCustomer.address} · 📞 {selectedCustomer.phone}
              </div>
            )}
          </Card>

          {/* Step 2: Route */}
          <Card title="② เลือกประเภทรถ และเส้นทาง">
            <div style={{ marginBottom: "0.85rem" }}>
              <label style={labelStyle}>ประเภทรถ *</label>
              <div style={truckTypeGridStyle}>
                {availableTruckTypes.map((option) => {
                  const active = truckType === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setTruckType(option)}
                      disabled={!customerId}
                      style={truckTypeButtonStyle(active, !customerId)}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>

            <select value={routeId} onChange={(e) => setRouteId(e.target.value)} required disabled={!customerId || !truckType} style={selectStyle}>
              <option value="">— เลือกเส้นทาง —</option>
              {filteredRoutes.map((r) => (
                <option key={r.id} value={r.id}>{r.name} ({r.totalDurationHours}h)</option>
              ))}
            </select>
            {!customerId ? (
              <div style={{ marginTop: "0.75rem", fontSize: "0.8rem", color: "#6b7280" }}>
                เลือกลูกค้าก่อน แล้วค่อยเลือกประเภทรถและเส้นทาง
              </div>
            ) : null}
            {customerId && availableTruckTypes.length > 0 ? (
              <div style={{ marginTop: "0.75rem", fontSize: "0.8rem", color: "#6b7280" }}>
                แสดงเฉพาะประเภทรถที่มีอยู่ใน route ของลูกค้ารายนี้
              </div>
            ) : null}
            {customerId && truckType && filteredRoutes.length === 0 ? (
              <div style={{ marginTop: "0.75rem", fontSize: "0.8rem", color: "#b45309" }}>
                ไม่พบเส้นทางที่รองรับ {truckType} สำหรับลูกค้ารายนี้
              </div>
            ) : null}
            {selectedRoute && (
              <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem", flexWrap: "wrap", fontSize: "0.8rem" }}>
                <span style={badgeStyle("#dbeafe", "#1d4ed8")}>🛑 {selectedRoute.stops.length} จุด</span>
                <span style={badgeStyle("#fef3c7", "#b45309")}>⏱ {selectedRoute.totalDurationHours}h</span>
                <span style={badgeStyle("#ede9fe", "#6d28d9")}>🚛 {(selectedRoute.requiredVehicleTypes ?? []).join(", ") || "—"}</span>
                <span style={badgeStyle("#dcfce7", "#15803d")}>📍 {selectedRoute.description}</span>
                {selectedRoute.returnInfo?.enabled ? (
                  <span style={badgeStyle("#ccfbf1", "#0f766e")}>
                    ↩ Return {selectedRoute.returnInfo.label || "-"} · จอด {selectedRoute.returnInfo.dwellHours ?? 0}h · ขับ {selectedRoute.returnInfo.transitHours ?? 0}h
                  </span>
                ) : null}
              </div>
            )}
            {selectedRoute?.returnInfo?.enabled ? (
              <div style={{ marginTop: "0.85rem", padding: "0.75rem", border: "1px solid #99f6e4", background: "#f0fdfa", borderRadius: 8 }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.55rem", fontSize: "0.85rem", fontWeight: 700, color: "#0f766e" }}>
                  <input
                    type="checkbox"
                    checked={includeReturnTrip}
                    onChange={(e) => setIncludeReturnTrip(e.target.checked)}
                  />
                  รวม Return trip ใน job นี้
                </label>
                <div style={{ marginTop: "0.45rem", fontSize: "0.78rem", color: "#115e59" }}>
                  ถ้าไม่ติ๊ก ระบบจะสร้าง job แบบเที่ยวเดียว แม้ route นี้จะมีข้อมูลขากลับอยู่ก็ตาม
                </div>
              </div>
            ) : null}

            {/* Trailer selection - for 6W, 10W, Prime Mover */}
            {["6W", "10W", "Prime Mover"].includes(truckType) && (
              <div style={{ marginTop: "0.85rem", padding: "0.75rem", border: "1px solid #e5e7eb", background: "#f9fafb", borderRadius: 8 }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.55rem", fontSize: "0.85rem", fontWeight: 700, color: "#374151" }}>
                  <input
                    type="checkbox"
                    checked={requireTrailer}
                    onChange={(e) => { setRequireTrailer(e.target.checked); if (!e.target.checked) setTrailerPlate(""); }}
                  />
                  🚛 ต้องการพ่วงตู้ Trailer
                </label>
                {requireTrailer && (
                  <div style={{ marginTop: "0.5rem" }}>
                    <input
                      type="text"
                      value={trailerPlate}
                      onChange={(e) => setTrailerPlate(e.target.value)}
                      placeholder="เช่น T-001"
                      style={{ ...inputStyle, fontFamily: "monospace" }}
                    />
                    <div style={{ marginTop: "0.25rem", fontSize: "0.75rem", color: "#6b7280" }}>
                      ระบุทะเบียนตู้ Trailer ที่ต้องการพ่วง
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Step 3: Schedule */}
          <Card title="③ ตารางเวลา">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={labelStyle}>วันที่ *</label>
                <input type="date" value={plannedDate} onChange={(e) => setPlannedDate(e.target.value)} required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>เวลา</label>
                <input type="time" value={plannedTime} onChange={(e) => setPlannedTime(e.target.value)} style={inputStyle} />
              </div>
            </div>
            {selectedRoute && plannedTime && (
              <div style={{ marginTop: "0.75rem", padding: "0.5rem 0.75rem", background: "#f0fdf4", borderRadius: 6, fontSize: "0.8rem", color: "#15803d", fontFamily: "monospace" }}>
                ⏱ เริ่ม {plannedTime} → จบประมาณ{" "}
                {(() => {
                  const [h, m] = plannedTime.split(":").map(Number);
                  const totalHours = selectedRoute.totalDurationHours + (includeReturnTrip && selectedRoute.returnInfo?.enabled
                    ? (selectedRoute.returnInfo.dwellHours ?? 0) + (selectedRoute.returnInfo.transitHours ?? 0)
                    : 0);
                  const endMins = h * 60 + m + Math.round(totalHours * 60);
                  const endH = String(Math.floor(endMins / 60) % 24).padStart(2, "0");
                  const endM = String(endMins % 60).padStart(2, "0");
                  return `${endH}:${endM}`;
                })()}
                {" "}({selectedRoute.totalDurationHours + (includeReturnTrip && selectedRoute.returnInfo?.enabled ? (selectedRoute.returnInfo.dwellHours ?? 0) + (selectedRoute.returnInfo.transitHours ?? 0) : 0)}h)
              </div>
            )}
            <div style={{ marginTop: "0.75rem" }}>
              <label style={labelStyle}>หมายเหตุ</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="หมายเหตุเพิ่มเติม..." style={{ ...inputStyle, resize: "vertical" }} />
            </div>
          </Card>

          {/* Job number display */}
          <div style={{ fontSize: "0.85rem", color: "#6b7280", fontFamily: "monospace" }}>
            Job No: <strong>{jobNumber}</strong>
          </div>

          {error && <div style={errorStyle}>❌ {error}</div>}

          <button type="submit" disabled={submitting || !customerId || !truckType || !routeId || !plannedDate} style={{
            ...btnStyle(submitting ? "#9ca3af" : "#16a34a"),
            opacity: (!customerId || !truckType || !routeId || !plannedDate) ? 0.5 : 1,
            cursor: (!customerId || !truckType || !routeId || !plannedDate) ? "not-allowed" : "pointer",
            fontSize: "1rem",
            padding: "0.75rem",
          }}>
            {submitting ? "กำลังบันทึก..." : "💾 บันทึก Job Order"}
          </button>
        </form>
      )}
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "1rem" }}>
      <h2 style={{ fontSize: "0.875rem", fontWeight: 700, color: "#374151", marginBottom: "0.75rem" }}>{title}</h2>
      {children}
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", marginBottom: "0.25rem" };
const inputStyle: React.CSSProperties = { width: "100%", padding: "0.4rem 0.6rem", border: "1px solid #d1d5db", borderRadius: 6, fontSize: "0.875rem", boxSizing: "border-box" };
const selectStyle: React.CSSProperties = { ...inputStyle, background: "#fff" };
const truckTypeGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
  gap: "0.5rem",
};

function truckTypeButtonStyle(active: boolean, disabled = false): React.CSSProperties {
  return {
    padding: "0.65rem 0.75rem",
    borderRadius: 8,
    border: `1px solid ${active ? "#2563eb" : "#d1d5db"}`,
    background: disabled ? "#f9fafb" : active ? "#dbeafe" : "#fff",
    color: disabled ? "#9ca3af" : active ? "#1d4ed8" : "#374151",
    fontSize: "0.85rem",
    fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
    textAlign: "center",
    opacity: disabled ? 0.8 : 1,
  };
}

function btnStyle(bg: string): React.CSSProperties {
  return { padding: "0.4rem 1rem", background: bg, color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontSize: "0.875rem", fontWeight: 600 };
}

function badgeStyle(bg: string, color: string): React.CSSProperties {
  return { background: bg, color, padding: "0.15rem 0.5rem", borderRadius: 4, fontSize: "0.75rem" };
}

const errorStyle: React.CSSProperties = { padding: "0.75rem", background: "#fee2e2", color: "#dc2626", borderRadius: 8, fontSize: "0.875rem" };
