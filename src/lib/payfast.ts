// PayFast Pakistan (gopayfast.com) Payment Gateway integration
//
// Flow (Hosted Checkout):
//   1. Get Authentication Token — POST /oauth/token with MERCHANT_ID + SECURED_KEY
//   2. Create Signature — md5(merchant_id:merchant_name:amount:order_id)
//   3. Build Payment Payload — includes token, signature, customer info, URLs
//   4. Redirect customer to PayFast hosted payment page
//   5. PayFast redirects back to SUCCESS_URL / FAILURE_URL with transaction result
//
// Credentials are obtained from the PayFast merchant dashboard (gopayfast.com).
// When credentials are absent, the integration runs in DEMO mode so the full
// checkout flow is testable end-to-end.

export type PayfastConfig = {
  merchantId: string;
  securedKey: string;
  merchantName: string;
  grantType: string;
  apiUrl: string;       // base API URL (auth + payment init)
  checkoutUrl: string;  // hosted checkout page URL
  mode: "sandbox" | "production";
};

export function getPayfastConfig(): PayfastConfig | null {
  const merchantId = process.env.PAYFAST_MERCHANT_ID;
  const securedKey = process.env.PAYFAST_SECURED_KEY;
  if (!merchantId || !securedKey) return null;

  const mode = (process.env.PAYFAST_MODE || "sandbox") as "sandbox" | "production";

  return {
    merchantId,
    securedKey,
    merchantName: process.env.PAYFAST_MERCHANT_NAME || "Playbeat Digital Store",
    grantType: process.env.PAYFAST_GRANT_TYPE || "client_credentials",
    apiUrl:
      process.env.PAYFAST_API_URL ||
      (mode === "sandbox"
        ? "https://sandboxapi.gopayfast.com"
        : "https://api.gopayfast.com"),
    checkoutUrl:
      process.env.PAYFAST_CHECKOUT_URL ||
      (mode === "sandbox"
        ? "https://sandboxcheckout.gopayfast.com"
        : "https://checkout.gopayfast.com"),
    mode,
  };
}

// ── Step 1: Get Authentication Token ──────────────────────────────────────

export type TokenResult =
  | { ok: true; token: string; raw: unknown }
  | { ok: false; error: string; raw?: unknown };

