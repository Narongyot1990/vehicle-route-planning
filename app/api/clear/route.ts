import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";

export async function DELETE() {
  try {
    const { db } = await connectToDatabase();
    await db.collection("customers").deleteMany({});
    await db.collection("routes").deleteMany({});
    await db.collection("joborders").deleteMany({});
    return NextResponse.json({ message: "All data cleared" });
  } catch (error) {
    console.error("DELETE /api/clear error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
