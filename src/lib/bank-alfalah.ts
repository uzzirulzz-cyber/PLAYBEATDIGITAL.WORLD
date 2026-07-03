// Bank Alfalah Payment Gateway integration (Hosted Checkout)
//
// Flow:
//   1. Encrypt merchant credentials with AES-128-CBC (KeyOne + KeyTwo)
//   2. POST to Bank Alfalah HS endpoint → returns AuthToken + ReturnURL
//   3. Redirect customer to ReturnURL (Bank Alfalah hosted payment page)
//   4. Customer pays on Bank Alfalah's secure page
//   5. Bank Alfalah redirects back to ReturnURL with transaction result
//
// Credentials from Bank Alfalah merchant dashboard:
//   MERCHANT_ID, STORE_ID, MERCHANT_HASH, MERCHANT_USERNAME, MERCHANT_PASSWORD
//   KEY_ONE, KEY_TWO (AES-128-CBC encryption keys)

import { createCipheriv } from "crypto";

export type BaflConfig = {
  merchantId: string;
  storeId: string;
  merchantHash: string;
  merchantUsername: string;
  merchantPassword: string;
  keyOne: string; // 16 chars for AES-128
  keyTwo: string; // 16 chars (IV) for AES-128-CBC
  sandbox: boolean;
};

export function getBaflConfig(): BaflConfig | null {
  const merchantId = process.env.BAFL_MERCHANT_ID;
  const merchantUsername = process.env.BAFL_MERCHANT_USERNAME;
  const merchantPassword = process.env.BAFL_MERCHANT_PASSWORD;
  const keyOne = process.env.BAFL_KEY_ONE;
  const keyTwo = process.env.BAFL_KEY_TWO;
  if (!merchantId || !merchantUsername || !merchantPassword || !keyOne || !keyTwo) {
    return null;
  }

  return {
    merchantId,
    storeId: process.env.BAFL_STORE_ID || "0000",
    merchantHash: process.env.BAFL_MERCHANT_HASH || "",
    merchantUsername,
    merchantPassword,
    keyOne,
    keyTwo,
    sandbox: (process.env.BAFL_SANDBOX ?? "true") === "true",
  };
}

export function baflBaseUrl(sandbox: boolean): string {
  return sandbox
    ? "https://sandbox.bankalfalah.com/HS/api/HSAPI/HSAPI"
    : "https://payments.bankalfalah.com/HS/api/HSAPI/HSAPI";
}

// ── AES-128-CBC encryption (matches the WordPress plugin's openssl_encrypt) ──

function aesEncrypt(plaintext: string, keyOne: string, keyTwo: string): string {
  const cipher = createCipheriv("aes-128-cbc", Buffer.from(keyOne, "utf8"), Buffer.from(keyTwo, "utf8"));
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return encrypted.toString("base64");
}

// ── Step 1+2: Get Auth Token ───────────────────────────────────────────────
// POST to Bank Alfalah HS endpoint with encrypted RequestHash.
// Returns AuthToken + ReturnURL (the hosted payment page URL).

export type AuthTokenResult =
  | { ok: true; authToken: string; returnURL: string; raw: unknown }
  | { ok: false; error: string; raw?: unknown };

export async function baflGetAuthToken(
  cfg: BaflConfig,
  orderRef: string,
  returnURL: string
): Promise<AuthTokenResult> {
  const channelId = "1002";
  const isRedirectionRequest = "0";

  // Build the request parameters
  const params: Record<string, string> = {
    HS_IsRedirectionRequest: isRedirectionRequest,
    HS_ChannelId: channelId,
    HS_MerchantId: cfg.merchantId,
    HS_StoreId: cfg.storeId,
    HS_ReturnURL: returnURL,
    HS_MerchantHash: cfg.merchantHash,
    HS_MerchantUsername: cfg.merchantUsername,
    HS_MerchantPassword: cfg.merchantPassword,
    HS_TransactionReferenceNumber: orderRef,
  };

  // Build query string for encryption (matches plugin's mapString)
  const mapString = Object.entries(params)
    .map(([k, v]) => `${k}=${v}`)
    .join("&");

  // Encrypt with AES-128-CBC
  const requestHash = aesEncrypt(mapString, cfg.keyOne, cfg.keyTwo);

  // Build POST body (includes the encrypted hash)
  const body = new URLSearchParams({
    ...params,
    HS_RequestHash: requestHash,
  });

  const url = baflBaseUrl(cfg.sandbox);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      cache: "no-store",
    });

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

    if (!res.ok) {
      return {
        ok: false,
        error: (data.message as string) || `Bank Alfalah auth failed (HTTP ${res.status})`,
        raw: data,
      };
    }

    const authToken = (data.AuthToken as string) || "";
    const returnURLFromResponse = (data.ReturnURL as string) || "";

    if (!authToken) {
      return {
        ok: false,
        error: "Bank Alfalah did not return an AuthToken",
        raw: data,
      };
    }

    return {
      ok: true,
      authToken,
      returnURL: returnURLFromResponse,
      raw: data,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Network error contacting Bank Alfalah",
    };
  }
}

// ── Demo mode (when credentials are absent) ───────────────────────────────

export function demoBaflFinalize(): { success: boolean; approvalCode: string; cardBrand: string; cardNumber: string; raw: unknown } {
  return {
    success: true,
    approvalCode: `BAFL${Math.floor(100000 + Math.random() * 900000)}`,
    cardBrand: "Visa",
    cardNumber: "**** **** **** 4242",
    raw: { simulated: true, note: "Demo mode — no Bank Alfalah credentials configured." },
  };
}
