// PayFast Pakistan (gopayfast.com) Payment Gateway integration
//
// Direct Checkout API flow (3 steps for card payments):
//   1. Get Auth Token — POST /token (form-urlencoded) with merchant_id + secured_key
//   2. Get Transaction Token — POST /transaction/token (Bearer auth) with card/bank details
//      → returns transaction_id, instrument_token, data_3ds_html (3DS redirect page)
//   3. Complete Transaction — POST /transaction/tokenized with instrument_token + otp + 3DS pares
//      → returns code "00" = success
//
// Plus: Get Transaction Status, Refund
//
// Credentials: PAYFAST_MERCHANT_ID, PAYFAST_SECURED_KEY from gopayfast.com dashboard.
// When absent, runs in DEMO mode (simulates success).

export type PayfastConfig = {
  merchantId: string;
  securedKey: string;
  merchantName: string;
  merchantCatCode: string;
  grantType: string;
  apiUrl: string;       // BASE_URL for all API calls
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
    merchantCatCode: process.env.PAYFAST_MERCHANT_CAT_CODE || "5732",
    grantType: process.env.PAYFAST_GRANT_TYPE || "client_credentials",
    apiUrl:
      process.env.PAYFAST_API_URL ||
      (mode === "sandbox"
        ? "https://sandboxapi.gopayfast.com"
        : "https://api.gopayfast.com"),
    mode,
  };
}

// ── Step 1: Get Authentication Token ──────────────────────────────────────
// POST /token  (application/x-www-form-urlencoded)
// Body: merchant_id, grant_type=client_credentials, secured_key
// Response: { token, refresh_token, code, message, expiry }

export type TokenResult =
  | { ok: true; token: string; raw: unknown }
  | { ok: false; error: string; raw?: unknown };

export async function payfastGetToken(cfg: PayfastConfig): Promise<TokenResult> {
  try {
    const params = new URLSearchParams();
    params.append("merchant_id", cfg.merchantId);
    params.append("grant_type", cfg.grantType);
    params.append("secured_key", cfg.securedKey);

    const res = await fetch(`${cfg.apiUrl}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
      cache: "no-store",
    });

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const token = (data.token as string) || (data.access_token as string);

    if (!res.ok || !token) {
      return {
        ok: false,
        error: (data.message as string) || `PayFast auth failed (HTTP ${res.status})`,
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

// ── Step 2: Get Transaction Token ─────────────────────────────────────────
// POST /transaction/token  (Bearer auth, form-urlencoded)
// Creates a transaction and returns instrument_token + 3DS redirect HTML.

export type CardDetails = {
  cardNumber: string;   // without spaces/hyphens
  expiryMonth: string;  // e.g. "09"
  expiryYear: string;   // e.g. "2026"
  cvv: string;
};

export type TransactionTokenInput = {
  basketId: string;          // order reference
  txnAmt: number;            // amount
  orderDate: string;         // YYYY-MM-DD HH:mm:ss
  merchantUserId: string;    // customer identifier
  userMobileNumber: string;
  customerIp: string;
  card: CardDetails;
  callbackUrl: string;       // 3DS callback URL
};

export type TransactionTokenResult =
  | {
      ok: true;
      transactionId: string;
      instrumentToken: string;
      otpRequired: boolean;
      eci: boolean;
      data3dsHtml?: string;     // pre-formatted HTML page for 3DS redirect
      data3dsSecureid?: string;
      raw: unknown;
    }
  | { ok: false; error: string; raw?: unknown };

export async function payfastGetTransactionToken(
  cfg: PayfastConfig,
  token: string,
  input: TransactionTokenInput
): Promise<TransactionTokenResult> {
  try {
    const params = new URLSearchParams();
    params.append("merchant_user_id", input.merchantUserId);
    params.append("user_mobile_number", input.userMobileNumber);
    params.append("basket_id", input.basketId);
    params.append("txnamt", String(input.txnAmt));
    params.append("order_date", input.orderDate);
    params.append("account_type", "4"); // 4 = card
    params.append("card_number", input.card.cardNumber);
    params.append("expiry_month", input.card.expiryMonth);
    params.append("expiry_year", input.card.expiryYear);
    params.append("cvv", input.card.cvv);
    params.append("customer_ip", input.customerIp);
    params.append("merCatCode", cfg.merchantCatCode);
    params.append("data_3ds_pagemode", "SIMPLE");
    params.append("data_3ds_callback_url", input.callbackUrl);

    const res = await fetch(`${cfg.apiUrl}/transaction/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Bearer ${token}`,
      },
      body: params.toString(),
      cache: "no-store",
    });

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    const transactionId = (data.transaction_id as string) || "";
    const instrumentToken = (data.instrument_token as string) || "";

    if (!res.ok || !transactionId) {
      return {
        ok: false,
        error: (data.status_msg as string) || (data.message as string) || `PayFast transaction token failed (HTTP ${res.status})`,
        raw: data,
      };
    }

    return {
      ok: true,
      transactionId,
      instrumentToken,
      otpRequired: Boolean(data.otp_required),
      eci: Boolean(data.eci),
      data3dsHtml: (data.data_3ds_html as string) || undefined,
      data3dsSecureid: (data.data_3ds_secureid as string) || undefined,
      raw: data,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error contacting PayFast",
    };
  }
}

// ── Step 3: Complete Tokenized Transaction ────────────────────────────────
// POST /transaction/tokenized  (Bearer auth, form-urlencoded)
// Completes the payment after 3DS verification.

export type TokenizedTxnInput = {
  instrumentToken: string;
  transactionId: string;
  merchantUserId: string;
  userMobileNumber: string;
  basketId: string;
  orderDate: string;
  txnDesc: string;
  txnAmt: number;
  otp?: string;
  eci: boolean;
  customerIp: string;
  data3dsSecureid?: string;
  data3dsPares?: string;  // from 3DS callback
};

export type TokenizedTxnResult =
  | {
      ok: true;
      code: string;    // "00" = success
      statusMsg: string;
      transactionId: string;
      basketId: string;
      raw: unknown;
    }
  | { ok: false; error: string; code?: string; raw?: unknown };

export async function payfastTokenizedTransaction(
  cfg: PayfastConfig,
  token: string,
  input: TokenizedTxnInput
): Promise<TokenizedTxnResult> {
  try {
    const params = new URLSearchParams();
    params.append("instrument_token", input.instrumentToken);
    params.append("transaction_id", input.transactionId);
    params.append("merchant_user_id", input.merchantUserId);
    params.append("user_mobile_number", input.userMobileNumber);
    params.append("basket_id", input.basketId);
    params.append("order_date", input.orderDate);
    params.append("txndesc", input.txnDesc);
    params.append("txnamt", String(input.txnAmt));
    if (input.otp) params.append("otp", input.otp);
    params.append("eci", String(input.eci));
    params.append("customer_ip", input.customerIp);
    params.append("merCatCode", cfg.merchantCatCode);
    if (input.data3dsSecureid) params.append("data_3ds_secureid", input.data3dsSecureid);
    if (input.data3dsPares) params.append("data_3ds_pares", input.data3dsPares);

    const res = await fetch(`${cfg.apiUrl}/transaction/tokenized`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Bearer ${token}`,
      },
      body: params.toString(),
      cache: "no-store",
    });

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const code = String(data.code ?? "");

    return {
      ok: true,
      code,
      statusMsg: (data.status_msg as string) || (data.message as string) || "",
      transactionId: (data.transaction_id as string) || input.transactionId,
      basketId: (data.basket_id as string) || input.basketId,
      raw: data,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error contacting PayFast",
    };
  }
}

