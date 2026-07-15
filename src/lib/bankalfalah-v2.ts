// Bank Alfalah Hosted Session (HS) Payment Gateway SDK
// API endpoint: https://sandbox.bankalfalah.com/HS/api/HSAPI/HSAPI
// Docs: https://www.bankalfalah.com/payment-gateway
//
// Flow:
// 1. Backend POSTs { MerchantId, StoreId, UserName, Password, ReturnURL } to HSAPI
// 2. Bank Alfalah returns { success, AuthToken, ReturnURL, ErrorMessage }
// 3. Frontend redirects user to the returned ReturnURL (hosted payment page)
// 4. User enters card details on Bank Alfalah's secure page
// 5. After payment, Bank Alfalah redirects back to the merchant's ReturnURL
//    with PaymentID + transaction result
// 6. Backend verifies the payment and grants VIP access
//
// Required env vars:
//   BANKALFALAH_MERCHANT_ID  — merchant ID
//   BANKALFALAH_STORE_ID     — store ID
//   BANKALFALAH_USERNAME     — API username
//   BANKALFALAH_PASSWORD     — API password
//   BANKALFALAH_ENV          — "sandbox" (default) or "production"

const SANDBOX_URL = 'https://sandbox.bankalfalah.com/HS/api/HSAPI/HSAPI';
const PRODUCTION_URL = 'https://payments.bankalfalah.com/HS/api/HSAPI/HSAPI';

function getBaseUrl(): string {
  return process.env.BANKALFALAH_ENV === 'production' ? PRODUCTION_URL : SANDBOX_URL;
}

function getCredentials(): {
  merchantId: string;
  storeId: string;
  username: string;
  password: string;
} {
  const merchantId = process.env.BANKALFALAH_MERCHANT_ID;
  const storeId = process.env.BANKALFALAH_STORE_ID;
  const username = process.env.BANKALFALAH_USERNAME;
  const password = process.env.BANKALFALAH_PASSWORD;
  if (!merchantId || !storeId || !username || !password) {
    throw new Error(
      'Bank Alfalah not configured. Set BANKALFALAH_MERCHANT_ID, BANKALFALAH_STORE_ID, BANKALFALAH_USERNAME, BANKALFALAH_PASSWORD in .env',
    );
  }
  return { merchantId, storeId, username, password };
}

export interface HostedSessionResult {
  success: boolean;
  authToken: string;
  returnURL: string | null;
  errorMessage: string | null;
}

/**
 * Create a Bank Alfalah Hosted Session.
 *
 * This requests an AuthToken from Bank Alfalah. The frontend should redirect
 * the user to the returned `returnURL` where they enter card details on Bank
 * Alfalah's secure hosted payment page.
 *
 * @param returnUrl — the URL Bank Alfalah redirects to after payment completes
 * @param amount — payment amount (e.g. 800 for $8.00 or PKR 800)
 * @param currency — 3-letter currency code (e.g. "USD", "PKR")
 */
export async function createHostedSession(
  returnUrl: string,
  amount?: number,
  currency: string = 'USD',
): Promise<HostedSessionResult> {
  const { merchantId, storeId, username, password } = getCredentials();
  const baseUrl = getBaseUrl();

  const body: Record<string, string> = {
    MerchantId: merchantId,
    StoreId: storeId,
    UserName: username,
    Password: password,
    ReturnURL: returnUrl,
  };
  if (amount !== undefined) {
    body.Amount = String(amount);
    body.Currency = currency;
  }

  const res = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Bank Alfalah HS API returned HTTP ${res.status}`);
  }

  // The API returns the JSON as a quoted string — parse twice if needed.
  const text = await res.text();
  let data: Record<string, unknown>;
  try {
    const parsed = JSON.parse(text);
    data = typeof parsed === 'string' ? JSON.parse(parsed) : parsed;
  } catch {
    throw new Error(`Bank Alfalah HS API returned invalid JSON: ${text.slice(0, 200)}`);
  }

  const success = String(data.success).toLowerCase() === 'true';
  return {
    success,
    authToken: String(data.AuthToken || ''),
    returnURL: (data.ReturnURL as string) || null,
    errorMessage: (data.ErrorMessage as string) || null,
  };
}

export function isBankAlfalahConfigured(): boolean {
  return !!(
    process.env.BANKALFALAH_MERCHANT_ID &&
    process.env.BANKALFALAH_STORE_ID &&
    process.env.BANKALFALAH_USERNAME &&
    process.env.BANKALFALAH_PASSWORD
  );
}

export function getBankAlfalahEnv(): string {
  return process.env.BANKALFALAH_ENV === 'production' ? 'production' : 'sandbox';
}
