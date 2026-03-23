"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Vehicle } from "@/lib/types";
import { TRUCK_TYPE_OPTIONS } from "@/lib/truckTypes";
import { ModalShell } from "@/components/ui/ModalShell";
import { Icon } from "@/components/ui/Icon";
import PlusIcon from "@/assets/icons/PlusIcon.svg?url";
import EditIcon from "@/assets/icons/EditIcon.svg?url";
import DeleteIcon from "@/assets/icons/DeleteIcon.svg?url";
import XIcon from "@/assets/icons/XIcon.svg?url";

const BRANCH_OPTIONS = ["KSN", "CHO", "AYA", "BBT", "RA2"] as const;
const ENGINE_OPTIONS = ["ICE", "EV"] as const;

export default function VehiclesPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [licensePlate, setLicensePlate] = useState("");
  const [vehicleType, setVehicleType] = useState<string>("");
  const [engineType, setEngineType] = useState<string>("");
  const [branch, setBranch] = useState<string>("");

  const [filterBranch, setFilterBranch] = useState<string>("");
  const [filterVehicleType, setFilterVehicleType] = useState<string>("");

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = () => {
    setLoading(true);
    fetch("/api/vehicles")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setVehicles(data);
        else if (data.error) setError(data.error);
      })
      .catch(() => setError("โหลดข้อมูลไม่ได้"))
      .finally(() => setLoading(false));
  };

  const filteredVehicles = vehicles.filter((v) => {
    if (filterBranch && v.branch !== filterBranch) return false;
    if (filterVehicleType && v.vehicleType !== filterVehicleType) return false;
    return true;
  });

  const resetForm = () => {
    setShowModal(false);
    setEditingId(null);
    setLicensePlate("");
    setVehicleType("");
    setEngineType("");
    setBranch("");
    setFormError(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (v: Vehicle) => {
    setEditingId(v.id);
    setLicensePlate(v.licensePlate);
    setVehicleType(v.vehicleType);
    setEngineType(v.engineType);
    setBranch(v.branch);
    setFormError(null);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!licensePlate.trim()) { setFormError("กรุณากรอกทะเบียนรถ"); return; }
    if (!vehicleType) { setFormError("กรุณาเลือกประเภทรถ"); return; }
    if (!engineType) { setFormError("กรุณาเลือกเครื่องยนต์"); return; }
    if (!branch) { setFormError("กรุณาเลือกสาขา"); return; }

    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch("/api/vehicles", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId ?? undefined,
          licensePlate: licensePlate.trim(),
          vehicleType,
          engineType,
          branch,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "บันทึกไม่สำเร็จ");

      if (editingId) {
        setVehicles((p) => p.map((v) => (v.id === editingId ? data : v)));
      } else {
        setVehicles((p) => [data, ...p]);
      }
      resetForm();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/vehicles?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "ลบไม่สำเร็จ");
        return;
      }
      setVehicles((p) => p.filter((v) => v.id !== id));
    } catch {
      alert("ลบไม่สำเร็จ");
    } finally {
      setDeleteConfirm(null);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div style={{ padding: "1rem", height: "100%", overflowY: "auto", background: "#f8fafc" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
          <button onClick={() => router.push("/")} style={secondaryBtnStyle}>
            Back
          </button>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "1rem", flex: 1, justifyContent: "space-between" }}>
            <div>
              <h1 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.02em" }}>
                รถบรรทุก
                <span style={{ fontWeight: 400, color: "#64748b", fontSize: "1rem" }}>({filteredVehicles.length} คัน)</span>
              </h1>
            </div>
            <button onClick={openCreate} style={primaryBtnStyle}>
              <Icon src={PlusIcon} width={18} height={18} />
              เพิ่มรถ
            </button>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
          <select value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)} style={selectStyle}>
            <option value="">ทุกสาขา</option>
            {BRANCH_OPTIONS.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <select value={filterVehicleType} onChange={(e) => setFilterVehicleType(e.target.value)} style={selectStyle}>
            <option value="">ทุกประเภทรถ</option>
            {TRUCK_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          {(filterBranch || filterVehicleType) && (
            <button onClick={() => { setFilterBranch(""); setFilterVehicleType(""); }} style={clearBtnStyle}>
              ล้างตัวกรอง
            </button>
          )}
        </div>

        {/* Error */}
        {error && <div style={errorStyle}>❌ {error}</div>}

        {/* Table */}
        {loading ? (
          <div style={emptyStyle}>กำลังโหลด...</div>
        ) : filteredVehicles.length === 0 ? (
          <div style={emptyStyle}>
            {vehicles.length === 0 ? "ยังไม่มีรถบรรทุก" : "ไม่พบรถที่ตรงกับตัวกรอง"}
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={thStyle}>ทะเบียน</th>
                  <th style={thStyle}>ประเภท</th>
                  <th style={thStyle}>เครื่องยนต์</th>
                  <th style={thStyle}>สาขา</th>
                  <th style={thStyle}>สร้างเมื่อ</th>
                  <th style={{ ...thStyle, width: 100 }}>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredVehicles.map((v) => (
                  <tr key={v.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={tdStyle}>
                      <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "0.95rem" }}>{v.licensePlate}</span>
                    </td>
                    <td style={tdStyle}>
                      <span style={badgeStyle("#ede9fe", "#6d28d9")}>{v.vehicleType}</span>
                    </td>
                    <td style={tdStyle}>
                      <span style={badgeStyle(v.engineType === "EV" ? "#dcfce7" : "#fef3c7", v.engineType === "EV" ? "#15803d" : "#b45309")}>
                        {v.engineType}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={badgeStyle("#f1f5f9", "#475569")}>{v.branch}</span>
                    </td>
                    <td style={{ ...tdStyle, color: "#94a3b8", fontSize: "0.85rem" }}>
                      {formatDate(v.createdAt)}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>
                      <div style={{ display: "flex", gap: "0.25rem", justifyContent: "center" }}>
                        <button onClick={() => openEdit(v)} style={actionBtnStyle("#2563eb")} title="แก้ไข">
                          <Icon src={EditIcon} width={16} height={16} />
                        </button>
                        {deleteConfirm === v.id ? (
                          <div style={{ display: "flex", gap: "0.25rem" }}>
                            <button onClick={() => handleDelete(v.id)} style={actionBtnStyle("#dc2626")} title="ยืนยันลบ">
                              <span style={{ fontSize: "0.7rem", fontWeight: 700 }}>ลบ</span>
                            </button>
                            <button onClick={() => setDeleteConfirm(null)} style={actionBtnStyle("#6b7280")} title="ยกเลิก">
                              <Icon src={XIcon} width={14} height={14} />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => setDeleteConfirm(v.id)} style={actionBtnStyle("#dc2626")} title="ลบ">
                            <Icon src={DeleteIcon} width={16} height={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <ModalShell onClose={resetForm} maxWidth={480}>
          <div style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#0f172a", margin: 0 }}>
                {editingId ? "แก้ไขรถ" : "เพิ่มรถใหม่"}
              </h2>
              <button onClick={resetForm} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8" }}>
                <Icon src={XIcon} width={20} height={20} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div>
                <label style={labelStyle}>ทะเบียนรถ *</label>
                <input
                  type="text"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                  placeholder="เช่น 69-3320"
                  style={inputStyle}
                  autoFocus
                />
              </div>

              <div>
                <label style={labelStyle}>ประเภทรถ *</label>
                <select value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} style={inputStyle}>
                  <option value="">— เลือกประเภท —</option>
                  {TRUCK_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={labelStyle}>เครื่องยนต์ *</label>
                  <select value={engineType} onChange={(e) => setEngineType(e.target.value)} style={inputStyle}>
                    <option value="">— เลือก —</option>
                    {ENGINE_OPTIONS.map((e) => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>สาขา *</label>
                  <select value={branch} onChange={(e) => setBranch(e.target.value)} style={inputStyle}>
                    <option value="">— เลือกสาขา —</option>
                    {BRANCH_OPTIONS.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
              </div>

              {formError && <div style={errorStyle}>❌ {formError}</div>}

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button onClick={handleSave} disabled={saving} style={{ ...primaryBtnStyle, opacity: saving ? 0.6 : 1, flex: 1 }}>
                  {saving ? "กำลังบันทึก..." : editingId ? "บันทึกการแก้ไข" : "เพิ่มรถ"}
                </button>
                <button onClick={resetForm} style={secondaryBtnStyle}>ยกเลิก</button>
              </div>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = { padding: "0.75rem 1rem", textAlign: "left", fontSize: "0.8rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" };
const tdStyle: React.CSSProperties = { padding: "0.85rem 1rem", fontSize: "0.9rem", color: "#374151" };
const labelStyle: React.CSSProperties = { display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.35rem" };
const inputStyle: React.CSSProperties = { width: "100%", padding: "0.6rem 0.75rem", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "0.9rem", boxSizing: "border-box" };
const selectStyle: React.CSSProperties = { ...inputStyle, cursor: "pointer", background: "#fff" };
const errorStyle: React.CSSProperties = { padding: "0.75rem", background: "#fee2e2", color: "#dc2626", borderRadius: "8px", fontSize: "0.875rem", marginBottom: "1rem" };
const emptyStyle: React.CSSProperties = { textAlign: "center", padding: "4rem", color: "#9ca3af", background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0" };

const iconBtnStyle = (color: string): React.CSSProperties => ({
  padding: "0.5rem", background: "#f1f5f9", color, border: "1px solid #e2e8f0",
  borderRadius: "8px", cursor: "pointer", display: "flex", alignItems: "center",
});

const primaryBtnStyle: React.CSSProperties = {
  padding: "0.6rem 1.25rem", background: "#2563eb", color: "white",
  border: "none", borderRadius: "8px", cursor: "pointer",
  fontSize: "0.9rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.4rem",
  boxShadow: "0 2px 4px rgba(37,99,235,0.2)",
};

const secondaryBtnStyle: React.CSSProperties = {
  padding: "0.6rem 1.25rem", background: "#f1f5f9", color: "#374151",
  border: "1px solid #e2e8f0", borderRadius: "8px", cursor: "pointer",
  fontSize: "0.9rem", fontWeight: 600,
};

const clearBtnStyle: React.CSSProperties = {
  padding: "0.5rem 1rem", background: "none", color: "#2563eb",
  border: "1px solid #2563eb", borderRadius: "8px", cursor: "pointer",
  fontSize: "0.85rem", fontWeight: 600,
};

const actionBtnStyle = (color: string): React.CSSProperties => ({
  padding: "0.35rem 0.5rem", background: "none", color,
  border: "1px solid #e5e7eb", borderRadius: "6px", cursor: "pointer",
  display: "flex", alignItems: "center",
});

const badgeStyle = (bg: string, color: string): React.CSSProperties => ({
  padding: "0.25rem 0.6rem", background: bg, color,
  borderRadius: "20px", fontSize: "0.78rem", fontWeight: 700,
});
