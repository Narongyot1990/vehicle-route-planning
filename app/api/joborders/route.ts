import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import type { JobOrder } from "@/lib/types";

function buildRouteSnapshot(route: any, includeReturnTrip: boolean) {
  const baseStops = Array.isArray(route.stops) ? route.stops : [];

  if (!includeReturnTrip || !route.returnInfo?.enabled) {
    return {
      stops: baseStops,
      totalDurationHours: route.totalDurationHours ?? 0,
    };
  }

  return {
    stops: [
      ...baseStops,
      {
        label: route.returnInfo.label ?? "Return",
        address: route.returnInfo.address ?? "",
        contactName: "",
        contactPhone: "",
        dwellHours: route.returnInfo.dwellHours ?? 0,
        transitHours: route.returnInfo.transitHours ?? 0,
        order: baseStops.length + 1,
      },
    ],
    totalDurationHours:
      (route.totalDurationHours ?? 0) +
      (route.returnInfo.dwellHours ?? 0) +
      (route.returnInfo.transitHours ?? 0),
  };
}

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const customerId = request.nextUrl.searchParams.get("customerId");
    const query = customerId ? { customerId } : {};
    const joborders = await db.collection<JobOrder>("joborders").find(query).toArray();
    return NextResponse.json(joborders);
  } catch (error) {
    console.error("GET /api/joborders error:", error);
    return NextResponse.json({ error: "Failed to fetch job orders" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body: Partial<JobOrder> = await request.json();

    if (!body.jobNumber || !body.customerId || !body.routeId || !body.plannedStartDate || !body.plannedStartTime) {
      return NextResponse.json({ error: "jobNumber, customerId, routeId, plannedStartDate, plannedStartTime required" }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    // Fetch route to snapshot
    const route = await db.collection("routes").findOne({ id: body.routeId });
    if (!route) {
      return NextResponse.json({ error: "Route not found" }, { status: 404 });
    }

    // Compute absolute hour index
    const origin = new Date();
    origin.setHours(0, 0, 0, 0);
    const [yyyy, mm, dd] = body.plannedStartDate.split("-").map(Number);
    const [hh, min] = (body.plannedStartTime || "08:00").split(":").map(Number);
    const target = new Date(yyyy, mm - 1, dd, hh, min, 0, 0);
    const plannedStart = Math.floor((target.getTime() - origin.getTime()) / (1000 * 60 * 60));

    const includeReturnTrip = Boolean((body as Partial<JobOrder>).includeReturnTrip);
    const routeSnapshot = buildRouteSnapshot(route, includeReturnTrip);
    const now = new Date().toISOString();
    const joborder: JobOrder = {
      id: body.id ?? `jo-${body.jobNumber}`,
      jobNumber: body.jobNumber,
      customerId: body.customerId,
      routeId: body.routeId,
      routeSnapshot: {
        name: route.name,
        stops: routeSnapshot.stops,
        totalDurationHours: routeSnapshot.totalDurationHours,
        requiredVehicleTypes: route.requiredVehicleTypes ?? [],
      },
      includeReturnTrip,
      plannedStartDate: body.plannedStartDate,
      plannedStartTime: body.plannedStartTime || "08:00",
      plannedStart,
      assignmentStatus: body.assignmentStatus ?? (body.vehiclePlate ? "assigned" : "unassigned"),
      vehiclePlate: body.vehiclePlate,
      driverName: body.driverName,
      trailerPlate: body.trailerPlate,
      status: body.status ?? "draft",
      priority: body.priority ?? "normal",
      quotedPrice: body.quotedPrice,
      currency: body.currency ?? "THB",
      notes: body.notes,
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection<JobOrder>("joborders").insertOne(joborder);
    return NextResponse.json({ ...joborder, _id: result.insertedId }, { status: 201 });
  } catch (error) {
    console.error("POST /api/joborders error:", error);
    return NextResponse.json({ error: "Failed to create job order" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const updates: Partial<JobOrder> = { ...body, updatedAt: new Date().toISOString() };
    delete updates.id;

    // Re-calculate plannedStart if date or time changed
    if (body.plannedStartDate && body.plannedStartTime) {
      const origin = new Date();
      origin.setHours(0, 0, 0, 0);
      const [yyyy, mm, dd] = body.plannedStartDate.split("-").map(Number);
      const [hh, min] = body.plannedStartTime.split(":").map(Number);
      const target = new Date(yyyy, mm - 1, dd, hh, min, 0, 0);
      updates.plannedStart = Math.floor((target.getTime() - origin.getTime()) / (1000 * 60 * 60));
    }

    if (body.vehiclePlate !== undefined && !body.assignmentStatus) {
      updates.assignmentStatus = body.vehiclePlate ? "assigned" : "unassigned";
    }

    const result = await db.collection<JobOrder>("joborders").findOneAndUpdate(
      { id: body.id },
      { $set: updates },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json({ error: "Job order not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("PATCH /api/joborders error:", error);
    return NextResponse.json({ error: "Failed to update job order" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const { db } = await connectToDatabase();
    await db.collection("joborders").deleteOne({ id });
    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    console.error("DELETE /api/joborders error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
