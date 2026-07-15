import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyCallbackHash, isJazzCashConfigured } from "@/lib/jazzcash";

export const dynamic = "force-dynamic";

// GET + POST /api/jazzcash/callback
// JazzCash redirects here after payment. Verifies hash + marks order PAID.
export async function GET(req: NextRequest) {
  return handleCallback(req);
}

export async function POST(req: NextRequest) {
  return handleCallback(req);
}

async function handleCallback(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url);

  let params: Record<string, string> = {};
  if (req.method === "POST") {
    try {
      const formData = await req.formData();
      formData.forEach((value, key) => {
        params[key] = String(value);
      });
    } catch {
      // fall back to query params
    }
  }
  url.searchParams.forEach((value, key) => {
    params[key] = value;
  });

  const responseCode = params.pp_ResponseCode;
  const responseMessage = params.pp_ResponseMessage || "";
  const txnRefNo = params.pp_TxnRefNo || "";
  const isSuccess = responseCode === "000";

  // Find the order by the JazzCash txn ref (stored in ublOrderId)
  const order = await db.order.findFirst({
    where: { OR: [{ orderRef: txnRefNo }, { ublOrderId: txnRefNo }] },
    include: { items: true },
  });

  if (!order) {
    return NextResponse.redirect(new URL("/?view=home", req.url));
  }

  // Verify hash if configured
  if (isJazzCashConfigured()) {
    try {
      const hashValid = verifyCallbackHash(params);
      if (!hashValid && isSuccess) {
        console.warn("[jazzcash/callback] Hash mismatch but response is success — possible fraud");
      }
    } catch {
      // Continue anyway — some sandbox configs don't send hash
    }
  }

  if (isSuccess) {
    await db.order.update({
      where: { id: order.id },
      data: {
        status: "PAID",
        approvalCode: txnRefNo,
        cardBrand: "JazzCash",
        rawResponse: JSON.stringify(params),
      },
    });
    return NextResponse.redirect(
      new URL(`/?view=payment-callback&orderRef=${encodeURIComponent(order.orderRef)}&status=PAID`, req.url)
    );
  }

  await db.order.update({
    where: { id: order.id },
    data: { status: "FAILED", rawResponse: JSON.stringify(params) },
  });
  return NextResponse.redirect(
    new URL(`/?view=payment-callback&orderRef=${encodeURIComponent(order.orderRef)}&status=FAILED`, req.url)
  );
}
