import { getStopColor } from "@/features/gantt/types/job";

export type RouteStop = {
  id: string;
  label: string;
  address: string;
  contactName: string;
  contactPhone: string;
  timeWindowStart: string;
  timeWindowEnd: string;
  transitFromPrevHours: number;
  order: number;
  color: string;
};

export type RouteTemplate = {
  id: string;
  name: string;
  branch: string;
  description: string;
  stops: RouteStop[];
  vehicleTypeRequirement: string[];
  totalDurationHours: number;
};

function computeTotalDuration(stops: RouteStop[]): number {
  return stops.reduce((sum, s) => sum + s.transitFromPrevHours, 0);
}

function makeStops(stops: Omit<RouteStop, "color">[]): RouteStop[] {
  return stops.map((s, i) => ({ ...s, color: getStopColor(s.label, i) }));
}

export const ROUTE_TEMPLATES: RouteTemplate[] = [
  // ── KSN Branch ─────────────────────────────────────────────────────────────
  {
    id: "rt-ksn-001",
    name: "KSN → BKK Central Delivery",
    branch: "KSN",
    description: "รับสินค้าจาก KSN ไปส่ง BKK Hub กลาง",
    vehicleTypeRequirement: ["6W", "10W"],
    totalDurationHours: 0,
    stops: makeStops([
      { id: "rt-ksn-001-s1", label: "Pickup", address: "99 หมู่ 5 ถนนเพชรเกษม แขวงคลองต้นไทร เขตคลองสามวา กรุงเทพฯ 10510", contactName: "พี่สมชาย", contactPhone: "081-234-5678", timeWindowStart: "07:00", timeWindowEnd: "08:00", transitFromPrevHours: 0, order: 1 },
      { id: "rt-ksn-001-s2", label: "Delivery Hub 1", address: "999 ถนนพหลโยธิน แขวงจตุจักร เขตจตุจักร กรุงเทพฯ 10900", contactName: "พี่แดง", contactPhone: "082-345-6789", timeWindowStart: "09:00", timeWindowEnd: "11:00", transitFromPrevHours: 1.5, order: 2 },
      { id: "rt-ksn-001-s3", label: "Delivery Hub 2", address: "88 ถนนรัชดาภิเษก แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพฯ 10310", contactName: "พี่เล็ก", contactPhone: "083-456-7890", timeWindowStart: "12:00", timeWindowEnd: "14:00", transitFromPrevHours: 2, order: 3 },
      { id: "rt-ksn-001-s4", label: "Return", address: "99 หมู่ 5 ถนนเพชรเกษม แขวงคลองต้นไทร เขตคลองสามวา กรุงเทพฯ 10510", contactName: "พี่สมชาย", contactPhone: "081-234-5678", timeWindowStart: "15:00", timeWindowEnd: "16:00", transitFromPrevHours: 1.5, order: 4 },
    ]),
  },

  // ── CHO Branch ──────────────────────────────────────────────────────────────
  {
    id: "rt-cho-001",
    name: "CHO Airport Express",
    branch: "CHO",
    description: "งานรับ-ส่งสนามบินสุวรรณภูมิ",
    vehicleTypeRequirement: ["6W", "10W", "Prime Mover"],
    totalDurationHours: 0,
    stops: makeStops([
      { id: "rt-cho-001-s1", label: "Pickup", address: "99 หมู่ 7 ถนนบางนา อำเภอบางพลี สมุทรปราการ 10540", contactName: "พี่โจ", contactPhone: "084-567-8901", timeWindowStart: "06:00", timeWindowEnd: "07:00", transitFromPrevHours: 0, order: 1 },
      { id: "rt-cho-001-s2", label: "Airport Cargo", address: "สนามบินสุวรรณภูมิ อำเภอบางพลี สมุทรปราการ 10540", contactName: "สำนักงานสินค้า", contactPhone: "02-123-4567", timeWindowStart: "08:00", timeWindowEnd: "10:00", transitFromPrevHours: 2, order: 2 },
      { id: "rt-cho-001-s3", label: "Delivery", address: "888 ถนนเฉลิมพระเกียรติ ระยอง 21000", contactName: "พี่ต้น", contactPhone: "085-678-9012", timeWindowStart: "12:00", timeWindowEnd: "14:00", transitFromPrevHours: 3, order: 3 },
    ]),
  },

  // ── AYA Branch ─────────────────────────────────────────────────────────────
  {
    id: "rt-aya-001",
    name: "AYA Industrial Park Run",
    branch: "AYA",
    description: "เส้นทางลัดในนิคมอุตสาหกรรม",
    vehicleTypeRequirement: ["4W", "6W"],
    totalDurationHours: 0,
    stops: makeStops([
      { id: "rt-aya-001-s1", label: "Pickup", address: "88 หมู่ 8 นิคมอุตสาหกรรม304 อำเภอปราจีนบุรี ปราจีนบุรี 25000", contactName: "พี่มาร์ค", contactPhone: "086-789-0123", timeWindowStart: "08:00", timeWindowEnd: "09:00", transitFromPrevHours: 0, order: 1 },
      { id: "rt-aya-001-s2", label: "Stop 1", address: "55 หมู่ 9 นิคมอุตสาหกรรม304 อำเภอปราจีนบุรี ปราจีนบุรี 25000", contactName: "พี่โฟกัส", contactPhone: "087-890-1234", timeWindowStart: "10:00", timeWindowEnd: "11:30", transitFromPrevHours: 1.5, order: 2 },
      { id: "rt-aya-001-s3", label: "Stop 2", address: "33 หมู่ 12 นิคมอุตสาหกรรม304 อำเภอปราจีนบุรี ปราจีนบุรี 25000", contactName: "พี่ซัม", contactPhone: "088-901-2345", timeWindowStart: "12:00", timeWindowEnd: "13:00", transitFromPrevHours: 1, order: 3 },
      { id: "rt-aya-001-s4", label: "Stop 3", address: "11 หมู่ 15 นิคมอุตสาหกรรม304 อำเภอปราจีนบุรี ปราจีนบุรี 25000", contactName: "พี่ดัน", contactPhone: "089-012-3456", timeWindowStart: "13:30", timeWindowEnd: "15:00", transitFromPrevHours: 1.5, order: 4 },
    ]),
  },

  // ── BBT Branch ──────────────────────────────────────────────────────────────
  {
    id: "rt-bbt-001",
    name: "BBT Food & Fresh Logistics",
    branch: "BBT",
    description: "งานขนส่งอาหารสด ตู้เย็น",
    vehicleTypeRequirement: ["4W", "6W"],
    totalDurationHours: 0,
    stops: makeStops([
      { id: "rt-bbt-001-s1", label: "Cold Storage Pickup", address: "77 หมู่ 3 ถนนบางนา-ตราด อำเภอบางคล้า ฉะเชิงเทรา 24000", contactName: "พี่วิน", contactPhone: "090-123-4567", timeWindowStart: "05:00", timeWindowEnd: "06:00", transitFromPrevHours: 0, order: 1 },
      { id: "rt-bbt-001-s2", label: "Restaurant A", address: "123 ถนนสุขุมวิท กรุงเทพฯ 10110", contactName: "คุณนิดา", contactPhone: "091-234-5678", timeWindowStart: "07:00", timeWindowEnd: "08:00", transitFromPrevHours: 1.5, order: 2 },
      { id: "rt-bbt-001-s3", label: "Restaurant B", address: "456 ถนนสีลม กรุงเทพฯ 10500", contactName: "คุณธนกฤต", contactPhone: "092-345-6789", timeWindowStart: "09:00", timeWindowEnd: "10:00", transitFromPrevHours: 1, order: 3 },
      { id: "rt-bbt-001-s4", label: "Restaurant C", address: "789 ถนนพระราม 3 กรุงเทพฯ 10120", contactName: "คุณภูริ", contactPhone: "093-456-7890", timeWindowStart: "11:00", timeWindowEnd: "12:00", transitFromPrevHours: 1.5, order: 4 },
    ]),
  },

  // ── RA2 Branch ──────────────────────────────────────────────────────────────
  {
    id: "rt-ra2-001",
    name: "RA2 Cross-Country Haul",
    branch: "RA2",
    description: "งานขนส่งระยะไกล กรุงเทพฯ → ภาคตะวันออก",
    vehicleTypeRequirement: ["10W", "Prime Mover"],
    totalDurationHours: 0,
    stops: makeStops([
      { id: "rt-ra2-001-s1", label: "Main Warehouse", address: "55 หมู่ 2 ถนนเทพารักษ์ อำเภอเมือง ชลบุรี 20000", contactName: "พี่โต", contactPhone: "094-567-8901", timeWindowStart: "07:00", timeWindowEnd: "08:00", transitFromPrevHours: 0, order: 1 },
      { id: "rt-ra2-001-s2", label: "Stop 1 - Rayong", address: "888 หมู่ 5 นิคมอุตสาหกรรมอีสเทิร์นซีบอร์ด ระยอง 21000", contactName: "พี่เอ็ม", contactPhone: "095-678-9012", timeWindowStart: "10:00", timeWindowEnd: "11:30", transitFromPrevHours: 2.5, order: 2 },
      { id: "rt-ra2-001-s3", label: "Stop 2 - Chonburi", address: "222 หมู่ 8 นิคมอุตสาหกรรมโรจนะ อำเภอพานทอง ชลบุรี 20150", contactName: "พี่ซี", contactPhone: "096-789-0123", timeWindowStart: "13:00", timeWindowEnd: "14:30", transitFromPrevHours: 2, order: 3 },
      { id: "rt-ra2-001-s4", label: "Stop 3 - Bangkok", address: "999 ถนนบางนาง กรุงเทพฯ 10540", contactName: "พี่จิม", contactPhone: "097-890-1234", timeWindowStart: "17:00", timeWindowEnd: "18:00", transitFromPrevHours: 3, order: 4 },
    ]),
  },
];

// Compute total durations
ROUTE_TEMPLATES.forEach((t) => {
  t.totalDurationHours = computeTotalDuration(t.stops);
});
