import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import type { Route } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const customerId = request.nextUrl.searchParams.get("customerId");
    const query = customerId ? { customerId } : {};
    const routes = await db.collection<Route>("routes").find(query).toArray();
    return NextResponse.json(routes);
  } catch (error) {
    console.error("GET /api/routes error:", error);
    return NextResponse.json({ error: "Failed to fetch routes" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const { db } = await connectToDatabase();
    await db.collection("routes").deleteOne({ id });
    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body: Partial<Route> & { id?: string } = await request.json();
    if (!body.id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const updates: Partial<Route> = {
      customerId: body.customerId,
      name: body.name,
      description: body.description ?? "",
      stops: body.stops ?? [],
      requiredVehicleTypes: body.requiredVehicleTypes ?? [],
      returnInfo: body.returnInfo
        ? {
            enabled: Boolean(body.returnInfo.enabled),
            label: body.returnInfo.label ?? "",
            address: body.returnInfo.address ?? "",
            dwellHours: body.returnInfo.dwellHours ?? 0,
            transitHours: body.returnInfo.transitHours ?? 0,
          }
        : undefined,
      totalDurationHours: body.totalDurationHours ?? 0,
      updatedAt: new Date().toISOString(),
    };

    const result = await db.collection<Route>("routes").findOneAndUpdate(
      { id: body.id },
      { $set: updates },
      { returnDocument: "after" }
    );

    if (!result) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("PATCH /api/routes error:", error);
    return NextResponse.json({ error: "Failed to update route" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body: Partial<Route> = await request.json();
    if (!body.customerId || !body.name) {
      return NextResponse.json({ error: "customerId and name required" }, { status: 400 });
    }
    const { db } = await connectToDatabase();
    const now = new Date().toISOString();
    const route: Route = {
      id: body.id ?? `route-${Date.now()}`,
      customerId: body.customerId,
      name: body.name,
      description: body.description ?? "",
      stops: body.stops ?? [],
      requiredVehicleTypes: body.requiredVehicleTypes ?? [],
      returnInfo: body.returnInfo
        ? {
            enabled: Boolean(body.returnInfo.enabled),
            label: body.returnInfo.label ?? "",
            address: body.returnInfo.address ?? "",
            dwellHours: body.returnInfo.dwellHours ?? 0,
            transitHours: body.returnInfo.transitHours ?? 0,
          }
        : undefined,
      totalDurationHours: body.totalDurationHours ?? 0,
      createdAt: now,
      updatedAt: now,
    };
    const result = await db.collection<Route>("routes").insertOne(route);
    return NextResponse.json({ ...route, _id: result.insertedId }, { status: 201 });
  } catch (error) {
    console.error("POST /api/routes error:", error);
    return NextResponse.json({ error: "Failed to create route" }, { status: 500 });
  }
}
