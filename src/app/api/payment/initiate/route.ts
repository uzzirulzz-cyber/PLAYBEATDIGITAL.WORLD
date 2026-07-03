import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUblConfig, ublRegister, ublPaymentPageUrl } from "@/lib/ubl";

export const dynamic = "force-dynamic";

// POST /api/payment/initiate
// Body: { orderRef: string }
// Returns { ok, demo, paymentUrl|null, orderRef } or { ok:false, error } (502)
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

    const cfg = getUblConfig();

    // ---- Demo mode (no real UBL credentials configured) ----
    if (!cfg) {
      await db.order.update({
        where: { id: order.id },
        data: { ublOrderId: orderRef },
      });
      return NextResponse.json({
        ok: true,
        demo: true,
        paymentUrl: null,
        orderRef,
      });
    }

    // ---- Real UBL mode ----
    const origin = req.nextUrl.origin;
    const callbackUrl = `${origin}/api/payment/callback`;

    const result = await ublRegister(cfg, {
      orderId: orderRef,
      amount: order.amount,
      currency: order.currency,
      customerEmail: order.customerEmail,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      callbackUrl,
      description: `Playbeat order ${orderRef} — ${order.items.length} item(s)`,
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 502 }
      );
    }

    await db.order.update({
      where: { id: order.id },
      data: { ublOrderId: result.ublOrderId },
    });

    const paymentUrl =
      result.paymentUrl ||
      `${ublPaymentPageUrl(cfg.sandbox)}?orderId=${encodeURIComponent(
        result.ublOrderId
      )}`;

    return NextResponse.json({
      ok: true,
      demo: false,
      paymentUrl,
      orderRef,
    });
  } catch (err) {
    console.error("[payment/initiate] error", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Payment initiation failed" },
      { status: 500 }
    );
  }
}
