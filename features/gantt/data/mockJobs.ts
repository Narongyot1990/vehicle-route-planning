import type { Job } from "@/features/gantt/types/job";
import { getStopColor } from "@/features/gantt/types/job";
import { ROUTE_TEMPLATES } from "@/features/gantt/data/routeTemplates";

function makeId(prefix: string, n: number) {
  return `${prefix}-${String(n).padStart(4, "0")}`;
}

// Build a job from a route template
function makeJobFromTemplate(
  templateId: string,
  jobNumber: string,
  status: Job["status"],
  priority: Job["priority"],
  branch: string,
  startHourOffset: number,
  vehiclePlate?: string,
  driverName?: string,
): Job {
  const template = ROUTE_TEMPLATES.find((t) => t.id === templateId);
  if (!template) throw new Error(`Template ${templateId} not found`);

  const now = new Date();
  const createdAt = new Date(now.getTime() - 86400000).toISOString();
  const updatedAt = now.toISOString();

  return {
    id: `job-${jobNumber}`,
    jobNumber,
    status,
    priority,
    routeTemplateId: templateId,
    stops: template.stops.map((s) => ({
      ...s,
      id: `${jobNumber}-${s.id}`,
      scheduledTime: s.timeWindowStart,
      status: "pending" as const,
    })),
    requiredVehicleTypes: template.vehicleTypeRequirement,
    trailerPlate: undefined,
    assignedVehiclePlate: vehiclePlate,
    assignedDriverName: driverName,
    branch,
    customerName: `บริษัท ${jobNumber}-${template.name.split(" ")[0]} จำกัด`,
    customerContact: `ผู้ติดต่อ ${jobNumber}`,
    customerPhone: `08x-xxx-${jobNumber.slice(-4)}`,
    quotedPrice: Math.floor(Math.random() * 50000) + 10000,
    currency: "THB",
    createdAt,
    updatedAt,
    notes: "",
  };
}

// Quick direct job (no template)
function makeDirectJob(
  jobNumber: string,
  title: string,
  leadHours: number,
  status: Job["status"],
  priority: Job["priority"],
  branch: string,
  vehiclePlate?: string,
): Job {
  const now = new Date();
  return {
    id: `job-${jobNumber}`,
    jobNumber,
    status,
    priority,
    directLeadTimeHours: leadHours,
    stops: [],
    requiredVehicleTypes: ["6W"],
    trailerPlate: undefined,
    assignedVehiclePlate: vehiclePlate,
    branch,
    customerName: `ลูกค้า ${title} ${jobNumber}`,
    customerContact: `ผู้ติดต่อ ${title}`,
    customerPhone: `08x-xxx-${jobNumber.slice(-4)}`,
    createdAt: new Date(now.getTime() - 86400000).toISOString(),
    updatedAt: now.toISOString(),
    notes: "",
  };
}

export const MOCK_JOBS: Job[] = [
  // ── KSN Jobs ────────────────────────────────────────────────────────────────
  makeJobFromTemplate(
    "rt-ksn-001",
    "KSN-2024-0001",
    "confirmed",
    "normal",
    "KSN",
    0,
  ),
  makeJobFromTemplate(
    "rt-ksn-001",
    "KSN-2024-0002",
    "assigned",
    "high",
    "KSN",
    12,
    "69-3320",
    "พี่สมชาย",
  ),
  makeJobFromTemplate(
    "rt-cho-001",
    "KSN-2024-0003",
    "draft",
    "urgent",
    "KSN",
    0,
  ),
  makeJobFromTemplate(
    "rt-aya-001",
    "KSN-2024-0004",
    "confirmed",
    "low",
    "KSN",
    24,
  ),

  // ── CHO Jobs ────────────────────────────────────────────────────────────────
  makeJobFromTemplate(
    "rt-cho-001",
    "CHO-2024-0001",
    "confirmed",
    "normal",
    "CHO",
    0,
  ),
  makeJobFromTemplate(
    "rt-cho-001",
    "CHO-2024-0002",
    "in_progress",
    "high",
    "CHO",
    6,
    "700-4900",
    "พี่โจ",
  ),
  makeJobFromTemplate(
    "rt-ra2-001",
    "CHO-2024-0003",
    "assigned",
    "urgent",
    "CHO",
    18,
    "2ชม-5566",
    "พี่ต้น",
  ),
  makeJobFromTemplate(
    "rt-bbt-001",
    "CHO-2024-0004",
    "draft",
    "low",
    "CHO",
    36,
  ),

  // ── AYA Jobs ────────────────────────────────────────────────────────────────
  makeJobFromTemplate(
    "rt-aya-001",
    "AYA-2024-0001",
    "confirmed",
    "high",
    "AYA",
    0,
  ),
  makeJobFromTemplate(
    "rt-aya-001",
    "AYA-2024-0002",
    "completed",
    "normal",
    "AYA",
    -24,
    "ฮย-1234",
    "พี่มาร์ค",
  ),
  makeJobFromTemplate(
    "rt-ksn-001",
    "AYA-2024-0003",
    "assigned",
    "urgent",
    "AYA",
    12,
    "1กท-9900",
    "พี่เบิร์ด",
  ),

  // ── BBT Jobs ────────────────────────────────────────────────────────────────
  makeJobFromTemplate(
    "rt-bbt-001",
    "BBT-2024-0001",
    "confirmed",
    "high",
    "BBT",
    0,
  ),
  makeJobFromTemplate(
    "rt-bbt-001",
    "BBT-2024-0002",
    "draft",
    "normal",
    "BBT",
    48,
  ),
  makeJobFromTemplate(
    "rt-cho-001",
    "BBT-2024-0003",
    "in_progress",
    "urgent",
    "BBT",
    8,
    "5กค-1122",
    "พี่วิน",
  ),

  // ── RA2 Jobs ────────────────────────────────────────────────────────────────
  makeJobFromTemplate(
    "rt-ra2-001",
    "RA2-2024-0001",
    "confirmed",
    "normal",
    "RA2",
    0,
  ),
  makeJobFromTemplate(
    "rt-ra2-001",
    "RA2-2024-0002",
    "assigned",
    "high",
    "RA2",
    20,
    "8ผฉ-3344",
    "พี่โต",
  ),
  makeJobFromTemplate(
    "rt-ksn-001",
    "RA2-2024-0003",
    "draft",
    "low",
    "RA2",
    60,
  ),

  // ── Direct / Quick Jobs (no template) ──────────────────────────────────────
  makeDirectJob("QK-2024-0001", "รับส่งด่วน", 3, "confirmed", "urgent", "KSN"),
  makeDirectJob("QK-2024-0002", "ขนย้ายเครื่องจักร", 6, "assigned", "high", "CHO", "2ชม-5566"),
  makeDirectJob("QK-2024-0003", "กลับมาส่ง", 2, "draft", "normal", "AYA"),
];
