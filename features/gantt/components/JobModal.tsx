"use client";

import { useState, useCallback } from "react";
import type { Job, JobStop, JobStatus, JobPriority } from "@/features/gantt/types/job";
import { ROUTE_TEMPLATES } from "@/features/gantt/data/routeTemplates";
import { getStopColor } from "@/features/gantt/types/job";
import {
  JOB_STATUS_LABELS,
  JOB_PRIORITY_LABELS,
} from "@/features/gantt/types/job";
import { ModalShell } from "@/components/ui/ModalShell";

const BRANCHES = ["KSN", "CHO", "AYA", "BBT", "RA2"];
const VEHICLE_TYPES = ["4W", "6W", "10W", "Prime Mover"];

// ── Types ─────────────────────────────────────────────────────────────────────

type Mode = "create" | "edit";

interface JobModalProps {
  mode: Mode;
  job?: Job;
  onSave: (job: Job) => void;
  onClose: () => void;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      style={{
        display: "block",
        fontSize: "11px",
        fontWeight: 600,
        textTransform: "uppercase",
        color: "var(--text-muted, #6b7280)",
        letterSpacing: "0.05em",
        marginBottom: "4px",
      }}
    >
      {children}
    </label>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <SectionLabel>{label}</SectionLabel>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: "6px",
  border: "1px solid var(--border, #e5e7eb)",
  fontSize: "14px",
  outline: "none",
  background: "var(--bg-surface, #fff)",
  color: "var(--text-primary, #111827)",
  boxSizing: "border-box",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: "pointer",
};

