"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Customer, JobOrder } from "@/lib/types";

const STATUS_BADGE: Record<string, { bg: string; color: string }> = {
  draft: { bg: "#f3f4f6", color: "#374151" },
  confirmed: { bg: "#dbeafe", color: "#1d4ed8" },
  assigned: { bg: "#ede9fe", color: "#6d28d9" },
  in_progress: { bg: "#fef3c7", color: "#b45309" },
  completed: { bg: "#dcfce7", color: "#15803d" },
  cancelled: { bg: "#fee2e2", color: "#b91c1c" },
};

const PRIORITY_BADGE: Record<string, { bg: string; color: string }> = {
  low: { bg: "#f3f4f6", color: "#374151" },
  normal: { bg: "#dbeafe", color: "#1d4ed8" },
  high: { bg: "#fef3c7", color: "#b45309" },
  urgent: { bg: "#fee2e2", color: "#b91c1c" },
};

function Badge({ value, map }: { value: string; map: Record<string, { bg: string; color: string }> }) {
  const s = map[value] ?? { bg: "#f3f4f6", color: "#374151" };
  return <span style={{ background: s.bg, color: s.color, padding: "0.15rem 0.5rem", borderRadius: 4, fontSize: "0.75rem", fontWeight: 600 }}>{value.replace("_", " ")}</span>;
}

