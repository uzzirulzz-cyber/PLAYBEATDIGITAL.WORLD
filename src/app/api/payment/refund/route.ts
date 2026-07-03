import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPayfastConfig, payfastGetToken, payfastRefund } from "@/lib/payfast";

export const dynamic = "force-dynamic";

// POST /api/payment/refund
// Body: { orderId }  (uses order's transactionId from ublOrderId field)
// Calls PayFast refund API and updates order status to REFUNDED.
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { orderId?: string; reason?: string };
    const orderId = body.orderId;
    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    // Find order by id or orderRef
    const order = await db.order.findFirst({
      where: { OR: [{ id: orderId }, { orderRef: orderId }] },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status !== "PAID") {
      return NextResponse.json(
        { error: "Only PAID orders can be refunded" },
        { status: 400 }
      );
    }

    const transactionId = order.ublOrderId;
    if (!transactionId) {
      // Demo mode order — just mark as refunded
      await db.order.update({
        where: { id: order.id },
        data: { status: "REFUNDED" },
      });
      return NextResponse.json({ ok: true, code: "00", message: "Refunded (demo order)" });
    }

    const cfg = getPayfastConfig();
    if (!cfg) {
      // No PayFast config — just mark as refunded locally
      await db.order.update({
        where: { id: order.id },
        data: { status: "REFUNDED" },
      });
      return NextResponse.json({ ok: true, code: "00", message: "Refunded (local only — no PayFast credentials)" });
    }

    // Get auth token
    const tokenResult = await payfastGetToken(cfg);
    if (!tokenResult.ok) {
      return NextResponse.json(
        { ok: false, error: tokenResult.error },
        { status: 502 }
      );
    }

    // Call PayFast refund API
    const reason = body.reason || "Customer refund request";
    const refundResult = await payfastRefund(cfg, tokenResult.token, transactionId, order.amount, reason);

    if (!refundResult.ok) {
      return NextResponse.json(
        { ok: false, error: refundResult.error },
        { status: 502 }
      );
    }

    // Update order status
    await db.order.update({
      where: { id: order.id },
      data: {
        status: "REFUNDED",
        rawResponse: JSON.stringify({ ...((order.rawResponse ? JSON.parse(order.rawResponse) : {}) as object), refund: refundResult.raw }),
      },
    });

    return NextResponse.json({
      ok: true,
      code: refundResult.code,
      message: refundResult.message,
    });
  } catch (err) {
    console.error("[payment/refund] error", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Refund failed" },
      { status: 500 }
    );
  }
}
