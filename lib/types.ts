// ── Customer ─────────────────────────────────────────────────────────────────
export type Customer = {
  id: string;
  name: string;
  contactName: string;
  phone: string;
  address: string;       // primary address ของลูกค้า
  createdAt: string;
  updatedAt: string;
};

// ── Route ────────────────────────────────────────────────────────────────────
// Route = เส้นทางสำเร็จรูปของลูกค้า (เช่น "KSN→BKK Central Delivery")
// มี stops + estimated duration + vehicle type requirement

export type RouteStop = {
  label: string;
  address: string;
  contactName: string;
  contactPhone: string;
  /** เวลาทำที่จุดนี้ (loading/unloading) — ในหน่วยชั่วโมงทศนิยม เช่น 0.5 = 30 นาที */
  dwellHours: number;
  /** เวลาเดินทางจากจุดก่อน — ในหน่วยชั่วโมงทศนิยม เช่น 1.5 = 1 ชม 30 นาที */
  transitHours: number;
  order: number;
};

export type Route = {
  id: string;
  customerId: string;
  name: string;
  description: string;
  stops: RouteStop[];
  /** ประเภทรถที่ต้องการ เช่น ["6W", "10W"] */
  requiredVehicleTypes?: string[];
  /** งาน return จากปลายทางกลับต้นทาง */
  returnInfo?: {
    enabled: boolean;
    label: string;
    address: string;
    dwellHours: number;
    transitHours: number;
  };
  /** รวม transit + dwell (loading/unloading) ทั้งหมด */
  totalDurationHours: number;
  createdAt: string;
  updatedAt: string;
};

// ── Job Order ─────────────────────────────────────────────────────────────────
// JobOrder = งานที่สร้างจาก Route + Schedule

export type JobOrderStatus =
  | "draft"
  | "confirmed"
  | "assigned"
  | "in_progress"
  | "completed"
  | "cancelled";

export type JobOrderPriority = "low" | "normal" | "high" | "urgent";

export type JobOrder = {
  id: string;
  jobNumber: string;
  customerId: string;
  routeId: string;
  // Snapshot ณ วันสร้าง — route อาจเปลี่ยนแต่ job order เก็บ data ตายตัว
  routeSnapshot: {
    name: string;
    stops: RouteStop[];
    totalDurationHours: number;
    requiredVehicleTypes: string[];
  };
  includeReturnTrip?: boolean;
  // Schedule
  plannedStartDate: string;   // "YYYY-MM-DD"
  plannedStartTime: string;  // "HH:mm"
  plannedStart: number;      // absolute hour index from today midnight (computed)
  // Assignment
  vehiclePlate?: string;
  driverName?: string;
  trailerPlate?: string;
  // Status
  status: JobOrderStatus;
  priority: JobOrderPriority;
  // Pricing
  quotedPrice?: number;
  currency?: string;
  // Notes
  notes?: string;
  // Meta
  createdAt: string;
  updatedAt: string;
};

// ── Vehicle (existing, imported from mockVehicles) ─────────────────────────────
// type Vehicle = { licensePlate, vehicleType, engineType, branch }