export default function JobsPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<JobOrder[]>([]);
  const [customers, setCustomers] = useState<Record<string, Customer>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "draft" | "confirmed" | "assigned">("all");

  useEffect(() => {
    Promise.all([
      fetch("/api/joborders").then((r) => r.json()),
      fetch("/api/customers").then((r) => r.json()),
    ]).then(([ordersData, customersData]) => {
      if (Array.isArray(ordersData)) setOrders(ordersData);
      if (Array.isArray(customersData)) {
        const map: Record<string, Customer> = {};
        customersData.forEach((c: Customer) => { map[c.id] = c; });
        setCustomers(map);
      }
    }).finally(() => setLoading(false));
  }, []);

  const filtered = orders.filter((o) => {
    if (filter === "all") return true;
    return o.status === filter;
  });

  const handleDelete = async (id: string) => {
    if (!confirm("ลบ job order นี้?")) return;
    await fetch(`/api/joborders?id=${id}`, { method: "DELETE" });
    setOrders((prev) => prev.filter((o) => o.id !== id));
  };

  const getCustomerName = (customerId: string) => customers[customerId]?.name ?? customerId;

  return (
    <div style={{ padding: "2rem", height: "100%", overflowY: "auto", background: "#f8fafc" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
          <button onClick={() => router.push("/")} style={{
            padding: "0.5rem 0.75rem", background: "#f1f5f9", color: "#475569",
            border: "1px solid #e2e8f0", borderRadius: "8px", cursor: "pointer",
            fontSize: "0.85rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.25rem"
          }}>
            ← กลับหน้า Gantt
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-0.02em" }}>
              Job Orders
            </h1>
            <p style={{ margin: "0.3rem 0 0 0", color: "#64748b", fontSize: "0.95rem" }}>
              แสดงผล {filtered.length} รายการ
            </p>
          </div>
          <button onClick={() => router.push("/jobs/create")} style={{
            padding: "0.6rem 1.25rem", background: "#2563eb", color: "white", 
            border: "none", borderRadius: "8px", cursor: "pointer", 
            fontSize: "0.9rem", fontWeight: 600, boxShadow: "0 2px 4px rgba(37,99,235,0.2)",
            transition: "all 0.15s"
          }}
          onMouseOver={(e) => (e.currentTarget.style.transform = "translateY(-1px)")}
          onMouseOut={(e) => (e.currentTarget.style.transform = "translateY(0)")}
          >
            + สร้าง Job ใหม่
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap", padding: "4px", background: "#fff", borderRadius: "10px", width: "fit-content", border: "1px solid #e2e8f0", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}>
          {(["all", "draft", "confirmed", "assigned"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "0.4rem 1rem",
              border: "none",
              background: filter === f ? "#f1f5f9" : "transparent",
              color: filter === f ? "#0f172a" : "#64748b",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.85rem",
              fontWeight: filter === f ? 700 : 600,
              transition: "all 0.15s"
            }}>
              {f === "all" ? "ทั้งหมด" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "4rem", color: "#9ca3af", background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0" }}>กำลังโหลดข้อมูล...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem", color: "#64748b", background: "#fff", border: "1px dashed #cbd5e1", borderRadius: "12px" }}>
            ไม่มีข้อมูล Job Order — <button onClick={() => router.push("/jobs/create")} style={{ color: "#2563eb", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontWeight: 600 }}>สร้างออเดอร์แรก</button>
          </div>
        ) : (
          <div style={{ overflowX: "auto", background: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                  {["เลขที่", "ลูกค้า", "เส้นทาง", "วันที่", "เวลา", "รถ", "คนขับ", "ตู้", "สถานะ", ""].map((h) => (
                    <th key={h} style={{ padding: "0.85rem 1rem", fontWeight: 700, color: "#475569", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
              {filtered.map((o) => (
                <tr key={o.id} style={{ borderBottom: "1px solid #f1f5f9", transition: "background 0.15s" }} onMouseOver={(e) => (e.currentTarget.style.background = "#f8fafc")} onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "0.85rem 1rem", fontFamily: "monospace", fontWeight: 600, color: "#0f172a", whiteSpace: "nowrap" }}>{o.jobNumber}</td>
                  <td style={{ padding: "0.85rem 1rem", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#334155", fontWeight: 500 }} title={getCustomerName(o.customerId)}>
                    {getCustomerName(o.customerId)}
                  </td>
                  <td style={{ padding: "0.85rem 1rem", color: "#64748b", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {o.routeSnapshot.name}
                  </td>
                  <td style={{ padding: "0.85rem 1rem", whiteSpace: "nowrap", color: "#334155" }}>
                    {o.plannedStartDate}
                  </td>
                  <td style={{ padding: "0.85rem 1rem", fontFamily: "monospace", whiteSpace: "nowrap", color: "#334155" }}>
                    {o.plannedStartTime}
                    <span style={{ color: "#9ca3af", fontSize: "0.75rem", marginLeft: "0.4rem" }}>
                      ({o.routeSnapshot.totalDurationHours}h)
                    </span>
                  </td>
                  <td style={{ padding: "0.85rem 1rem", fontFamily: "monospace", whiteSpace: "nowrap", fontWeight: 600, color: "#0f172a" }}>
                    {o.vehiclePlate ?? <span style={{ color: "#cbd5e1" }}>—</span>}
                  </td>
                  <td style={{ padding: "0.85rem 1rem", whiteSpace: "nowrap", color: "#475569" }}>
                    {o.driverName ?? <span style={{ color: "#cbd5e1" }}>—</span>}
                  </td>
                  <td style={{ padding: "0.85rem 1rem", fontFamily: "monospace", whiteSpace: "nowrap" }}>
                    {(o.trailerPlate || o.requireTrailer) ? (
                      <span 
                        title={o.trailerPlate ? `ตู้: ${o.trailerPlate}` : "รอพ่วงตู้"}
                        style={{ background: o.trailerPlate ? "#fef3c7" : "#fee2e2", color: o.trailerPlate ? "#b45309" : "#b91c1c", padding: "0.15rem 0.4rem", borderRadius: 4, fontSize: "0.75rem", fontWeight: 800, cursor: "help" }}
                      >
                        {o.trailerPlate ? "FT" : "C"}
                      </span>
                    ) : (
                      <span style={{ color: "#cbd5e1" }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: "0.85rem 1rem" }}>
                    <Badge value={o.status} map={STATUS_BADGE} />
                  </td>
                  <td style={{ padding: "0.85rem 1rem", whiteSpace: "nowrap", textAlign: "right" }}>
                    <button onClick={() => handleDelete(o.id)} style={{ background: "none", border: "none", color: "#dc2626", cursor: "pointer", fontSize: "0.8rem", padding: "0.2rem 0.4rem" }}>
                      ลบ
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </div>
  );
}

function btn(bg: string): React.CSSProperties {
  return { padding: "0.4rem 1rem", background: bg, color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontSize: "0.875rem", fontWeight: 600 };
}
