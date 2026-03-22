"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";

export default function CreateCustomerPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [contactName, setContactName] = useState("");

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("ชื่อลูกค้าต้องมี"); return; }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          address: address.trim(),
          phone: phone.trim(),
          contactName: contactName.trim(),
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? "สร้างลูกค้าล้มเหลว"); }
      router.push("/customers");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setSubmitting(false);
    }
  }, [name, address, phone, contactName, router]);

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "1.5rem 1rem", minHeight: "100vh" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
        <button onClick={() => router.push("/customers")} style={btn("#374151")}>← กลับ</button>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>เพิ่มลูกค้าใหม่</h1>
      </div>

      <form onSubmit={handleSubmit} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: "1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <div>
          <label style={labelStyle}>ชื่อลูกค้า *</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="บริษัท ตัวอย่าง จำกัด" style={inputStyle} autoFocus />
        </div>
        <div>
          <label style={labelStyle}>ที่อยู่</label>
          <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} placeholder="ที่อยู่ลูกค้า" style={{ ...inputStyle, resize: "vertical" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <div>
            <label style={labelStyle}>เบอร์โทร</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08x-xxx-xxxx" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>ผู้ติดต่อ</label>
            <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="ชื่อผู้ติดต่อ" style={inputStyle} />
          </div>
        </div>

        {error && <div style={errorStyle}>❌ {error}</div>}

        <button type="submit" disabled={submitting} style={{ ...btn("#16a34a"), opacity: submitting ? 0.6 : 1, fontSize: "1rem", padding: "0.65rem", marginTop: "0.25rem" }}>
          {submitting ? "กำลังบันทึก..." : "💾 บันทึกลูกค้า"}
        </button>
      </form>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "block", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", marginBottom: "0.25rem" };
const inputStyle: React.CSSProperties = { width: "100%", padding: "0.4rem 0.6rem", border: "1px solid #d1d5db", borderRadius: 6, fontSize: "0.875rem", boxSizing: "border-box", background: "#fff" };
const btn = (bg: string): React.CSSProperties => ({ padding: "0.4rem 1rem", background: bg, color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontSize: "0.875rem", fontWeight: 600 });
const errorStyle: React.CSSProperties = { padding: "0.65rem", background: "#fee2e2", color: "#dc2626", borderRadius: 8, fontSize: "0.875rem" };