export async function payfastGetToken(cfg: PayfastConfig): Promise<TokenResult> {
  try {
    const res = await fetch(`${cfg.apiUrl}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        MERCHANT_ID: cfg.merchantId,
        SECURED_KEY: cfg.securedKey,
        GRANT_TYPE: cfg.grantType,
      }),
      cache: "no-store",
    });

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    if (!res.ok) {
      return {
        ok: false,
        error:
          (data.reason as string) ||
          (data.message as string) ||
          `PayFast auth failed (HTTP ${res.status})`,
        raw: data,
      };
    }

    // PayFast returns { code: "00", token: "..." } on success
    const code = String(data.code ?? "");
    const token = (data.token as string) || (data.access_token as string);

    if (code !== "00" || !token) {
      return {
        ok: false,
        error: (data.description as string) || "PayFast did not return a valid token",
        raw: data,
      };
    }

    return { ok: true, token, raw: data };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error contacting PayFast",
    };
  }
}

// ── Step 2: Create Signature ──────────────────────────────────────────────
// Signature = md5(merchant_id : merchant_name : amount : order_id)

export function payfastSignature(
  cfg: PayfastConfig,
  amount: number,
  orderId: string
): string {
  const raw = `${cfg.merchantId}:${cfg.merchantName}:${amount}:${orderId}`;
  return md5(raw);
}

// ── Step 3: Build Payment Payload + Initiate ──────────────────────────────

export type PaymentInput = {
  orderId: string;
  amount: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  description: string;
  successUrl: string;
  failureUrl: string;
};

export type InitiateResult =
  | { ok: true; checkoutUrl: string; token: string; raw: unknown }
  | { ok: false; error: string; raw?: unknown };

export async function payfastInitiate(
  cfg: PayfastConfig,
  input: PaymentInput
): Promise<InitiateResult> {
  // 1. Get auth token
  const tokenResult = await payfastGetToken(cfg);
  if (!tokenResult.ok) {
    return { ok: false, error: tokenResult.error, raw: tokenResult.raw };
  }

  // 2. Create signature
  const signature = payfastSignature(cfg, input.amount, input.orderId);

  // 3. Build payload
  const backendCallback = `signature=${signature}&order_id=${input.orderId}`;
  const payload = {
    MERCHANT_ID: cfg.merchantId,
    MERCHANT_NAME: cfg.merchantName,
    TOKEN: tokenResult.token,
    PROCCODE: "00",
    TXNAMT: String(input.amount),
    CUSTOMER_MOBILE_NO: input.customerPhone,
    CUSTOMER_EMAIL_ADDRESS: input.customerEmail,
    SIGNATURE: signature,
    VERSION: "PLAYBEAT-PAYFAST-1.0",
    TXNDESC: input.description,
    SUCCESS_URL: input.successUrl,
    FAILURE_URL: input.failureUrl,
    BASKET_ID: input.orderId,
    ORDER_DATE: new Date().toISOString().slice(0, 19).replace("T", " "),
    CHECKOUT_URL: backendCallback,
  };

  // 4. Submit to PayFast — returns redirect URL or HTML form
  try {
    const res = await fetch(`${cfg.apiUrl}/payment/initiate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenResult.token}`,
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    if (!res.ok) {
      return {
        ok: false,
        error:
          (data.reason as string) ||
          (data.message as string) ||
          `PayFast initiate failed (HTTP ${res.status})`,
        raw: data,
      };
    }

    const code = String(data.code ?? "");
    if (code !== "00") {
      return {
        ok: false,
        error: (data.description as string) || "PayFast rejected the payment request",
        raw: data,
      };
    }

    // PayFast returns a checkout URL to redirect the customer to
    const checkoutUrl =
      (data.checkoutUrl as string) ||
      (data.redirectUrl as string) ||
      (data.paymentUrl as string) ||
      `${cfg.checkoutUrl}?order_id=${encodeURIComponent(input.orderId)}&token=${encodeURIComponent(tokenResult.token)}`;

    return { ok: true, checkoutUrl, token: tokenResult.token, raw: data };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error contacting PayFast",
    };
  }
}

// ── Step 5: Verify Transaction Status (callback) ──────────────────────────

export type VerifyResult =
  | {
      ok: true;
      status: "PAID" | "FAILED";
      approvalCode?: string;
      cardBrand?: string;
      cardNumber?: string;
      raw: unknown;
    }
  | { ok: false; error: string; raw?: unknown };

export async function payfastVerify(
  cfg: PayfastConfig,
  orderId: string,
  token?: string
): Promise<VerifyResult> {
  // If no token, get a fresh one
  let authToken = token;
  if (!authToken) {
    const tr = await payfastGetToken(cfg);
    if (!tr.ok) return { ok: false, error: tr.error };
    authToken = tr.token;
  }

  try {
    const res = await fetch(
      `${cfg.apiUrl}/payment/status/${encodeURIComponent(orderId)}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${authToken}` },
        cache: "no-store",
      }
    );

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    if (!res.ok) {
      return {
        ok: false,
        error:
          (data.reason as string) ||
          `PayFast verify failed (HTTP ${res.status})`,
        raw: data,
      };
    }

    const code = String(data.code ?? "");
    const txnStatus = String(data.transactionStatus ?? data.status ?? "").toUpperCase();

    if (code === "00" || txnStatus === "PAID" || txnStatus === "SUCCESS" || txnStatus === "APPROVED") {
      return {
        ok: true,
        status: "PAID",
        approvalCode: (data.approvalCode as string) || (data.rrn as string) || undefined,
        cardBrand: (data.cardBrand as string) || undefined,
        cardNumber: (data.maskedCardNumber as string) || (data.cardNumber as string) || undefined,
        raw: data,
      };
    }

    return {
      ok: true,
      status: "FAILED",
      raw: data,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error contacting PayFast",
    };
  }
}

// ── Demo mode (when credentials are absent) ───────────────────────────────

export function demoPayfastFinalize(): VerifyResult {
  return {
    ok: true,
    status: "PAID",
    approvalCode: `PF${Math.floor(100000 + Math.random() * 900000)}`,
    cardBrand: "Visa",
    cardNumber: "**** **** **** 4242",
    raw: { simulated: true, note: "Demo mode — no PayFast credentials configured." },
  };
}

// ── MD5 implementation (Node.js crypto) ───────────────────────────────────

import { createHash } from "crypto";

function md5(input: string): string {
  return createHash("md5").update(input, "utf8").digest("hex");
}
