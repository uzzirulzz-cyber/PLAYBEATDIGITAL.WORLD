import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { demoFinalize, getUblConfig, ublFinalize } from "@/lib/ubl";

export const dynamic = "force-dynamic";

// GET + POST /api/payment/callback?orderRef=...&demo=1
// Called by the FRONTEND (browser) after the simulated/real redirect.
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

    const demoFlag = req.nextUrl.searchParams.get("demo");
    const cfg = getUblConfig();
    const isDemo = demoFlag === "1" || demoFlag === "true" || !cfg;

    if (isDemo) {
      const result = demoFinalize();
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

    // Real UBL finalization
    const result = await ublFinalize(cfg!, order.ublOrderId || orderRef);
    if (!result.ok) {
      await db.order.update({
        where: { id: order.id },
        data: {
          status: "FAILED",
          rawResponse: JSON.stringify(result.raw ?? { error: result.error }),
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

    // FAILED branch of FinalizationResult
    await db.order.update({
      where: { id: order.id },
      data: {
        status: "FAILED",
        rawResponse: JSON.stringify(result.raw ?? { error: result.error }),
      },
    });
    return NextResponse.json(
      { status: "FAILED", orderRef, error: result.error },
      { status: 200 }
    );
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