function StopCard({
  stop,
  index,
  onUpdate,
}: {
  stop: JobStop;
  index: number;
  onUpdate: (updated: JobStop) => void;
}) {
  const handleChange = (field: keyof JobStop, value: string) => {
    onUpdate({ ...stop, [field]: value });
  };

  return (
    <div
      style={{
        background: "var(--bg-muted, #f9fafb)",
        borderRadius: "8px",
        padding: "12px",
        border: "1px solid var(--border, #e5e7eb)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "8px",
        }}
      >
        <span
          style={{
            background: "var(--primary, #2563eb)",
            color: "#fff",
            borderRadius: "50%",
            width: "20px",
            height: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "11px",
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {index + 1}
        </span>
        <input
          style={{
            ...inputStyle,
            fontWeight: 600,
            flex: 1,
          }}
          value={stop.label}
          onChange={(e) => handleChange("label", e.target.value)}
          placeholder="Stop label"
        />
        <select
          style={{ ...selectStyle, width: "120px" }}
          value={stop.status}
          onChange={(e) =>
            handleChange("status", e.target.value as JobStop["status"])
          }
        >
          <option value="pending">Pending</option>
          <option value="done">Done</option>
          <option value="skipped">Skipped</option>
        </select>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <input
            style={inputStyle}
            value={stop.address}
            onChange={(e) => handleChange("address", e.target.value)}
            placeholder="Address"
          />
        </div>
        <input
          style={inputStyle}
          value={stop.contactName}
          onChange={(e) => handleChange("contactName", e.target.value)}
          placeholder="Contact name"
        />
        <input
          style={inputStyle}
          value={stop.contactPhone}
          onChange={(e) => handleChange("contactPhone", e.target.value)}
          placeholder="Phone"
        />
        <input
          style={inputStyle}
          value={stop.scheduledTime}
          onChange={(e) => handleChange("scheduledTime", e.target.value)}
          placeholder="Scheduled (HH:mm)"
        />
        <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
          <input
            style={{ ...inputStyle, width: "70px" }}
            value={stop.timeWindowStart}
            onChange={(e) => handleChange("timeWindowStart", e.target.value)}
            placeholder="From"
          />
          <span style={{ color: "var(--text-muted, #6b7280)", fontSize: "12px" }}>
            –
          </span>
          <input
            style={{ ...inputStyle, width: "70px" }}
            value={stop.timeWindowEnd}
            onChange={(e) => handleChange("timeWindowEnd", e.target.value)}
            placeholder="To"
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <span style={{ fontSize: "12px", color: "var(--text-muted, #6b7280)" }}>
            Transit:
          </span>
          <input
            style={{ ...inputStyle, width: "70px" }}
            type="number"
            step="0.5"
            min="0"
            value={stop.transitFromPrevHours}
            onChange={(e) =>
              handleChange(
                "transitFromPrevHours",
                String(parseFloat(e.target.value) || 0),
              )
            }
          />
          <span style={{ fontSize: "12px", color: "var(--text-muted, #6b7280)" }}>
            hrs
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Main Modal ─────────────────────────────────────────────────────────────────

export function JobModal({ mode, job, onSave, onClose }: JobModalProps) {
  const [form, setForm] = useState<Partial<Job>>(() => {
    if (mode === "edit" && job) return { ...job };
    return {
      status: "draft",
      priority: "normal",
      requiredVehicleTypes: [],
      stops: [],
      branch: BRANCHES[0],
      customerName: "",
      customerContact: "",
      customerPhone: "",
      notes: "",
    };
  });

  const update = useCallback(
    <K extends keyof Job>(key: K, value: Job[K]) =>
      setForm((prev) => ({ ...prev, [key]: value })),
    [],
  );

  // Template selection
  const handleTemplateChange = (templateId: string) => {
    if (templateId === "__direct__") {
      setForm((prev) => ({
        ...prev,
        routeTemplateId: undefined,
        stops: [],
        directLeadTimeHours: 1,
      }));
      return;
    }
    const tmpl = ROUTE_TEMPLATES.find((t) => t.id === templateId);
    if (!tmpl) return;
    setForm((prev) => ({
      ...prev,
      routeTemplateId: templateId,
      directLeadTimeHours: undefined,
      stops: tmpl.stops.map((s) => ({
        ...s,
        id: `new-stop-${Date.now()}-${s.order}`,
        scheduledTime: s.timeWindowStart,
        status: "pending" as const,
      })),
      requiredVehicleTypes: [...tmpl.vehicleTypeRequirement],
    }));
  };

  // Stop management
  const handleStopUpdate = (index: number, updated: JobStop) => {
    setForm((prev) => {
      const stops = [...(prev.stops ?? [])];
      stops[index] = updated;
      return { ...prev, stops };
    });
  };

  const handleAddStop = () => {
    setForm((prev) => {
      const newStopLabel = `Stop ${(prev.stops?.length ?? 0) + 1}`;
      return {
        ...prev,
        stops: [
          ...(prev.stops ?? []),
          {
            id: `new-stop-${Date.now()}`,
            label: newStopLabel,
            address: "",
            contactName: "",
            contactPhone: "",
            scheduledTime: "09:00",
            timeWindowStart: "09:00",
            timeWindowEnd: "18:00",
            transitFromPrevHours: 1,
            order: (prev.stops?.length ?? 0) + 1,
            status: "pending",
            color: getStopColor(newStopLabel, prev.stops?.length ?? 0),
          },
        ],
      };
    });
  };

  const handleRemoveStop = (index: number) => {
    setForm((prev) => ({
      ...prev,
      stops: (prev.stops ?? []).filter((_, i) => i !== index),
    }));
  };

  // Vehicle type toggle
  const toggleVehicleType = (vt: string) => {
    setForm((prev) => {
      const current = prev.requiredVehicleTypes ?? [];
      const next = current.includes(vt)
        ? current.filter((t) => t !== vt)
        : [...current, vt];
      return { ...prev, requiredVehicleTypes: next };
    });
  };

  const handleSave = () => {
    if (!form.jobNumber?.trim() || !form.customerName?.trim()) return;
    const now = new Date().toISOString();
    const finalJob: Job = {
      id: job?.id ?? `job-${Date.now()}`,
      jobNumber: form.jobNumber ?? "NEW-0001",
      status: form.status ?? "draft",
      priority: form.priority ?? "normal",
      routeTemplateId: form.routeTemplateId,
      stops: form.stops ?? [],
      directLeadTimeHours: form.directLeadTimeHours,
      requiredVehicleTypes: form.requiredVehicleTypes ?? [],
      trailerPlate: form.trailerPlate,
      assignedVehiclePlate: form.assignedVehiclePlate,
      assignedDriverName: form.assignedDriverName,
      branch: form.branch ?? BRANCHES[0],
      customerName: form.customerName ?? "",
      customerContact: form.customerContact ?? "",
      customerPhone: form.customerPhone ?? "",
      quotedPrice: form.quotedPrice,
      currency: form.currency ?? "THB",
      createdAt: job?.createdAt ?? now,
      updatedAt: now,
      notes: form.notes ?? "",
    };
    onSave(finalJob);
  };

  const isTemplateMode = !!form.routeTemplateId || form.stops?.length === 0 && !form.directLeadTimeHours;
  const isValid = form.jobNumber?.trim() && form.customerName?.trim();

  return (
    <ModalShell onClose={onClose}>
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border, #e5e7eb)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>
            {mode === "create" ? "Create Job" : "Edit Job"}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "20px",
              color: "var(--text-muted, #6b7280)",
              padding: "4px 8px",
              borderRadius: "6px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div
          style={{
            padding: "20px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {/* ── Section 1: Route Template ─────────────────────────────── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
            }}
          >
            <div style={{ gridColumn: "1 / -1" }}>
              <Field label="Route Type">
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "14px" }}>
                    <input
                      type="radio"
                      name="routeMode"
                      checked={!form.directLeadTimeHours}
                      onChange={() => handleTemplateChange(form.routeTemplateId ?? ROUTE_TEMPLATES[0].id)}
                    />
                    Route Template
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "14px" }}>
                    <input
                      type="radio"
                      name="routeMode"
                      checked={!!form.directLeadTimeHours}
                      onChange={() => handleTemplateChange("__direct__")}
                    />
                    Direct (Lead Time)
                  </label>
                </div>
              </Field>
            </div>

            {!form.directLeadTimeHours ? (
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Select Route Template">
                  <select
                    style={selectStyle}
                    value={form.routeTemplateId ?? ""}
                    onChange={(e) => handleTemplateChange(e.target.value)}
                  >
                    <option value="">— Choose a template —</option>
                    {ROUTE_TEMPLATES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.branch}) — {t.totalDurationHours}h / {t.stops.length} stops
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            ) : (
              <Field label="Lead Time (hours)">
                <input
                  style={inputStyle}
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={form.directLeadTimeHours ?? 1}
                  onChange={(e) =>
                    update("directLeadTimeHours", parseFloat(e.target.value) || 1)
                  }
                />
              </Field>
            )}
          </div>

          {/* ── Section 2: Job Info ───────────────────────────────────── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
            }}
          >
            <Field label="Job Number *">
              <input
                style={inputStyle}
                value={form.jobNumber ?? ""}
                onChange={(e) => update("jobNumber", e.target.value)}
                placeholder="e.g. KSN-2024-0001"
              />
            </Field>

            <Field label="Branch">
              <select
                style={selectStyle}
                value={form.branch ?? ""}
                onChange={(e) => update("branch", e.target.value)}
              >
                {BRANCHES.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </Field>

            <Field label="Customer Name *">
              <input
                style={inputStyle}
                value={form.customerName ?? ""}
                onChange={(e) => update("customerName", e.target.value)}
                placeholder="ชื่อลูกค้า"
              />
            </Field>

            <Field label="Customer Phone">
              <input
                style={inputStyle}
                value={form.customerPhone ?? ""}
                onChange={(e) => update("customerPhone", e.target.value)}
                placeholder="08x-xxx-xxxx"
              />
            </Field>

            <Field label="Contact Person">
              <input
                style={inputStyle}
                value={form.customerContact ?? ""}
                onChange={(e) => update("customerContact", e.target.value)}
                placeholder="ผู้ติดต่อ"
              />
            </Field>

            <Field label="Status">
              <select
                style={selectStyle}
                value={form.status ?? ""}
                onChange={(e) => update("status", e.target.value as JobStatus)}
              >
                {Object.entries(JOB_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* ── Section 3: Priority & Vehicle ───────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <Field label="Priority">
              <div style={{ display: "flex", gap: "8px" }}>
                {(Object.entries(JOB_PRIORITY_LABELS) as [JobPriority, string][]).map(
                  ([value, label]) => (
                    <button
                      key={value}
                      onClick={() => update("priority", value)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        border: "1px solid",
                        borderColor:
                          form.priority === value
                            ? "var(--primary, #2563eb)"
                            : "var(--border, #e5e7eb)",
                        background:
                          form.priority === value
                            ? "var(--primary, #2563eb)"
                            : "transparent",
                        color:
                          form.priority === value ? "#fff" : "var(--text-primary, #111827)",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: 500,
                      }}
                    >
                      {label}
                    </button>
                  ),
                )}
              </div>
            </Field>

            <Field label="Required Vehicle Types">
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {VEHICLE_TYPES.map((vt) => {
                  const selected = form.requiredVehicleTypes?.includes(vt);
                  return (
                    <button
                      key={vt}
                      onClick={() => toggleVehicleType(vt)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        border: "1px solid",
                        borderColor: selected
                          ? "var(--primary, #2563eb)"
                          : "var(--border, #e5e7eb)",
                        background: selected ? "var(--primary, #2563eb)" : "transparent",
                        color: selected ? "#fff" : "var(--text-primary, #111827)",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: 500,
                      }}
                    >
                      {vt}
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label="Trailer Plate (optional)">
              <input
                style={{ ...inputStyle, width: "200px" }}
                value={form.trailerPlate ?? ""}
                onChange={(e) => update("trailerPlate", e.target.value)}
                placeholder="ทะเบียนตู้พ่วง (เปลี่ยนทุกวัน)"
              />
            </Field>
          </div>

          {/* ── Section 4: Stops (if using template) ─────────────────── */}
          {form.stops && form.stops.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <SectionLabel>Stops ({form.stops.length})</SectionLabel>
                <button
                  onClick={handleAddStop}
                  style={{
                    background: "none",
                    border: "1px dashed var(--border, #e5e7eb)",
                    borderRadius: "6px",
                    padding: "4px 12px",
                    cursor: "pointer",
                    fontSize: "13px",
                    color: "var(--primary, #2563eb)",
                  }}
                >
                  + Add Stop
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {form.stops.map((stop, i) => (
                  <div key={stop.id} style={{ position: "relative" }}>
                    <StopCard
                      stop={stop}
                      index={i}
                      onUpdate={(updated) => handleStopUpdate(i, updated)}
                    />
                    <button
                      onClick={() => handleRemoveStop(i)}
                      style={{
                        position: "absolute",
                        top: "8px",
                        right: "8px",
                        background: "#fee2e2",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "12px",
                        color: "#dc2626",
                        padding: "2px 8px",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Section 5: Notes ──────────────────────────────────────── */}
          <Field label="Notes">
            <textarea
              style={{ ...inputStyle, resize: "vertical", minHeight: "64px" }}
              value={form.notes ?? ""}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Additional notes..."
            />
          </Field>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 20px",
            borderTop: "1px solid var(--border, #e5e7eb)",
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "1px solid var(--border, #e5e7eb)",
              background: "transparent",
              cursor: "pointer",
              fontSize: "14px",
              color: "var(--text-primary, #111827)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid}
            style={{
              padding: "8px 20px",
              borderRadius: "8px",
              border: "none",
              background: isValid ? "var(--primary, #2563eb)" : "#9ca3af",
              color: "#fff",
              cursor: isValid ? "pointer" : "not-allowed",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            {mode === "create" ? "Create Job" : "Save Changes"}
          </button>
        </div>
    </ModalShell>
  );
}