// ── Get Transaction Status ────────────────────────────────────────────────
// GET /transaction/basket_id/<basket_id>  (Bearer auth)
// Returns: { status_code, status_msg, basket_id, transaction_id, code }

export type StatusResult =
  | {
      ok: true;
      code: string;     // "00" = processed OK, "001" = pending
      statusCode: string;
      statusMsg: string;
      transactionId: string;
      isPaid: boolean;
      raw: unknown;
    }
  | { ok: false; error: string; raw?: unknown };

export async function payfastGetStatus(
  cfg: PayfastConfig,
  token: string,
  basketId: string,
  orderDate: string,
  customerIp: string
): Promise<StatusResult> {
  try {
    const url = `${cfg.apiUrl}/transaction/basket_id/${encodeURIComponent(basketId)}?order_date=${encodeURIComponent(orderDate)}&customer_ip=${encodeURIComponent(customerIp)}`;
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const code = String(data.code ?? "");
    const statusCode = String(data.status_code ?? "");

    if (!res.ok) {
      return {
        ok: false,
        error: (data.status_msg as string) || `PayFast status check failed (HTTP ${res.status})`,
        raw: data,
      };
    }

    // code "00" = Processed OK (paid), "001" = Pending
    const isPaid = code === "00" || code === "79"; // 79 = alternate success

    return {
      ok: true,
      code,
      statusCode,
      statusMsg: (data.status_msg as string) || "",
      transactionId: (data.transaction_id as string) || "",
      isPaid,
      raw: data,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error contacting PayFast",
    };
  }
}

// ── Refund Transaction ────────────────────────────────────────────────────
// POST /transaction/refund/<transaction_id>  (Bearer auth)

export type RefundResult =
  | { ok: true; code: string; message: string; raw: unknown }
  | { ok: false; error: string; raw?: unknown };

export async function payfastRefund(
  cfg: PayfastConfig,
  token: string,
  transactionId: string,
  amount: number,
  reason: string
): Promise<RefundResult> {
  try {
    const params = new URLSearchParams();
    params.append("txnamt", String(amount));
    params.append("refund_reason", reason);
    params.append("customer_ip", "127.0.0.1");

    const res = await fetch(`${cfg.apiUrl}/transaction/refund/${encodeURIComponent(transactionId)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Bearer ${token}`,
      },
      body: params.toString(),
      cache: "no-store",
    });

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    const code = String(data.code ?? "");

    if (!res.ok) {
      return {
        ok: false,
        error: (data.message as string) || `Refund failed (HTTP ${res.status})`,
        raw: data,
      };
    }

    return {
      ok: true,
      code,
      message: (data.message as string) || "Refund processed",
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

export function demoPayfastFinalize(): { code: string; approvalCode: string; cardBrand: string; cardNumber: string; raw: unknown } {
  return {
    code: "00",
    approvalCode: `PF${Math.floor(100000 + Math.random() * 900000)}`,
    cardBrand: "Visa",
    cardNumber: "**** **** **** 4242",
    raw: { simulated: true, note: "Demo mode — no PayFast credentials configured." },
  };
}
