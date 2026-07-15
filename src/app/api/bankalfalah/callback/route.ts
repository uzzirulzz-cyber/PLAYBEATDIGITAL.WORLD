import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/bankalfalah/callback?orderRef=...&ResponseCode=...
// Bank Alfalah redirects here after payment.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderRef = searchParams.get("orderRef");
  const responseCode = searchParams.get("ResponseCode");
  const paymentId = searchParams.get("PaymentID");
  const reason = searchParams.get("Reason") || searchParams.get("reason") || "";

  if (!orderRef) {
    return NextResponse.redirect(new URL("/?view=home", req.url));
  }

  const order = await db.order.findUnique({ where: { orderRef } });
  if (!order) {
    return NextResponse.redirect(new URL("/?view=home", req.url));
  }

  const isSuccess = responseCode === "000" || responseCode === "0" || responseCode === "00";

  if (isSuccess) {
    await db.order.update({
      where: { id: order.id },
      data: {
        status: "PAID",
        approvalCode: paymentId || orderRef,
        cardBrand: "Bank Alfalah",
        rawResponse: JSON.stringify(Object.fromEntries(searchParams.entries())),
      },
    });
    return NextResponse.redirect(
      new URL(`/?view=payment-callback&orderRef=${encodeURIComponent(orderRef)}&status=PAID`, req.url)
    );
  }

  await db.order.update({
    where: { id: order.id },
    data: { status: "FAILED", rawResponse: JSON.stringify({ reason, responseCode }) },
  });
  return NextResponse.redirect(
    new URL(`/?view=payment-callback&orderRef=${encodeURIComponent(orderRef)}&status=FAILED`, req.url)
  );
}
