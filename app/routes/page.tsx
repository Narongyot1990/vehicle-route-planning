"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Customer, Route } from "@/lib/types";
import { getStopColor } from "@/features/gantt/types/job";
import { TRUCK_TYPE_OPTIONS } from "@/lib/truckTypes";

interface StopForm {
  label: string;
  address: string;
  contactName: string;
  contactPhone: string;
  dwellHours: number;
  transitHours: number;
}

const DEFAULT_STOP: StopForm = { label: "", address: "", contactName: "", contactPhone: "", dwellHours: 0, transitHours: 0 };

function RoutesPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const filterCustomerId = searchParams.get("customerId") ?? "";

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create form state
  const [showCreate, setShowCreate] = useState(false);
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState(filterCustomerId);
  const [routeName, setRouteName] = useState("");
  const [routeDesc, setRouteDesc] = useState("");
  const [requiredVehicleTypes, setRequiredVehicleTypes] = useState<string[]>([]);
  const [hasReturnTrip, setHasReturnTrip] = useState(false);
  const [returnLabel, setReturnLabel] = useState("");
  const [returnAddress, setReturnAddress] = useState("");
  const [returnDwellHours, setReturnDwellHours] = useState(0);
  const [returnTransitHours, setReturnTransitHours] = useState(0);
  const [stops, setStops] = useState<StopForm[]>([{ ...DEFAULT_STOP, label: "จุดรับสินค้า" }]);

  const toggleRequiredVehicleType = (vehicleType: string) => {
    setRequiredVehicleTypes((current) =>
      current.includes(vehicleType)
        ? current.filter((value) => value !== vehicleType)
        : [...current, vehicleType]
    );
  };

  useEffect(() => {
    Promise.all([
      fetch("/api/customers").then((r) => r.json()),
      filterCustomerId
        ? fetch(`/api/routes?customerId=${filterCustomerId}`).then((r) => r.json())
        : fetch("/api/routes").then((r) => r.json()),
    ])
      .then(([custs, rts]) => {
        if (Array.isArray(custs)) setCustomers(custs);
        if (Array.isArray(rts)) setRoutes(rts);
      })
      .catch(() => setError("โหลดข้อมูลไม่ได้"))
      .finally(() => setLoading(false));
  }, [filterCustomerId]);

  const getCustomerName = (customerId: string) =>
    customers.find((c) => c.id === customerId)?.name ?? customerId;

  const addStop = () => setStops((p) => [...p, { ...DEFAULT_STOP }]);
  const removeStop = (i: number) => setStops((p) => p.filter((_, idx) => idx !== i));
  const updateStop = (i: number, field: keyof StopForm, value: string | number) =>
    setStops((p) => p.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)));

  const totalHours = stops.reduce((sum, s) => sum + (s.dwellHours || 0) + (s.transitHours || 0), 0);

  const resetForm = () => {
    setShowCreate(false);
    setEditingRouteId(null);
    setRouteName("");
    setRouteDesc("");
    setRequiredVehicleTypes([]);
    setHasReturnTrip(false);
    setReturnLabel("");
    setReturnAddress("");
    setReturnDwellHours(0);
    setReturnTransitHours(0);
    setStops([{ ...DEFAULT_STOP, label: "จุดรับสินค้า" }]);
    setCreateError(null);
    if (!filterCustomerId) setSelectedCustomerId("");
  };

  const handleSaveRoute = useCallback(async () => {
    if (!selectedCustomerId) { setCreateError("กรุณาเลือกลูกค้า"); return; }
    if (!routeName.trim()) { setCreateError("กรุณากรอกชื่อเส้นทาง"); return; }
    if (stops.some((s) => !s.label.trim() || !s.address.trim())) {
      setCreateError("กรุณากรอกชื่อสถานที่และที่อยู่ทุกจุด"); return;
    }
    if (hasReturnTrip && (!returnLabel.trim() || !returnAddress.trim())) {
      setCreateError("กรุณากรอกรายละเอียด return ให้ครบ"); return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/routes", {
        method: editingRouteId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingRouteId ?? undefined,
          customerId: selectedCustomerId,
          name: routeName.trim(),
          description: routeDesc.trim(),
          requiredVehicleTypes,
          returnInfo: hasReturnTrip
            ? {
                enabled: true,
                label: returnLabel.trim(),
                address: returnAddress.trim(),
                dwellHours: returnDwellHours,
                transitHours: returnTransitHours,
              }
            : undefined,
          stops: stops.map((s, i) => ({ ...s, order: i + 1 })),
          totalDurationHours: totalHours,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "บันทึก route ล้มเหลว"); }
      const savedRoute = await res.json();
      setRoutes((p) =>
        editingRouteId
          ? p.map((route) => (route.id === savedRoute.id ? savedRoute : route))
          : [savedRoute, ...p]
      );
      resetForm();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Error");
    } finally {
      setCreating(false);
    }
  }, [selectedCustomerId, routeName, routeDesc, requiredVehicleTypes, hasReturnTrip, returnLabel, returnAddress, returnDwellHours, returnTransitHours, stops, totalHours, editingRouteId, filterCustomerId]);

  const handleDelete = async (routeId: string, routeName: string) => {
    if (!confirm(`ลบ route "${routeName}"?`)) return;
    await fetch(`/api/routes?id=${routeId}`, { method: "DELETE" });
    setRoutes((p) => p.filter((r) => r.id !== routeId));
  };

  const openCreate = () => {
    resetForm();
    setShowCreate(true);
    if (filterCustomerId) setSelectedCustomerId(filterCustomerId);
  };

  const openEdit = (route: Route) => {
    setShowCreate(true);
    setEditingRouteId(route.id);
    setSelectedCustomerId(route.customerId);
    setRouteName(route.name);
    setRouteDesc(route.description ?? "");
    setRequiredVehicleTypes(route.requiredVehicleTypes ?? []);
    setHasReturnTrip(Boolean(route.returnInfo?.enabled));
    setReturnLabel(route.returnInfo?.label ?? "");
    setReturnAddress(route.returnInfo?.address ?? "");
    setReturnDwellHours(route.returnInfo?.dwellHours ?? 0);
    setReturnTransitHours(route.returnInfo?.transitHours ?? 0);
    setStops(
      route.stops.length > 0
        ? route.stops.map((stop) => ({
            label: stop.label,
            address: stop.address,
            contactName: stop.contactName,
            contactPhone: stop.contactPhone,
            dwellHours: stop.dwellHours,
            transitHours: stop.transitHours,
          }))
        : [{ ...DEFAULT_STOP, label: "จุดรับสินค้า" }]
    );
    setCreateError(null);
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "1.5rem 1rem", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {filterCustomerId && (
            <button onClick={() => router.push(`/customers/${filterCustomerId}`)} style={btn("#374151")}>← ลูกค้า</button>
          )}
          {!filterCustomerId && (
            <button onClick={() => router.push("/customers")} style={btn("#374151")}>← ลูกค้า</button>
          )}
          <h1 style={{ fontSize: "1.2rem", fontWeight: 700 }}>
            🗺 เส้นทาง
            {filterCustomerId && customers.length > 0 && (
              <span style={{ fontWeight: 400, color: "#6b7280", fontSize: "0.9rem" }}> — {getCustomerName(filterCustomerId)}</span>
            )}
            {!filterCustomerId && <span style={{ color: "#6b7280", fontSize: "0.9rem", fontWeight: 400 }}> ({routes.length})</span>}
          </h1>
        </div>
        <button onClick={openCreate} style={btn("#16a34a")}>+ เพิ่ม Route</button>
      </div>

      {error && <div style={errorStyle}>❌ {error}</div>}

      {/* Create Form */}
      {showCreate && (
        <div style={{ background: "#f0fdf4", border: "2px solid #86efac", borderRadius: 10, padding: "1.25rem", marginBottom: "1.25rem" }}>
          <h2 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "1rem", color: "#15803d" }}>{editingRouteId ? "แก้ไข Route" : "สร้าง Route ใหม่"}</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {/* Customer picker */}
            {!filterCustomerId && (
              <div>
                <label style={labelStyle}>ลูกค้า *</label>
                <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} style={inputStyle}>
                  <option value="">— เลือกลูกค้า —</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
            {filterCustomerId && (
              <div style={{ padding: "0.4rem 0.6rem", background: "#dcfce7", borderRadius: 6, fontSize: "0.85rem", color: "#15803d", fontWeight: 600 }}>
                👤 {getCustomerName(filterCustomerId)}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <div>
                <label style={labelStyle}>ชื่อเส้นทาง *</label>
                <input type="text" value={routeName} onChange={(e) => setRouteName(e.target.value)} placeholder="เช่น KSN→BKK Delivery" style={inputStyle} autoFocus />
              </div>
              <div>
                <label style={labelStyle}>รายละเอียด</label>
                <input type="text" value={routeDesc} onChange={(e) => setRouteDesc(e.target.value)} placeholder="คำอธิบาย (ถ้ามี)" style={inputStyle} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>ประเภทรถที่รองรับ</label>
              <div style={truckTypeGridStyle}>
                {TRUCK_TYPE_OPTIONS.map((option) => {
                  const active = requiredVehicleTypes.includes(option);
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => toggleRequiredVehicleType(option)}
                      style={truckTypeButtonStyle(active)}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
              <div style={{ marginTop: "0.5rem", fontSize: "0.78rem", color: "#6b7280" }}>
                ถ้าไม่เลือก ระบบจะถือว่า route นี้ใช้ได้กับรถทุกประเภท
              </div>
            </div>

            <div style={{ background: "#fff", border: "1px solid #d1d5db", borderRadius: 8, padding: "0.85rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.55rem", fontSize: "0.85rem", fontWeight: 700, color: "#374151" }}>
                <input
                  type="checkbox"
                  checked={hasReturnTrip}
                  onChange={(e) => setHasReturnTrip(e.target.checked)}
                />
                เป็นงาน Return
              </label>

              {hasReturnTrip ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginTop: "0.75rem" }}>
                  <div>
                    <label style={labelStyle}>ชื่อจุด Return *</label>
                    <input
                      type="text"
                      value={returnLabel}
                      onChange={(e) => setReturnLabel(e.target.value)}
                      placeholder="เช่น กลับ BAS / คืนปลายทาง"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>ที่อยู่ Return *</label>
                    <input
                      type="text"
                      value={returnAddress}
                      onChange={(e) => setReturnAddress(e.target.value)}
                      placeholder="ที่อยู่ปลายทาง/ต้นทางสำหรับขากลับ"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>จอด Return (ชม.)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.25"
                      value={returnDwellHours}
                      onChange={(e) => setReturnDwellHours(parseFloat(e.target.value) || 0)}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>ขับ Return (ชม.)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.25"
                      value={returnTransitHours}
                      onChange={(e) => setReturnTransitHours(parseFloat(e.target.value) || 0)}
                      style={inputStyle}
                    />
                  </div>
                </div>
              ) : null}
            </div>

            {/* Stops */}
            <div>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#374151", marginBottom: "0.5rem" }}>
                จุดแวะ ({stops.length}) · รวม {totalHours}h
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {stops.map((stop, i) => (
                  <StopRow
                    key={i}
                    index={i}
                    stop={stop}
                    updateStop={updateStop}
                    removeStop={stops.length > 1 ? () => removeStop(i) : undefined}
                  />
                ))}
              </div>
              <button type="button" onClick={addStop} style={{ ...btn("#6b7280"), fontSize: "0.8rem", padding: "0.3rem 0.75rem", marginTop: "0.5rem" }}>
                + เพิ่มจุดแวะ
              </button>
            </div>

            {createError && <div style={errorStyle}>❌ {createError}</div>}

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button onClick={handleSaveRoute} disabled={creating} style={{ ...btn("#16a34a"), opacity: creating ? 0.6 : 1 }}>
                {creating ? "กำลังบันทึก..." : editingRouteId ? "💾 บันทึกการแก้ไข" : "💾 บันทึก Route"}
              </button>
              <button onClick={resetForm} style={btn("#6b7280")}>ยกเลิก</button>
            </div>
          </div>
        </div>
      )}

      {/* Routes list */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#9ca3af" }}>โหลด...</div>
      ) : routes.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#9ca3af", border: "1px dashed #d1d5db", borderRadius: 12 }}>
          ยังไม่มี Route — <button onClick={openCreate} style={{ color: "#2563eb", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}>สร้างตัวแรก</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {routes.map((r) => (
            <div key={r.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "1rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{r.name}</div>
                {!filterCustomerId && (
                  <div style={{ fontSize: "0.78rem", color: "#2563eb", marginTop: "0.15rem" }}>👤 {getCustomerName(r.customerId)}</div>
                )}
                <div style={{ fontSize: "0.78rem", color: "#6b7280", marginTop: "0.15rem" }}>
                  🛑 {r.stops.length} จุด · ⏱ {r.totalDurationHours}h
                  {r.description && <> · {r.description}</>}
                </div>
                {(r.requiredVehicleTypes ?? []).length > 0 ? (
                  <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", marginTop: "0.45rem" }}>
                    {(r.requiredVehicleTypes ?? []).map((vehicleType) => (
                      <span key={vehicleType} style={{ fontSize: "0.7rem", padding: "0.15rem 0.45rem", borderRadius: 20, background: "#ede9fe", color: "#6d28d9", fontWeight: 600, border: "1px solid #c4b5fd" }}>
                        🚛 {vehicleType}
                      </span>
                    ))}
                  </div>
                ) : null}
                {r.returnInfo?.enabled ? (
                  <div style={{ marginTop: "0.45rem", fontSize: "0.76rem", color: "#0f766e", background: "#ccfbf1", border: "1px solid #99f6e4", borderRadius: 8, padding: "0.35rem 0.55rem" }}>
                    ↩ Return: {r.returnInfo.label || "-"} · {r.returnInfo.address || "-"} · จอด {r.returnInfo.dwellHours ?? 0}h · ขับ {r.returnInfo.transitHours ?? 0}h
                  </div>
                ) : null}
                {/* Stop chips */}
                <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", marginTop: "0.4rem" }}>
                  {r.stops.map((s, i) => {
                    const color = getStopColor(s.label, i);
                    return (
                      <span key={i} style={{ fontSize: "0.7rem", padding: "0.15rem 0.45rem", borderRadius: 20, background: color + "22", color, fontWeight: 600, border: `1px solid ${color}55` }}>
                        {i + 1}. {s.label}
                      </span>
                    );
                  })}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginLeft: "0.5rem" }}>
                <button onClick={() => openEdit(r)} style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontSize: "0.8rem", padding: "0.2rem 0.4rem" }}>
                  ✏️
                </button>
                <button onClick={() => handleDelete(r.id, r.name)} style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: "0.8rem", padding: "0.2rem 0.4rem" }}>
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RoutesPage() {
  return (
    <Suspense fallback={<div style={{ padding: "3rem", textAlign: "center", color: "#9ca3af" }}>โหลด...</div>}>
      <RoutesPageInner />
    </Suspense>
  );
}

