import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

const VALID_STATUSES = ["PENDING", "PAID", "FAILED", "REFUNDED"];

// GET /api/orders/[id] — fetch order by id OR orderRef (include items).
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await db.order.findFirst({
      where: { OR: [{ id }, { orderRef: id }] },
      include: { items: true },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    return NextResponse.json(order);
  } catch (err) {
    console.error("[orders/:id GET] error", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch order" },
      { status: 500 }
    );
  }
}

// PATCH /api/orders/[id] — admin update order status (and optional payment fields).
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await req.json()) as {
      status?: string;
      approvalCode?: string | null;
      cardBrand?: string | null;
      transactionId?: string | null;
      rawResponse?: string | null;
    };

    const data: Prisma.OrderUpdateInput = {};
    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of ${VALID_STATUSES.join(", ")}` },
          { status: 400 }
        );
      }
      data.status = body.status;
    }
    if (body.approvalCode !== undefined) {
      data.approvalCode = body.approvalCode === null ? null : String(body.approvalCode);
    }
    if (body.cardBrand !== undefined) {
      data.cardBrand = body.cardBrand === null ? null : String(body.cardBrand);
    }
    if (body.transactionId !== undefined) {
      data.transactionId = body.transactionId === null ? null : String(body.transactionId);
    }
    if (body.rawResponse !== undefined) {
      data.rawResponse = body.rawResponse === null ? null : String(body.rawResponse);
    }

    // Resolve the order by id OR orderRef so callers can use either identifier
    const existing = await db.order.findFirst({
      where: { OR: [{ id }, { orderRef: id }] },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const updated = await db.order.update({
      where: { id: existing.id },
      data,
      include: { items: true },
    });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("[orders/:id PATCH] error", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to update order" },
      { status: 500 }
    );
  }
}
