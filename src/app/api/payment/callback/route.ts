import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getPayfastConfig,
  payfastGetToken,
  payfastTokenizedTransaction,
  payfastGetStatus,
  demoPayfastFinalize,
} from "@/lib/payfast";
import { getBaflConfig, demoBaflFinalize } from "@/lib/bank-alfalah";
import { getPaypalConfig, paypalGetToken, paypalCaptureOrder } from "@/lib/paypal";

export const dynamic = "force-dynamic";

// GET + POST /api/payment/callback?orderRef=...[&gateway=paypal][&demo=1][&paRes=...]
//
// Called after 3DS verification (bank redirects customer back here with paRes).
// Completes the tokenized transaction and checks final status.
async function handleCallback(req: NextRequest) {
  try {
    const orderRef = req.nextUrl.searchParams.get("orderRef");
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

    // Already paid? Short-circuit.
    if (order.status === "PAID") {
      return NextResponse.json({
        status: "PAID",
        orderRef,
        approvalCode: order.approvalCode,
        cardBrand: order.cardBrand,
        cardNumber: order.cardNumber,
      });
    }

    const gatewayParam = req.nextUrl.searchParams.get("gateway");
    const demoFlag = req.nextUrl.searchParams.get("demo");
    const redirectStatus = req.nextUrl.searchParams.get("status")?.toUpperCase();
    const pfCfg = getPayfastConfig();
    const baflCfg = getBaflConfig();
    const ppCfg = getPaypalConfig();

    // ---- Demo mode (explicit demo=1 flag) — short-circuit before real gateways ----
    const isExplicitDemo = demoFlag === "1" || demoFlag === "true";
    if (isExplicitDemo) {
      const result = ppCfg ? { approvalCode: `PP${Math.floor(100000 + Math.random() * 900000)}`, cardBrand: "PayPal", cardNumber: null } : (baflCfg ? { approvalCode: `BAFL${Math.floor(100000 + Math.random() * 900000)}`, cardBrand: "Visa", cardNumber: "**** **** **** 4242" } : { approvalCode: `PF${Math.floor(100000 + Math.random() * 900000)}`, cardBrand: "Visa", cardNumber: "**** **** **** 4242" });
      const updated = await db.order.update({
        where: { id: order.id },
        data: {
          status: "PAID",
          approvalCode: result.approvalCode,
          cardBrand: result.cardBrand,
          cardNumber: result.cardNumber,
          rawResponse: JSON.stringify({ simulated: true }),
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

    // ---- PayPal callback — capture the payment after customer approves ----
    if (gatewayParam === "paypal" || (!gatewayParam && ppCfg)) {
      if (!ppCfg) {
        // Demo mode
        const updated = await db.order.update({
          where: { id: order.id },
          data: {
            status: "PAID",
            approvalCode: `PP${Math.floor(100000 + Math.random() * 900000)}`,
            cardBrand: "PayPal",
            rawResponse: JSON.stringify({ simulated: true }),
          },
          include: { items: true },
        });
        return NextResponse.json({
          status: "PAID",
          orderRef,
          approvalCode: updated.approvalCode,
        });
      }

      // Real PayPal: get token + capture the order
      const tokenResult = await paypalGetToken(ppCfg);
      if (!tokenResult.ok) {
        return NextResponse.json({ status: "FAILED", orderRef, error: tokenResult.error }, { status: 502 });
      }

      const paypalOrderId = order.ublOrderId || orderRef;
      const captureResult = await paypalCaptureOrder(ppCfg, tokenResult.accessToken, paypalOrderId);

      if (!captureResult.ok) {
        await db.order.update({
          where: { id: order.id },
          data: { status: "FAILED", rawResponse: JSON.stringify({ error: captureResult.error }) },
        });
        return NextResponse.json({ status: "FAILED", orderRef, error: captureResult.error });
      }

      if (captureResult.status === "PAID") {
        const updated = await db.order.update({
          where: { id: order.id },
          data: {
            status: "PAID",
            approvalCode: captureResult.transactionId,
            cardBrand: "PayPal",
            rawResponse: JSON.stringify(captureResult.raw),
          },
          include: { items: true },
        });
        return NextResponse.json({
          status: "PAID",
          orderRef,
          approvalCode: updated.approvalCode,
          cardBrand: updated.cardBrand,
        });
      }

      await db.order.update({
        where: { id: order.id },
        data: { status: "FAILED", rawResponse: JSON.stringify(captureResult.raw) },
      });
      return NextResponse.json({ status: "FAILED", orderRef, error: "PayPal payment not completed" });
    }

    // Check if this is a Bank Alfalah return (BAFL sends result params in the redirect)
    const baflResult = req.nextUrl.searchParams.get("result") || req.nextUrl.searchParams.get("RespCode");
    const isBaflGateway = !pfCfg && baflCfg; // BAFL is primary when PayFast not configured

    // ---- Bank Alfalah callback ----
    if (isBaflGateway && baflCfg) {
      // Real BAFL: check the result code from the redirect
      // BAFL success codes: "000" or "0"
      const success = baflResult === "000" || baflResult === "0" || baflResult === "success";
      if (success) {
        const updated = await db.order.update({
          where: { id: order.id },
          data: {
            status: "PAID",
            approvalCode: req.nextUrl.searchParams.get("TransactionReferenceNumber") || orderRef,
            rawResponse: JSON.stringify(Object.fromEntries(req.nextUrl.searchParams.entries())),
          },
          include: { items: true },
        });
        return NextResponse.json({
          status: "PAID",
          orderRef,
          approvalCode: updated.approvalCode,
        });
      }
      // Mark as failed
      await db.order.update({
        where: { id: order.id },
        data: { status: "FAILED", rawResponse: JSON.stringify({ baflResult }) },
      });
      return NextResponse.json({ status: "FAILED", orderRef, error: `Bank Alfalah result: ${baflResult}` });
    }

    const isDemo = demoFlag === "1" || demoFlag === "true" || (!pfCfg && !baflCfg);

    // ---- Demo mode (no credentials at all) ----
    if (isDemo) {
      // Use BAFL demo if BAFL was the gateway, else PayFast demo
      const result = baflCfg ? demoBaflFinalize() : demoPayfastFinalize();
      const updated = await db.order.update({
        where: { id: order.id },
        data: {
          status: "PAID",
          approvalCode: result.approvalCode,
          cardBrand: result.cardBrand,
          cardNumber: result.cardNumber,
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

    // ---- Real PayFast: complete the tokenized transaction ----
    // Get fresh auth token
    const tokenResult = await payfastGetToken(pfCfg!);
    if (!tokenResult.ok) {
      return NextResponse.json(
        { status: "FAILED", orderRef, error: tokenResult.error },
        { status: 502 }
      );
    }

    // Parse stored transaction data
    const stored = order.rawResponse
      ? (JSON.parse(order.rawResponse) as {
          transactionId: string;
          instrumentToken: string;
          otpRequired: boolean;
          eci: boolean;
        })
      : null;

    if (!stored) {
      // No transaction was initiated — just check status by basket_id
      const customerIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
      const orderDate = new Date(order.createdAt).toISOString().slice(0, 19).replace("T", " ");
      const statusResult = await payfastGetStatus(pfCfg!, tokenResult.token, orderRef, orderDate, customerIp);

      if (!statusResult.ok) {
        return NextResponse.json(
          { status: "FAILED", orderRef, error: statusResult.error },
          { status: 502 }
        );
      }

      if (statusResult.isPaid) {
        const updated = await db.order.update({
          where: { id: order.id },
          data: {
            status: "PAID",
            approvalCode: statusResult.transactionId,
            rawResponse: JSON.stringify(statusResult.raw),
          },
          include: { items: true },
        });
        return NextResponse.json({
          status: "PAID",
          orderRef,
          approvalCode: updated.approvalCode,
        });
      }

      return NextResponse.json({
        status: "FAILED",
        orderRef,
        error: statusResult.statusMsg || `Code ${statusResult.code}`,
      });
    }

    // Complete the tokenized transaction
    const paRes = req.nextUrl.searchParams.get("paRes") || undefined;
    const customerIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const orderDate = new Date(order.createdAt).toISOString().slice(0, 19).replace("T", " ");

    const completeResult = await payfastTokenizedTransaction(pfCfg!, tokenResult.token, {
      instrumentToken: stored.instrumentToken,
      transactionId: stored.transactionId,
      merchantUserId: order.customerEmail,
      userMobileNumber: order.customerPhone,
      basketId: orderRef,
      orderDate,
      txnDesc: `Playbeat order ${orderRef} — ${order.items.length} item(s)`,
      txnAmt: order.amount,
      eci: stored.eci,
      customerIp,
      data3dsSecureid: undefined,
      data3dsPares: paRes,
    });

    if (!completeResult.ok) {
      await db.order.update({
        where: { id: order.id },
        data: { status: "FAILED", rawResponse: JSON.stringify({ error: completeResult.error }) },
      });
      return NextResponse.json({
        status: "FAILED",
        orderRef,
        error: completeResult.error,
      });
    }

    // code "00" or "79" = success
    if (completeResult.code === "00" || completeResult.code === "79") {
      const updated = await db.order.update({
        where: { id: order.id },
        data: {
          status: "PAID",
          approvalCode: completeResult.transactionId,
          rawResponse: JSON.stringify(completeResult.raw),
        },
        include: { items: true },
      });
      return NextResponse.json({
        status: "PAID",
        orderRef,
        approvalCode: updated.approvalCode,
      });
    }

    // Not success
    await db.order.update({
      where: { id: order.id },
      data: {
        status: "FAILED",
        rawResponse: JSON.stringify(completeResult.raw),
      },
    });
    return NextResponse.json({
      status: "FAILED",
      orderRef,
      error: completeResult.statusMsg || `Code ${completeResult.code}`,
    });
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
