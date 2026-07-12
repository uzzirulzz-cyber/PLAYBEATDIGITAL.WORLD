// PayPal Payment Gateway integration (Hosted Checkout)
//
// Flow:
//   1. Get Access Token — POST /v1/oauth2/token (Basic auth with client_id:secret)
//   2. Create Order — POST /v2/checkout/orders (returns approval URL)
//   3. Redirect customer to PayPal approval URL
//   4. Customer approves on PayPal's page → redirects back
//   5. Capture Payment — POST /v2/checkout/orders/{id}/capture
//
// Credentials from PayPal developer dashboard.

export type PaypalConfig = {
  clientId: string;
  clientSecret: string;
  sandbox: boolean;
};

export function getPaypalConfig(): PaypalConfig | null {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  return {
    clientId,
    clientSecret,
    sandbox: (process.env.PAYPAL_MODE ?? "sandbox") !== "live",
  };
}

export function paypalBaseUrl(sandbox: boolean): string {
  return sandbox
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";
}

// ── Step 1: Get Access Token ──────────────────────────────────────────────

export type TokenResult =
  | { ok: true; accessToken: string; raw: unknown }
  | { ok: false; error: string; raw?: unknown };

export async function paypalGetToken(cfg: PaypalConfig): Promise<TokenResult> {
  const url = `${paypalBaseUrl(cfg.sandbox)}/v1/oauth2/token`;
  const auth = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString("base64");

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
      cache: "no-store",
    });

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const accessToken = (data.access_token as string) || "";

    if (!res.ok || !accessToken) {
      return {
        ok: false,
        error: (data.error_description as string) || `PayPal auth failed (HTTP ${res.status})`,
        raw: data,
      };
    }

    return { ok: true, accessToken, raw: data };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error contacting PayPal",
    };
  }
}

// ── Step 2: Create Order ──────────────────────────────────────────────────

export type CreateOrderInput = {
  amount: number;
  currency: string;
  description: string;
  orderId: string;
  returnUrl: string;
  cancelUrl: string;
};

export type CreateOrderResult =
  | { ok: true; orderId: string; approvalUrl: string; raw: unknown }
  | { ok: false; error: string; raw?: unknown };

export async function paypalCreateOrder(
  cfg: PaypalConfig,
  accessToken: string,
  input: CreateOrderInput
): Promise<CreateOrderResult> {
  const url = `${paypalBaseUrl(cfg.sandbox)}/v2/checkout/orders`;

  const body = {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: input.orderId,
        description: input.description,
        amount: {
          currency_code: input.currency,
          value: input.amount.toFixed(2),
        },
      },
    ],
    application_context: {
      brand_name: "Playbeat Digital Store",
      user_action: "PAY_NOW",
      shipping_preference: "NO_SHIPPING",
      return_url: input.returnUrl,
      cancel_url: input.cancelUrl,
    },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    if (!res.ok) {
      return {
        ok: false,
        error: (data.message as string) || `PayPal create order failed (HTTP ${res.status})`,
        raw: data,
      };
    }

    const orderId = (data.id as string) || "";
    // Find the approval URL from the links array
    const links = (data.links as Array<{ href: string; rel: string }>) || [];
    const approvalLink = links.find((l) => l.rel === "approve");

    if (!orderId || !approvalLink) {
      return {
        ok: false,
        error: "PayPal did not return an order ID or approval URL",
        raw: data,
      };
    }

    return {
      ok: true,
      orderId,
      approvalUrl: approvalLink.href,
      raw: data,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error contacting PayPal",
    };
  }
}

// ── Step 5: Capture Payment ───────────────────────────────────────────────

export type CaptureResult =
  | { ok: true; status: "PAID"; transactionId: string; raw: unknown }
  | { ok: true; status: "FAILED"; raw: unknown }
  | { ok: false; error: string; raw?: unknown };

export async function paypalCaptureOrder(
  cfg: PaypalConfig,
  accessToken: string,
  orderId: string
): Promise<CaptureResult> {
  const url = `${paypalBaseUrl(cfg.sandbox)}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    if (!res.ok) {
      return {
        ok: false,
        error: (data.message as string) || `PayPal capture failed (HTTP ${res.status})`,
        raw: data,
      };
    }

    const status = String(data.status || "").toUpperCase();
    if (status === "COMPLETED") {
      // Extract transaction ID from purchase_units
      const purchaseUnits = (data.purchase_units as Array<Record<string, unknown>>) || [];
      const captures = (purchaseUnits[0]?.captures as Array<Record<string, unknown>>) || [];
      const transactionId = (captures[0]?.id as string) || orderId;

      return { ok: true, status: "PAID", transactionId, raw: data };
    }

    return { ok: true, status: "FAILED", raw: data };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error contacting PayPal",
    };
  }
}
