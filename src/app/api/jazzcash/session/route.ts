import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createPayment, isJazzCashConfigured, getJazzCashEnv } from "@/lib/jazzcash";

export const dynamic = "force-dynamic";

// POST /api/jazzcash/session
// Body: { orderRef: string }
// Creates a JazzCash payment request and returns postData + apiUrl for redirect.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
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

    if (!isJazzCashConfigured()) {
      return NextResponse.json(
        { error: "JazzCash not configured. Add JAZZCASH_MERCHANT_ID, JAZZCASH_PASSWORD, JAZZCASH_INTEGRITY_SALT, JAZZCASH_RETURN_URL to .env" },
        { status: 503 }
      );
    }

    // JazzCash uses PKR — convert USD to PKR (1 USD ≈ 280 PKR)
    const amountPkr = Math.round(order.amount * 280);
    const currency = "PKR";
    const description = `Playbeat order ${orderRef} — ${order.items.length} item(s)`;

    const result = await createPayment(amountPkr, currency, description, orderRef);

    if (!result.success) {
      return NextResponse.json({ error: result.errorMessage || "JazzCash payment creation failed" }, { status: 502 });
    }

    // Store the JazzCash txn ref on the order
    await db.order.update({
      where: { id: order.id },
      data: { ublOrderId: result.txnRefNo },
    });

    return NextResponse.json({
      success: true,
      txnRefNo: result.txnRefNo,
      apiUrl: result.apiUrl,
      postData: result.postData,
      amount: amountPkr,
      currency,
      environment: getJazzCashEnv(),
      redirectMethod: "POST",
    });
  } catch (err) {
    console.error("[jazzcash/session] error", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "JazzCash session failed" },
      { status: 500 }
    );
  }
}
