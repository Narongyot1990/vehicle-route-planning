import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import type { Vehicle, VehicleType, Branch, EngineType } from "@/lib/types";
import { TRUCK_TYPE_OPTIONS } from "@/lib/truckTypes";

const VALID_VEHICLE_TYPES: VehicleType[] = [...TRUCK_TYPE_OPTIONS];
const VALID_BRANCHES: Branch[] = ["KSN", "CHO", "AYA", "BBT", "RA2"];
const VALID_ENGINE_TYPES: EngineType[] = ["ICE", "EV"];

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const id = request.nextUrl.searchParams.get("id");
    const branch = request.nextUrl.searchParams.get("branch");
    const vehicleType = request.nextUrl.searchParams.get("vehicleType");

    if (id) {
      const vehicle = await db.collection<Vehicle>("vehicles").findOne({ id });
      if (!vehicle) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(vehicle);
    }

    const filter: Partial<Vehicle> = {};
    if (branch && VALID_BRANCHES.includes(branch as Branch)) filter.branch = branch as Branch;
    if (vehicleType && VALID_VEHICLE_TYPES.includes(vehicleType as VehicleType))
      filter.vehicleType = vehicleType as VehicleType;

    const vehicles = await db.collection<Vehicle>("vehicles").find(filter).toArray();
    return NextResponse.json(vehicles);
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body: Partial<Vehicle> = await request.json();

    if (!body.licensePlate || !body.vehicleType || !body.engineType || !body.branch)
      return NextResponse.json(
        { error: "licensePlate, vehicleType, engineType, branch are required" },
        { status: 400 }
      );

    if (!VALID_VEHICLE_TYPES.includes(body.vehicleType))
      return NextResponse.json({ error: `vehicleType must be one of: ${VALID_VEHICLE_TYPES.join(", ")}` }, { status: 400 });

    if (!VALID_BRANCHES.includes(body.branch))
      return NextResponse.json({ error: `branch must be one of: ${VALID_BRANCHES.join(", ")}` }, { status: 400 });

    if (!VALID_ENGINE_TYPES.includes(body.engineType))
      return NextResponse.json({ error: `engineType must be one of: ${VALID_ENGINE_TYPES.join(", ")}` }, { status: 400 });

    const { db } = await connectToDatabase();

    const existing = await db.collection<Vehicle>("vehicles").findOne({ licensePlate: body.licensePlate });
    if (existing)
      return NextResponse.json({ error: "License plate already exists" }, { status: 409 });

    const now = new Date().toISOString();
    const vehicle: Vehicle = {
      id: body.id ?? `veh-${Date.now()}`,
      licensePlate: body.licensePlate,
      vehicleType: body.vehicleType,
      engineType: body.engineType,
      branch: body.branch,
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection<Vehicle>("vehicles").insertOne(vehicle);
    return NextResponse.json({ ...vehicle, _id: result.insertedId }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body: Partial<Vehicle> = await request.json();
    if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });

    if (body.vehicleType && !VALID_VEHICLE_TYPES.includes(body.vehicleType))
      return NextResponse.json({ error: `vehicleType must be one of: ${VALID_VEHICLE_TYPES.join(", ")}` }, { status: 400 });

    if (body.branch && !VALID_BRANCHES.includes(body.branch))
      return NextResponse.json({ error: `branch must be one of: ${VALID_BRANCHES.join(", ")}` }, { status: 400 });

    if (body.engineType && !VALID_ENGINE_TYPES.includes(body.engineType))
      return NextResponse.json({ error: `engineType must be one of: ${VALID_ENGINE_TYPES.join(", ")}` }, { status: 400 });

    const { db } = await connectToDatabase();

    if (body.licensePlate) {
      const existing = await db.collection<Vehicle>("vehicles").findOne({
        licensePlate: body.licensePlate,
        id: { $ne: body.id },
      });
      if (existing)
        return NextResponse.json({ error: "License plate already exists" }, { status: 409 });
    }

    const updates: Partial<Vehicle> = { ...body, updatedAt: new Date().toISOString() };
    delete updates.id;

    const result = await db.collection<Vehicle>("vehicles").findOneAndUpdate(
      { id: body.id },
      { $set: updates },
      { returnDocument: "after" }
    );

    if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const { db } = await connectToDatabase();

    const vehicle = await db.collection<Vehicle>("vehicles").findOne({ id });
    if (!vehicle) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const activeJobs = await db.collection("joborders").find({
      vehiclePlate: vehicle.licensePlate,
      status: { $nin: ["completed", "cancelled"] },
    }).toArray();

    if (activeJobs.length > 0)
      return NextResponse.json(
        { error: "Cannot delete. Vehicle has active jobs. Remove jobs from this vehicle first." },
        { status: 409 }
      );

    await db.collection("vehicles").deleteOne({ id });
    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}