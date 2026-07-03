import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPayfastConfig, payfastInitiate } from "@/lib/payfast";

export const dynamic = "force-dynamic";

// POST /api/payment/initiate
// Body: { orderRef: string }
// Returns { ok, demo, paymentUrl|null, orderRef, gateway } or { ok:false, error } (502)
//
// Uses PayFast (gopayfast.com) as the primary payment gateway.
// Falls back to demo mode when PayFast credentials are not configured.
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { orderRef?: string };
    const orderRef = body.orderRef;
    if (!orderRef) {
      return NextResponse.json(
        { error: "Missing orderRef" },
        { status: 400 }
      );
    }

    const order = await db.order.findUnique({
      where: { orderRef },
      include: { items: true },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const cfg = getPayfastConfig();
    const origin = req.nextUrl.origin;
    const successUrl = `${origin}/api/payment/callback?orderRef=${encodeURIComponent(orderRef)}&status=PAID`;
    const failureUrl = `${origin}/api/payment/callback?orderRef=${encodeURIComponent(orderRef)}&status=FAILED`;

    // ---- Demo mode (no PayFast credentials configured) ----
    if (!cfg) {
      await db.order.update({
        where: { id: order.id },
        data: { ublOrderId: orderRef }, // reuse field to store gateway transaction id
      });
      return NextResponse.json({
        ok: true,
        demo: true,
        paymentUrl: null,
        orderRef,
        gateway: "payfast-demo",
      });
    }

    // ---- Real PayFast mode ----
    const result = await payfastInitiate(cfg, {
      orderId: orderRef,
      amount: order.amount,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      description: `Playbeat order ${orderRef} — ${order.items.length} item(s)`,
      successUrl,
      failureUrl,
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 502 }
      );
    }

    await db.order.update({
      where: { id: order.id },
      data: { ublOrderId: orderRef }, // store gateway reference
    });

    return NextResponse.json({
      ok: true,
      demo: false,
      paymentUrl: result.checkoutUrl,
      orderRef,
      gateway: "payfast",
    });
  } catch (err) {
    console.error("[payment/initiate] error", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Payment initiation failed" },
      { status: 500 }
    );
  }
}
