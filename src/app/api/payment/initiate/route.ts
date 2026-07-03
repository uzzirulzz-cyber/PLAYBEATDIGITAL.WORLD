import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPayfastConfig, payfastGetToken, payfastGetTransactionToken } from "@/lib/payfast";

export const dynamic = "force-dynamic";

// POST /api/payment/initiate
// Body: { orderRef, card: { cardNumber, expiryMonth, expiryYear, cvv } }
//
// PayFast Direct Checkout flow:
//   1. Get auth token
//   2. Create transaction token (POST /transaction/token) with card details
//   3. Return transaction_id, instrument_token, data_3ds_html to frontend
//   Frontend then renders the 3DS HTML to redirect customer to bank's verification page.
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      orderRef?: string;
      card?: { cardNumber: string; expiryMonth: string; expiryYear: string; cvv: string };
    };

    const orderRef = body.orderRef;
    if (!orderRef) {
      return NextResponse.json({ error: "Missing orderRef" }, { status: 400 });
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
    const callbackUrl = `${origin}/api/payment/callback?orderRef=${encodeURIComponent(orderRef)}`;

    // ---- Demo mode (no PayFast credentials) ----
    if (!cfg) {
      await db.order.update({
        where: { id: order.id },
        data: { ublOrderId: orderRef },
      });
      return NextResponse.json({
        ok: true,
        demo: true,
        orderRef,
        gateway: "payfast-demo",
      });
    }

    // ---- Real PayFast mode ----
    if (!body.card) {
      return NextResponse.json(
        { ok: false, error: "Card details required" },
        { status: 400 }
      );
    }

    // 1. Get auth token
    const tokenResult = await payfastGetToken(cfg);
    if (!tokenResult.ok) {
      return NextResponse.json(
        { ok: false, error: tokenResult.error },
        { status: 502 }
      );
    }

    // 2. Create transaction token
    const customerIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const orderDate = new Date().toISOString().slice(0, 19).replace("T", " ");

    const txnResult = await payfastGetTransactionToken(cfg, tokenResult.token, {
      basketId: orderRef,
      txnAmt: order.amount,
      orderDate,
      merchantUserId: order.customerEmail,
      userMobileNumber: order.customerPhone,
      customerIp,
      card: body.card,
      callbackUrl,
    });

    if (!txnResult.ok) {
      return NextResponse.json(
        { ok: false, error: txnResult.error },
        { status: 502 }
      );
    }

    // Store transaction reference on the order
    await db.order.update({
      where: { id: order.id },
      data: {
        ublOrderId: txnResult.transactionId,
        rawResponse: JSON.stringify({
          transactionId: txnResult.transactionId,
          instrumentToken: txnResult.instrumentToken,
          otpRequired: txnResult.otpRequired,
          eci: txnResult.eci,
        }),
      },
    });

    return NextResponse.json({
      ok: true,
      demo: false,
      orderRef,
      gateway: "payfast",
      transactionId: txnResult.transactionId,
      instrumentToken: txnResult.instrumentToken,
      otpRequired: txnResult.otpRequired,
      eci: txnResult.eci,
      data3dsHtml: txnResult.data3dsHtml || null,
      data3dsSecureid: txnResult.data3dsSecureid || null,
    });
  } catch (err) {
    console.error("[payment/initiate] error", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Payment initiation failed" },
      { status: 500 }
    );
  }
}
