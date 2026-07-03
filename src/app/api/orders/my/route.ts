import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/orders/my?email=... — list customer's own orders (include items).
export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get("email");
    if (!email || !email.trim()) {
      return NextResponse.json([]);
    }

    const orders = await db.order.findMany({
      where: { customerEmail: email.trim() },
      orderBy: { createdAt: "desc" },
      include: { items: true },
    });

    return NextResponse.json(orders);
  } catch (err) {
    console.error("[orders/my GET] error", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
