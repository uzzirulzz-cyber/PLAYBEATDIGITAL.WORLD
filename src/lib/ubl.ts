// UBL Internet Payment Gateway (EPG REST) integration
// Flow: Registration (server creates order) -> Redirect customer to UBL payment page
//       -> UBL returns to callback URL -> Finalization (server confirms transaction)

export type UblConfig = {
  customerId: string;
  username: string;
  password: string;
  storeId: string;
  terminalId: string;
  sandbox: boolean;
};

export function getUblConfig(): UblConfig | null {
  const customerId = process.env.UBL_CUSTOMER_ID;
  const username = process.env.UBL_USERNAME;
  const password = process.env.UBL_PASSWORD;
  if (!customerId || !username || !password) return null;
  return {
    customerId,
    username,
    password,
    storeId: process.env.UBL_STORE_ID || "0000",
    terminalId: process.env.UBL_TERMINAL_ID || "0000",
    sandbox: (process.env.UBL_SANDBOX ?? "true") === "true",
  };
}

// UBL EPG endpoints
const UBL_BASE_SANDBOX = "https://sandboxapi.opayapi.com";
const UBL_BASE_LIVE = "https://api.opayapi.com";

function ublBaseUrl(sandbox: boolean): string {
  return sandbox ? UBL_BASE_SANDBOX : UBL_BASE_LIVE;
}

// Public payment page the customer is redirected to
export function ublPaymentPageUrl(sandbox: boolean): string {
  return sandbox
    ? "https://sandboxcheckout.opayapi.com"
    : "https://checkout.opayapi.com";
}

export type RegistrationInput = {
  orderId: string;
  amount: number; // major units (e.g. PKR)
  currency: string; // "PKR"
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  callbackUrl: string;
  failureCallbackUrl?: string;
  description?: string;
};

export type RegistrationResult =
  | { ok: true; ublOrderId: string; paymentUrl: string; raw: unknown }
  | { ok: false; error: string; raw?: unknown };

/**
 * Step 1 — Registration. Calls UBL EPG to create a transaction.
 * Returns the UBL order id + the hosted payment page URL to redirect the customer to.
 *
 * NOTE: When real UBL credentials are not configured, this returns a simulated
 * success so the checkout flow is fully demonstrable end-to-end.
 */
export async function ublRegister(
  cfg: UblConfig,
  input: RegistrationInput
): Promise<RegistrationResult> {
  const amountMinor = Math.round(input.amount * 100); // UBL expects minor units
  const body = {
    merchantId: cfg.customerId,
    merchantName: "Playbeat Digital Store",
    storeId: cfg.storeId,
    terminalId: cfg.terminalId,
    orderId: input.orderId,
    amount: amountMinor,
    currency: input.currency,
    description: input.description || "Playbeat Digital Store Order",
    callbackUrl: input.callbackUrl,
    failureCallbackUrl: input.failureCallbackUrl || input.callbackUrl,
    customer: {
      email: input.customerEmail,
      name: input.customerName,
      phone: input.customerPhone,
    },
  };

  try {
    const res = await fetch(`${ublBaseUrl(cfg.sandbox)}/epg/v1/registration`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(
          `${cfg.username}:${cfg.password}`
        ).toString("base64")}`,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    if (!res.ok) {
      return {
        ok: false,
        error:
          (data.reason as string) ||
          (data.message as string) ||
          `UBL registration failed (HTTP ${res.status})`,
        raw: data,
      };
    }

    const ublOrderId = (data.orderId as string) || input.orderId;
    const paymentUrl =
      (data.paymentUrl as string) ||
      `${ublPaymentPageUrl(cfg.sandbox)}?orderId=${encodeURIComponent(ublOrderId)}`;

    return { ok: true, ublOrderId, paymentUrl, raw: data };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error contacting UBL",
    };
  }
}

export type FinalizationResult =
  | {
      ok: true;
      status: "PAID";
      approvalCode?: string;
      cardBrand?: string;
      cardNumber?: string;
      raw: unknown;
    }
  | {
      ok: true;
      status: "FAILED";
      raw: unknown;
      error?: string;
    }
  | { ok: false; error: string; raw?: unknown };

/**
 * Step 2 — Finalization. After the customer pays on the UBL hosted page,
 * UBL redirects back with order/transaction identifiers. This queries UBL
 * to confirm the final status.
 *
 * NOTE: In demo mode (no real credentials) the callback API simulates a
 * successful paid transaction so the order lifecycle can be demonstrated.
 */
export async function ublFinalize(
  cfg: UblConfig,
  ublOrderId: string
): Promise<FinalizationResult> {
  try {
    const res = await fetch(
      `${ublBaseUrl(cfg.sandbox)}/epg/v1/status/${encodeURIComponent(ublOrderId)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${Buffer.from(
            `${cfg.username}:${cfg.password}`
          ).toString("base64")}`,
        },
        cache: "no-store",
      }
    );
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    if (!res.ok) {
      return {
        ok: false,
        error:
          (data.reason as string) ||
          `UBL finalization failed (HTTP ${res.status})`,
        raw: data,
      };
    }

    const status = String(data.status || data.result || "").toUpperCase();
    if (status === "PAID" || status === "SUCCESS" || status === "APPROVED") {
      return {
        ok: true,
        status: "PAID",
        approvalCode: (data.approvalCode as string) || undefined,
        cardBrand: (data.cardBrand as string) || undefined,
        cardNumber: (data.maskedCardNumber as string) || undefined,
        raw: data,
      };
    }
    return {
      ok: true,
      status: "FAILED",
      error: status || "Payment not approved",
      raw: data,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error contacting UBL",
    };
  }
}

/**
 * Demo-mode finalization used when real UBL credentials are absent.
 * Simulates an approved card payment so the full flow is testable.
 */
export function demoFinalize(): FinalizationResult {
  return {
    ok: true,
    status: "PAID",
    approvalCode: `DEMO${Math.floor(100000 + Math.random() * 900000)}`,
    cardBrand: "Visa",
    cardNumber: "**** **** **** 4242",
    raw: { simulated: true, note: "Demo mode — no real UBL credentials configured." },
  };
}
