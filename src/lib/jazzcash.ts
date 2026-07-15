// JazzCash Payment Gateway SDK
// Docs: https://www.jazzcash.com.pk/business/payments/payment-gateway
//
// Flow:
// 1. Backend builds payment request with HMAC-SHA256 SecureHash
// 2. POST to PaymentAPI → returns a redirect URL + form HTML
// 3. Frontend redirects user to JazzCash hosted payment page
// 4. User pays → JazzCash redirects to pp_ReturnURL with query params
// 5. Backend verifies pp_SecureHash + grants VIP
//
// Required env vars:
//   JAZZCASH_MERCHANT_ID    — e.g. "12345"
//   JAZZCASH_PASSWORD       — merchant password
//   JAZZCASH_INTEGRITY_SALT — salt for HMAC hash
//   JAZZCASH_RETURN_URL     — your public callback URL (e.g. https://yoursite.com/api/jazzcash/callback)
//   JAZZCASH_ENV            — "sandbox" (default) or "production"

import crypto from 'crypto';

const SANDBOX_URL = 'https://sandbox.jazzcash.com.pk/CentralBankPayment/RestGateway/PaymentAPI';
const PRODUCTION_URL = 'https://jazzcash.com.pk/CentralBankPayment/RestGateway/PaymentAPI';

function getApiUrl(): string {
  return process.env.JAZZCASH_ENV === 'production' ? PRODUCTION_URL : SANDBOX_URL;
}

function getCredentials(): {
  merchantId: string;
  password: string;
  integritySalt: string;
  returnUrl: string;
} {
  const merchantId = process.env.JAZZCASH_MERCHANT_ID;
  const password = process.env.JAZZCASH_PASSWORD;
  const integritySalt = process.env.JAZZCASH_INTEGRITY_SALT;
  const returnUrl = process.env.JAZZCASH_RETURN_URL;
  if (!merchantId || !password || !integritySalt || !returnUrl) {
    throw new Error(
      'JazzCash not configured. Set JAZZCASH_MERCHANT_ID, JAZZCASH_PASSWORD, JAZZCASH_INTEGRITY_SALT, JAZZCASH_RETURN_URL in .env',
    );
  }
  return { merchantId, password, integritySalt, returnUrl };
}

export interface JazzCashPaymentParams {
  pp_Version: string;
  pp_TxnType: string;
  pp_TxnRefNo: string;
  pp_Amount: string;
  pp_TxnCurrency: string;
  pp_TxnDateTime: string;
  pp_BillReference: string;
  pp_Description: string;
  pp_MerchantID: string;
  pp_Password: string;
  pp_ReturnURL: string;
  pp_SecureHash: string;
  pp_Language: string;
  [key: string]: string; // allow additional fields
}

/**
 * Calculate the HMAC-SHA256 SecureHash for a JazzCash request.
 *
 * Algorithm (per JazzCash docs):
 * 1. Sort all POST params alphabetically by key (excluding pp_SecureHash)
 * 2. Concatenate values with '&' delimiter
 * 3. Prepend the IntegritySalt + '&' to the string
 * 4. HMAC-SHA256 with IntegritySalt as the key
 *
 * Note: The exact algorithm varies by JazzCash API version. The most common
 * implementation (used by the official SDK) is:
 *   string = IntegritySalt + '&' + sortedValues.join('&')
 *   hash = HMAC-SHA256(IntegritySalt, string)
 */
function calculateSecureHash(
  params: Record<string, string>,
  integritySalt: string,
): string {
  // Sort keys alphabetically, excluding pp_SecureHash
  const sortedKeys = Object.keys(params)
    .filter((k) => k !== 'pp_SecureHash')
    .sort();

  // Build the string: salt&value1&value2&...
  const parts = [integritySalt, ...sortedKeys.map((k) => params[k] || '')];
  const stringToHash = parts.join('&');

  // HMAC-SHA256 with IntegritySalt as the key
  return crypto
    .createHmac('sha256', integritySalt)
    .update(stringToHash, 'utf8')
    .digest('hex')
    .toUpperCase();
}

export interface JazzCashPaymentResult {
  success: boolean;
  txnRefNo: string;
  postData: Record<string, string>; // form fields to POST to JazzCash
  apiUrl: string;
  errorMessage?: string;
}

/**
 * Create a JazzCash payment request.
 *
 * @param amount — in smallest currency unit (e.g. 800 for PKR 800, or 8 for $8)
 * @param currency — 'PKR' (default) or 'USD'
 * @param description — order description
 * @param billReference — your internal order/reference ID
 */
export async function createPayment(
  amount: number,
  currency: string = 'PKR',
  description: string = 'VIP Subscription',
  billReference?: string,
): Promise<JazzCashPaymentResult> {
  const { merchantId, password, integritySalt, returnUrl } = getCredentials();

  // Generate unique transaction reference
  const txnRefNo = billReference || `JC${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const txnDateTime = new Date().toISOString().replace('T', ' ').slice(0, 19);

  // JazzCash expects amount without decimals for PKR
  const pp_Amount = currency === 'PKR' ? String(Math.round(amount)) : amount.toFixed(2);

  // Build params (sorted alphabetically by JazzCash for hash)
  const params: Record<string, string> = {
    pp_Amount,
    pp_BillReference: txnRefNo,
    pp_Description: description,
    pp_Language: 'EN',
    pp_MerchantID: merchantId,
    pp_Password: password,
    pp_ReturnURL: returnUrl,
    pp_SecureHash: '', // placeholder, calculated below
    pp_TxnCurrency: currency,
    pp_TxnDateTime: txnDateTime,
    pp_TxnRefNo: txnRefNo,
    pp_TxnType: 'MERCHANT_PAY',
    pp_Version: '1.1',
  };

  // Calculate secure hash
  params.pp_SecureHash = calculateSecureHash(params, integritySalt);

  return {
    success: true,
    txnRefNo,
    postData: params,
    apiUrl: getApiUrl(),
  };
}

/**
 * Verify the JazzCash callback response by recalculating the SecureHash.
 *
 * @param responseParams — the query params from JazzCash redirect
 * @returns true if the hash matches (authentic response)
 */
export function verifyCallbackHash(
  responseParams: Record<string, string>,
): boolean {
  const { integritySalt } = getCredentials();
  const receivedHash = responseParams.pp_SecureHash;
  if (!receivedHash) return false;

  const calculatedHash = calculateSecureHash(responseParams, integritySalt);
  return calculatedHash === receivedHash.toUpperCase();
}

export function isJazzCashConfigured(): boolean {
  return !!(
    process.env.JAZZCASH_MERCHANT_ID &&
    process.env.JAZZCASH_PASSWORD &&
    process.env.JAZZCASH_INTEGRITY_SALT &&
    process.env.JAZZCASH_RETURN_URL
  );
}

export function getJazzCashEnv(): string {
  return process.env.JAZZCASH_ENV === 'production' ? 'production' : 'sandbox';
}
