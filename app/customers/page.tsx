"use client";

export { default } from "./CustomersPageImpl";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Customer } from "@/lib/types";

function CustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/customers")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setCustomers(data); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ padding: "2rem", height: "100%", overflowY: "auto", background: "#f8fafc" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
        <button onClick={() => router.push("/")} style={{
          padding: "0.5rem 0.75rem", background: "#f1f5f9", color: "#475569",
          border: "1px solid #e2e8f0", borderRadius: "8px", cursor: "pointer",
          fontSize: "0.85rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.25rem", marginRight: "auto"
        }}>
          ← กลับหน้า Gantt
        </button>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "1rem", flex: 1, justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.02em" }}>Customer Directory</h1>
            <p style={{ margin: "0.3rem 0 0 0", color: "#64748b", fontSize: "0.95rem" }}>
              จัดการข้อมูลลูกค้าทั้งหมด ({customers.length} รายการ)
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={() => router.push("/customers/create")} style={{
              padding: "0.6rem 1.25rem", background: "#2563eb", color: "white", 
              border: "none", borderRadius: "8px", cursor: "pointer", 
              fontSize: "0.9rem", fontWeight: 600, boxShadow: "0 2px 4px rgba(37,99,235,0.2)",
              transition: "all 0.15s"
            }}
            onMouseOver={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
            onMouseOut={(e) => (e.currentTarget.style.transform = "translateY(0)")}
            >+ เพิ่มลูกค้า</button>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "#9ca3af", background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0" }}>กำลังโหลดข้อมูล...</div>
      ) : customers.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "#64748b", background: "#fff", border: "1px dashed #cbd5e1", borderRadius: "12px" }}>
          ยังไม่มีลูกค้า — <button onClick={() => router.push("/customers/create")} style={{ color: "#2563eb", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontWeight: 600 }}>เพิ่มตัวแรก</button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
          {customers.map((c) => (
            <div key={c.id} style={{ 
              background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "1.25rem", 
              display: "flex", flexDirection: "column", justifyContent: "space-between",
              boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)",
              transition: "transform 0.15s, box-shadow 0.15s",
              cursor: "pointer"
            }}
            onClick={() => router.push(`/customers/${c.id}`)}
            onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 10px 15px -3px rgba(0,0,0,0.05)"; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 1px 3px 0 rgba(0,0,0,0.05)"; }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                  <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "#0f172a", letterSpacing: "-0.01em" }}>{c.name}</div>
                  <div style={{ padding: "0.25rem 0.5rem", background: "#f1f5f9", borderRadius: "6px", fontSize: "0.75rem", color: "#475569", fontWeight: 600 }}>ID: {c.id.substring(0,6)}</div>
                </div>
                
                <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", fontSize: "0.85rem", color: "#64748b", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "1rem" }}>📍</span> 
                  <span style={{ lineHeight: 1.4 }}>{c.address || "ยังไม่มีข้อมูลที่อยู่"}</span>
                </div>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #f1f5f9" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "#475569" }}>
                    <span style={{ color: "#94a3b8" }}>👤</span> <span style={{ fontWeight: 500 }}>{c.contactName || "ไม่มีชื่อผู้ติดต่อ"}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "#475569" }}>
                    <span style={{ color: "#94a3b8" }}>📞</span> <span style={{ fontFamily: "monospace", fontSize: "0.9rem" }}>{c.phone || "—"}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}

const btn = (bg: string): React.CSSProperties => ({ padding: "0.4rem 1rem", background: bg, color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontSize: "0.875rem", fontWeight: 600 });