function StopRow({ index, stop, updateStop, removeStop }: {
  index: number;
  stop: StopForm;
  updateStop: (i: number, field: keyof StopForm, value: string | number) => void;
  removeStop?: () => void;
}) {
  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: "0.75rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
        <span style={{ fontSize: "0.8rem", fontWeight: 700, color: getStopColor("", index) }}>จุดที่ {index + 1}</span>
        {removeStop && (
          <button type="button" onClick={removeStop} style={{ color: "#dc2626", background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem" }}>ลบ</button>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
          <input type="text" value={stop.label} onChange={(e) => updateStop(index, "label", e.target.value)} placeholder="ชื่อสถานที่ *" style={inputStyle} />
          <input type="text" value={stop.address} onChange={(e) => updateStop(index, "address", e.target.value)} placeholder="ที่อยู่ *" style={inputStyle} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
          <div>
            <label style={labelStyle}>📦 จอด (ชม.)</label>
            <input type="number" min="0" step="0.25" value={stop.dwellHours} onChange={(e) => updateStop(index, "dwellHours", parseFloat(e.target.value) || 0)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>🚚 ขับ (ชม.)</label>
            <input type="number" min="0" step="0.25" value={stop.transitHours} onChange={(e) => updateStop(index, "transitHours", parseFloat(e.target.value) || 0)} style={inputStyle} />
          </div>
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: "0.7rem", fontWeight: 600, color: "#6b7280", marginBottom: "0.2rem" };
const inputStyle: React.CSSProperties = { width: "100%", padding: "0.4rem 0.6rem", border: "1px solid #d1d5db", borderRadius: 6, fontSize: "0.875rem", boxSizing: "border-box", background: "#fff" };
const truckTypeGridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.5rem" };
const truckTypeButtonStyle = (active: boolean): React.CSSProperties => ({
  padding: "0.65rem 0.75rem",
  borderRadius: 8,
  border: `1px solid ${active ? "#2563eb" : "#d1d5db"}`,
  background: active ? "#dbeafe" : "#fff",
  color: active ? "#1d4ed8" : "#374151",
  fontSize: "0.85rem",
  fontWeight: 700,
  cursor: "pointer",
  textAlign: "center",
});
const btn = (bg: string): React.CSSProperties => ({ padding: "0.4rem 0.75rem", background: bg, color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontSize: "0.875rem", fontWeight: 600 });
const errorStyle: React.CSSProperties = { padding: "0.65rem", background: "#fee2e2", color: "#dc2626", borderRadius: 8, fontSize: "0.875rem", marginBottom: "0.75rem" };
