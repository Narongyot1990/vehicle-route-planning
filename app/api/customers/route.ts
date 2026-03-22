import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import type { Customer } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const { db } = await connectToDatabase();
    const id = request.nextUrl.searchParams.get("id");
    if (id) {
      const customer = await db.collection<Customer>("customers").findOne({ id });
      if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(customer);
    }
    const customers = await db.collection<Customer>("customers").find({}).toArray();
    return NextResponse.json(customers);
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body: Partial<Customer> = await request.json();
    if (!body.name) return NextResponse.json({ error: "name required" }, { status: 400 });
    const { db } = await connectToDatabase();
    const now = new Date().toISOString();
    const customer: Customer = {
      id: body.id ?? `cust-${Date.now()}`,
      name: body.name,
      contactName: body.contactName ?? "",
      phone: body.phone ?? "",
      address: body.address ?? "",
      createdAt: now,
      updatedAt: now,
    };
    const result = await db.collection<Customer>("customers").insertOne(customer);
    return NextResponse.json({ ...customer, _id: result.insertedId }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const { db } = await connectToDatabase();
    const updates: Partial<Customer> = { ...body, updatedAt: new Date().toISOString() };
    delete updates.id;
    const result = await db.collection<Customer>("customers").findOneAndUpdate(
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
    await db.collection("customers").deleteOne({ id });
    // Cascade: delete their routes and job orders
    await db.collection("routes").deleteMany({ customerId: id });
    await db.collection("joborders").deleteMany({ customerId: id });
    return NextResponse.json({ message: "Deleted" });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
