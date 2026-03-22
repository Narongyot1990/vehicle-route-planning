"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Customer } from "@/lib/types";

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [contactName, setContactName] = useState("");

  useEffect(() => {
    if (!id) return;
    fetch(`/api/customers?id=${id}`)
      .then((r) => r.json())
      .then((cust) => {
        if (cust.error) { setError(cust.error); return; }
        setCustomer(cust);
        setName(cust.name ?? "");
        setAddress(cust.address ?? "");
        setPhone(cust.phone ?? "");
        setContactName(cust.contactName ?? "");
      })
      .catch(() => setError("โหลดข้อมูลไม่ได้"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("ชื่อลูกค้าต้องมี"); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/customers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, name: name.trim(), address: address.trim(), phone: phone.trim(), contactName: contactName.trim() }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }, [id, name, address, phone, contactName]);

  const handleDelete = useCallback(async () => {
    if (!confirm(`ลบลูกค้า "${customer?.name}"? (routes + job orders ของลูกค้านี้จะถูกลบด้วย)`)) return;
    setDeleting(true);
    try {
      await fetch(`/api/customers?id=${id}`, { method: "DELETE" });
      router.push("/customers");
    } catch {
      setError("ลบไม่ได้");
      setDeleting(false);
    }
  }, [id, customer, router]);

  if (loading) return <div style={{ padding: "3rem", textAlign: "center", color: "#9ca3af" }}>โหลด...</div>;
  if (error && !customer) return <div style={{ padding: "3rem", textAlign: "center", color: "#dc2626" }}>{error}</div>;

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "1.5rem 1rem", minHeight: "100vh" }}>
      {/* Nav */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
        <button onClick={() => router.push("/customers")} style={btn("#374151")}>← กลับ</button>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>{customer?.name ?? "ลูกค้า"}</h1>
        {saved && <span style={{ color: "#16a34a", fontSize: "0.875rem" }}>✅ บันทึกแล้ว</span>}
      </div>

      {error && <div style={errorStyle}>❌ {error}</div>}

      {/* Edit form */}
      <form onSubmit={handleSave} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1rem" }}>
        <div>
          <label style={labelStyle}>ชื่อลูกค้า *</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>ที่อยู่</label>
          <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <div>
            <label style={labelStyle}>เบอร์โทร</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>ผู้ติดต่อ</label>
            <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} style={inputStyle} />
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
          <button type="submit" disabled={saving} style={{ ...btn("#16a34a"), opacity: saving ? 0.6 : 1 }}>
            {saving ? "กำลังบันทึก..." : "💾 บันทึก"}
          </button>
          <button type="button" onClick={handleDelete} disabled={deleting} style={{ ...btn("#dc2626"), opacity: deleting ? 0.6 : 1 }}>
            {deleting ? "กำลังลบ..." : "🗑️ ลบลูกค้า"}
          </button>
        </div>
      </form>

      {/* Link to routes */}
      <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#15803d" }}>🗺 เส้นทางของลูกค้านี้</div>
          <div style={{ fontSize: "0.78rem", color: "#6b7280", marginTop: "0.2rem" }}>ดู / เพิ่ม / แก้ไข Routes</div>
        </div>
        <button onClick={() => router.push(`/routes?customerId=${id}`)} style={btn("#15803d")}>
          ดู Routes →
        </button>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", marginBottom: "0.25rem" };
const inputStyle: React.CSSProperties = { width: "100%", padding: "0.4rem 0.6rem", border: "1px solid #d1d5db", borderRadius: 6, fontSize: "0.875rem", boxSizing: "border-box", background: "#fff" };
const btn = (bg: string): React.CSSProperties => ({ padding: "0.4rem 0.75rem", background: bg, color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontSize: "0.875rem", fontWeight: 600 });
const errorStyle: React.CSSProperties = { padding: "0.65rem", background: "#fee2e2", color: "#dc2626", borderRadius: 8, fontSize: "0.875rem", marginBottom: "1rem" };
