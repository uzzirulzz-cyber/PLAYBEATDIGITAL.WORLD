import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createHostedSession, isBankAlfalahConfigured } from "@/lib/bankalfalah-v2";

export const dynamic = "force-dynamic";

// POST /api/bankalfalah/session
// Body: { orderRef: string }
// Creates a Bank Alfalah Hosted Session and returns the redirect URL.
export async function POST(req: NextRequest) {
  if (!isBankAlfalahConfigured()) {
    return NextResponse.json(
      { error: "Bank Alfalah not configured. Add BANKALFALAH_MERCHANT_ID, BANKALFALAH_STORE_ID, BANKALFALAH_USERNAME, BANKALFALAH_PASSWORD to .env" },
      { status: 503 }
    );
  }

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

    const origin = req.headers.get("origin") || req.headers.get("host") || "";
    const protocol = req.headers.get("x-forwarded-proto") || "https";
    const callbackUrl = `${protocol}://${origin}/api/bankalfalah/callback?orderRef=${encodeURIComponent(orderRef)}`;

    const result = await createHostedSession(callbackUrl, order.amount, order.currency);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.errorMessage || "Failed to create payment session" },
        { status: 400 }
      );
    }

    await db.order.update({
      where: { id: order.id },
      data: { transactionId: result.authToken },
    });

    return NextResponse.json({
      success: true,
      authToken: result.authToken,
      returnURL: result.returnURL,
      redirect: result.returnURL,
    });
  } catch (e: unknown) {
    const err = e as { message?: string };
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
