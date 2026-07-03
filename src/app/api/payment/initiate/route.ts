import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPayfastConfig, payfastGetToken, payfastGetTransactionToken } from "@/lib/payfast";
import { getBaflConfig, baflGetAuthToken, baflBaseUrl } from "@/lib/bank-alfalah";

export const dynamic = "force-dynamic";

// POST /api/payment/initiate
// Body: {
//   orderRef: string,
//   gateway?: "payfast" | "bank-alfalah",  (defaults to whichever is configured)
//   card?: { cardNumber, expiryMonth, expiryYear, cvv }  (required for real PayFast)
// }
//
// - Bank Alfalah: Hosted Checkout — redirects customer to BAFL payment page
// - PayFast: Direct Checkout — collects card details, handles 3DS
// - Demo mode: when neither gateway has credentials, simulates success
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      orderRef?: string;
      gateway?: "payfast" | "bank-alfalah";
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

    const origin = req.nextUrl.origin;
    const callbackUrl = `${origin}/api/payment/callback?orderRef=${encodeURIComponent(orderRef)}`;

    const baflCfg = getBaflConfig();
    const pfCfg = getPayfastConfig();
    const requestedGateway = body.gateway;

    // ── Bank Alfalah (Hosted Checkout) ────────────────────────────────────
    if (requestedGateway === "bank-alfalah" || (!requestedGateway && baflCfg && !pfCfg)) {
      if (!baflCfg) {
        // Demo mode for Bank Alfalah
        await db.order.update({
          where: { id: order.id },
          data: { ublOrderId: orderRef },
        });
        return NextResponse.json({
          ok: true,
          demo: true,
          orderRef,
          gateway: "bank-alfalah-demo",
        });
      }

      // Real Bank Alfalah: get auth token → redirect to hosted page
      const authResult = await baflGetAuthToken(baflCfg, orderRef, callbackUrl);
      if (!authResult.ok) {
        return NextResponse.json(
          { ok: false, error: authResult.error },
          { status: 502 }
        );
      }

      await db.order.update({
        where: { id: order.id },
        data: { ublOrderId: orderRef },
      });

      // The ReturnURL from Bank Alfalah is the hosted payment page
      const paymentUrl = authResult.returnURL || `${baflBaseUrl(baflCfg.sandbox)}?AuthToken=${encodeURIComponent(authResult.authToken)}`;

      return NextResponse.json({
        ok: true,
        demo: false,
        orderRef,
        gateway: "bank-alfalah",
        paymentUrl,
        authToken: authResult.authToken,
      });
    }

    // ── PayFast (Direct Checkout) ─────────────────────────────────────────
    // Demo mode (no PayFast credentials)
    if (!pfCfg) {
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

    // Real PayFast mode — requires card details
    if (!body.card) {
      return NextResponse.json(
        { ok: false, error: "Card details required for PayFast" },
        { status: 400 }
      );
    }

    // 1. Get auth token
    const tokenResult = await payfastGetToken(pfCfg);
    if (!tokenResult.ok) {
      return NextResponse.json(
        { ok: false, error: tokenResult.error },
        { status: 502 }
      );
    }

    // 2. Create transaction token
    const customerIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const orderDate = new Date().toISOString().slice(0, 19).replace("T", " ");

    const txnResult = await payfastGetTransactionToken(pfCfg, tokenResult.token, {
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
