"use client";

import type { JobOrderStatus, JobOrderPriority } from "@/lib/types";
import type { useJobOrderEditForm } from "@/features/gantt/hooks/useJobOrderEditForm";

const STATUS_OPTIONS: { value: JobOrderStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "confirmed", label: "Confirmed" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const PRIORITY_OPTIONS: { value: JobOrderPriority; label: string; color: string }[] = [
  { value: "low", label: "Low", color: "#6b7280" },
  { value: "normal", label: "Normal", color: "#2563eb" },
  { value: "high", label: "High", color: "#d97706" },
  { value: "urgent", label: "Urgent", color: "#dc2626" },
];

export function JobOrderEditFormFields({ state }: { state: ReturnType<typeof useJobOrderEditForm> }) {
  const {
    jo,
    status, setStatus,
    priority, setPriority,
    vehiclePlate, setVehiclePlate,
    driverName, setDriverName,
    trailerPlate, setTrailerPlate,
    plannedDate, setPlannedDate,
    plannedTime, setPlannedTime,
    notes, setNotes,
    quotedPrice, setQuotedPrice,
    estEnd,
  } = state;

  if (!jo) return null;

  return (
    <>
      {/* Route info (read-only) */}
      <div style={{ background: "#f9fafb", borderRadius: 10, padding: 12, border: "1px solid #e5e7eb" }}>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: "#6b7280", marginBottom: 6, letterSpacing: "0.05em" }}>
          เส้นทาง (Route Snapshot)
        </div>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{jo.routeSnapshot.name}</div>
        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span>🛑 {jo.routeSnapshot.stops.length} จุด</span>
          <span>⏱ {jo.routeSnapshot.totalDurationHours}h</span>
          <span>🚛 {jo.routeSnapshot.requiredVehicleTypes.join(", ") || "—"}</span>
        </div>
        {/* Stops list */}
        <div style={{ marginTop: 8, display: "flex", gap: 4, flexWrap: "wrap" }}>
          {jo.routeSnapshot.stops.map((s, i) => (
            <span
              key={i}
              style={{
                background: "#e0e7ff",
                color: "#3730a3",
                padding: "2px 8px",
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 500,
              }}
            >
              {s.label}
            </span>
          ))}
        </div>
      </div>

      {/* Status & Priority */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <Label>สถานะ</Label>
          <select value={status} onChange={(e) => setStatus(e.target.value as JobOrderStatus)} style={selectStyle}>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <Label>ความสำคัญ</Label>
          <div style={{ display: "flex", gap: 4 }}>
            {PRIORITY_OPTIONS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPriority(p.value)}
                style={{
                  flex: 1,
                  padding: "6px 4px",
                  border: "1.5px solid",
                  borderColor: priority === p.value ? p.color : "#d1d5db",
                  background: priority === p.value ? p.color : "transparent",
                  color: priority === p.value ? "#fff" : "#374151",
                  borderRadius: 6,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Schedule */}
      <div>
        <Label>ตารางเวลา</Label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <input type="date" value={plannedDate} onChange={(e) => setPlannedDate(e.target.value)} style={inputStyle} />
          <input type="time" value={plannedTime} onChange={(e) => setPlannedTime(e.target.value)} style={inputStyle} />
        </div>
        {estEnd && (
          <div style={{ marginTop: 6, fontSize: 12, color: "#15803d", fontFamily: "monospace", background: "#f0fdf4", padding: "4px 8px", borderRadius: 6 }}>
            ⏱ {plannedTime} → จบประมาณ {estEnd} ({jo.routeSnapshot.totalDurationHours}h)
          </div>
        )}
      </div>

      {/* Assignment */}
      <div>
        <Label>มอบหมาย</Label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>
            <span style={subLabelStyle}>ทะเบียนรถ</span>
            <input value={vehiclePlate} onChange={(e) => setVehiclePlate(e.target.value)} placeholder="เช่น 69-3320" style={inputStyle} />
          </div>
          <div>
            <span style={subLabelStyle}>คนขับ</span>
            <input value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder="ชื่อคนขับ" style={inputStyle} />
          </div>
          <div>
            <span style={subLabelStyle}>ทะเบียนตู้พ่วง</span>
            <input value={trailerPlate} onChange={(e) => setTrailerPlate(e.target.value)} placeholder="(ถ้ามี)" style={inputStyle} />
          </div>
          <div>
            <span style={subLabelStyle}>ราคา (THB)</span>
            <input
              type="number"
              value={quotedPrice}
              onChange={(e) => setQuotedPrice(e.target.value)}
              placeholder="0"
              style={inputStyle}
            />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <Label>หมายเหตุ</Label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="หมายเหตุเพิ่มเติม..."
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </div>
    </>
  );
}

// ── Sub-components & styles ────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: "#6b7280", letterSpacing: "0.05em", marginBottom: 4 }}>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "7px 10px",
  borderRadius: 6,
  border: "1px solid #d1d5db",
  fontSize: 13,
  outline: "none",
  background: "#fff",
  boxSizing: "border-box",
};

const selectStyle: React.CSSProperties = { ...inputStyle, cursor: "pointer" };

const subLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 10,
  fontWeight: 500,
  color: "#9ca3af",
  marginBottom: 2,
};
