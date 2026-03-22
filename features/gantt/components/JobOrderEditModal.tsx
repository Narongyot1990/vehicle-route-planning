"use client";

import { ModalShell } from "@/components/ui/ModalShell";
import { useJobOrderEditForm } from "@/features/gantt/hooks/useJobOrderEditForm";
import { JobOrderEditFormFields } from "@/features/gantt/components/JobOrderEditFormFields";

type JobOrderEditModalProps = {
  jobOrderId: string;
  onClose: () => void;
  onSaved: () => void;
};

export function JobOrderEditModal({ jobOrderId, onClose, onSaved }: JobOrderEditModalProps) {
  const state = useJobOrderEditForm(jobOrderId, onSaved, onClose);
  const { jo, loading, error, saving, handleSave } = state;

  return (
    <ModalShell onClose={onClose} maxWidth={560}>
        {/* Header */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>
              แก้ไข Job Order
            </h2>
            {jo && (
              <span style={{ fontSize: 12, color: "#6b7280", fontFamily: "monospace" }}>
                {jo.jobNumber}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 20,
              color: "#6b7280",
              padding: "4px 8px",
              borderRadius: 6,
            }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: 20, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "#9ca3af" }}>โหลด...</div>
          ) : !jo ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "#dc2626" }}>{error ?? "ไม่พบข้อมูล"}</div>
          ) : (
            <JobOrderEditFormFields state={state} />
          )}

          {error && jo && (
            <div style={{ padding: "8px 12px", background: "#fee2e2", color: "#dc2626", borderRadius: 8, fontSize: 13 }}>
              ❌ {error}
            </div>
          )}
        </div>

        {/* Footer */}
        {jo && (
          <div
            style={{
              padding: "12px 20px",
              borderTop: "1px solid #e5e7eb",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontSize: 11, color: "#9ca3af" }}>
              สร้าง {new Date(jo.createdAt).toLocaleDateString("th-TH")}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={onClose} style={cancelBtnStyle}>
                ยกเลิก
              </button>
              <button onClick={handleSave} disabled={saving} style={saveBtnStyle(saving)}>
                {saving ? "กำลังบันทึก..." : "💾 บันทึก"}
              </button>
            </div>
          </div>
        )}
    </ModalShell>
  );
}

// ── Footer Styles ────────────────────────────────────────

const cancelBtnStyle: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 8,
  border: "1px solid #d1d5db",
  background: "transparent",
  cursor: "pointer",
  fontSize: 13,
  color: "#374151",
};

function saveBtnStyle(saving: boolean): React.CSSProperties {
  return {
    padding: "8px 20px",
    borderRadius: 8,
    border: "none",
    background: saving ? "#9ca3af" : "#16a34a",
    color: "#fff",
    cursor: saving ? "not-allowed" : "pointer",
    fontSize: 13,
    fontWeight: 600,
  };
}
