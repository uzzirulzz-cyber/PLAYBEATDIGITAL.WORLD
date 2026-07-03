import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { demoPayfastFinalize, getPayfastConfig, payfastVerify } from "@/lib/payfast";

export const dynamic = "force-dynamic";

// GET + POST /api/payment/callback?orderRef=...[&status=PAID|FAILED][&demo=1]
//
// PayFast redirects the customer back to this URL with the transaction result.
// The frontend also calls this directly in demo mode to simulate the return.
// Always returns JSON.
async function handleCallback(req: NextRequest) {
  try {
    const orderRef = req.nextUrl.searchParams.get("orderRef");
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

    // Already paid? Short-circuit success.
    if (order.status === "PAID") {
      return NextResponse.json({
        status: "PAID",
        orderRef,
        approvalCode: order.approvalCode,
        cardBrand: order.cardBrand,
        cardNumber: order.cardNumber,
      });
    }

    // Check for a status param (PayFast passes status in the redirect URL)
    const redirectStatus = req.nextUrl.searchParams.get("status")?.toUpperCase();
    const demoFlag = req.nextUrl.searchParams.get("demo");
    const cfg = getPayfastConfig();
    const isDemo = demoFlag === "1" || demoFlag === "true" || !cfg;

    // ---- Demo mode ----
    if (isDemo) {
      // If PayFast explicitly told us FAILED via redirect, honor it
      if (redirectStatus === "FAILED") {
        await db.order.update({
          where: { id: order.id },
          data: { status: "FAILED" },
        });
        return NextResponse.json({ status: "FAILED", orderRef, error: "Payment was declined" });
      }

      const result = demoPayfastFinalize();
      if (!result.ok || result.status !== "PAID") {
        await db.order.update({
          where: { id: order.id },
          data: { status: "FAILED" },
        });
        return NextResponse.json({ status: "FAILED", orderRef, error: "Demo finalize did not succeed" });
      }
      const updated = await db.order.update({
        where: { id: order.id },
        data: {
          status: "PAID",
          approvalCode: result.approvalCode ?? null,
          cardBrand: result.cardBrand ?? null,
          cardNumber: result.cardNumber ?? null,
          rawResponse: JSON.stringify(result.raw),
        },
        include: { items: true },
      });
      return NextResponse.json({
        status: "PAID",
        orderRef,
        approvalCode: updated.approvalCode,
        cardBrand: updated.cardBrand,
        cardNumber: updated.cardNumber,
      });
    }

    // ---- Real PayFast mode: verify transaction status ----
    const result = await payfastVerify(cfg!, order.ublOrderId || orderRef);

    if (!result.ok) {
      await db.order.update({
        where: { id: order.id },
        data: {
          status: "FAILED",
          rawResponse: JSON.stringify({ error: result.error }),
        },
      });
      return NextResponse.json(
        { status: "FAILED", orderRef, error: result.error },
        { status: 502 }
      );
    }

    if (result.status === "PAID") {
      const updated = await db.order.update({
        where: { id: order.id },
        data: {
          status: "PAID",
          approvalCode: result.approvalCode ?? null,
          cardBrand: result.cardBrand ?? null,
          cardNumber: result.cardNumber ?? null,
          rawResponse: JSON.stringify(result.raw),
        },
        include: { items: true },
      });
      return NextResponse.json({
        status: "PAID",
        orderRef,
        approvalCode: updated.approvalCode,
        cardBrand: updated.cardBrand,
        cardNumber: updated.cardNumber,
      });
    }

    // FAILED
    await db.order.update({
      where: { id: order.id },
      data: {
        status: "FAILED",
        rawResponse: JSON.stringify(result.raw ?? {}),
      },
    });
    return NextResponse.json({ status: "FAILED", orderRef, error: "Payment was not approved" });
  } catch (err) {
    console.error("[payment/callback] error", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Payment callback failed" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return handleCallback(req);
}

export async function POST(req: NextRequest) {
  return handleCallback(req);
}
