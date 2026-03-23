import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import type {
  VehicleBlock,
  VehicleBlockStatus,
  VehicleBlockType,
} from "@/lib/types";

const VALID_BLOCK_TYPES: VehicleBlockType[] = ["pm", "no_driver", "no_job"];
const VALID_BLOCK_STATUSES: VehicleBlockStatus[] = ["active", "removed"];

function recalculatePlannedStart(plannedStartDate: string, plannedStartTime: string) {
  const origin = new Date();
  origin.setHours(0, 0, 0, 0);

  const [yyyy, mm, dd] = plannedStartDate.split("-").map(Number);
  const [hh, min] = plannedStartTime.split(":").map(Number);
  const target = new Date(yyyy, mm - 1, dd, hh, min, 0, 0);
  return Math.floor((target.getTime() - origin.getTime()) / (1000 * 60 * 60));
}

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const id = request.nextUrl.searchParams.get("id");
    const vehiclePlate = request.nextUrl.searchParams.get("vehiclePlate");
    const status = request.nextUrl.searchParams.get("status");

    if (id) {
      const block = await db.collection<VehicleBlock>("vehicleBlocks").findOne({ id });
      if (!block) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json(block);
    }

    const filter: Partial<VehicleBlock> = {};
    if (vehiclePlate) {
      filter.vehiclePlate = vehiclePlate;
    }
    if (status && VALID_BLOCK_STATUSES.includes(status as VehicleBlockStatus)) {
      filter.status = status as VehicleBlockStatus;
    }

    const blocks = await db.collection<VehicleBlock>("vehicleBlocks").find(filter).toArray();
    return NextResponse.json(blocks);
  } catch (error) {
    console.error("GET /api/vehicle-blocks error:", error);
    return NextResponse.json({ error: "Failed to fetch vehicle blocks" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body: Partial<VehicleBlock> = await request.json();

    if (
      !body.blockType ||
      !body.title ||
      !body.plannedStartDate ||
      !body.plannedStartTime ||
      typeof body.durationHours !== "number"
    ) {
      return NextResponse.json(
        { error: "blockType, title, plannedStartDate, plannedStartTime, durationHours required" },
        { status: 400 }
      );
    }

    if (!VALID_BLOCK_TYPES.includes(body.blockType)) {
      return NextResponse.json({ error: "Invalid blockType" }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const now = new Date().toISOString();
    const block: VehicleBlock = {
      id: body.id ?? `vblk-${Date.now()}`,
      vehiclePlate: body.vehiclePlate,
      blockType: body.blockType,
      title: body.title,
      reason: body.reason,
      plannedStartDate: body.plannedStartDate,
      plannedStartTime: body.plannedStartTime,
      plannedStart:
        typeof body.plannedStart === "number"
          ? body.plannedStart
          : recalculatePlannedStart(body.plannedStartDate, body.plannedStartTime),
      durationHours: Math.max(1, Math.round(body.durationHours)),
      status: body.status && VALID_BLOCK_STATUSES.includes(body.status) ? body.status : "active",
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection<VehicleBlock>("vehicleBlocks").insertOne(block);
    return NextResponse.json({ ...block, _id: result.insertedId }, { status: 201 });
  } catch (error) {
    console.error("POST /api/vehicle-blocks error:", error);
    return NextResponse.json({ error: "Failed to create vehicle block" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body: Partial<VehicleBlock> = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    if (body.blockType && !VALID_BLOCK_TYPES.includes(body.blockType)) {
      return NextResponse.json({ error: "Invalid blockType" }, { status: 400 });
    }

    if (body.status && !VALID_BLOCK_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const updates: Partial<VehicleBlock> = { ...body, updatedAt: new Date().toISOString() };
    delete updates.id;

    if (body.plannedStartDate && body.plannedStartTime) {
      updates.plannedStart = recalculatePlannedStart(body.plannedStartDate, body.plannedStartTime);
    }

    if (typeof body.durationHours === "number") {
      updates.durationHours = Math.max(1, Math.round(body.durationHours));
    }

    const { db } = await connectToDatabase();
    const result = await db.collection<VehicleBlock>("vehicleBlocks").findOneAndUpdate(
      { id: body.id },
      { $set: updates },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json({ error: "Vehicle block not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("PATCH /api/vehicle-blocks error:", error);
    return NextResponse.json({ error: "Failed to update vehicle block" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    await db.collection("vehicleBlocks").deleteOne({ id });
    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    console.error("DELETE /api/vehicle-blocks error:", error);
    return NextResponse.json({ error: "Failed to delete vehicle block" }, { status: 500 });
  }
}
