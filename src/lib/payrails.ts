// Payrails SDK — handles OAuth 2.0 access token retrieval + caching.
// API reference: https://docs.payrails.com
//
// The access token is valid for a limited duration (expires_in, default 3600s).
// We cache it in-memory and refresh automatically when it expires.
//
// Required env vars:
//   PAYRAILS_API_KEY    — secret API key (sent in x-api-key header)
//   PAYRAILS_CLIENT_ID  — client ID (path parameter for /auth/token/{clientId})
//   PAYRAILS_ENV        — "staging" (default) or "production"

const PAYRAILS_BASE_URL =
  process.env.PAYRAILS_ENV === 'production'
    ? 'https://api.payrails.io'
    : 'https://api.staging.payrails.io';

interface PayrailsToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  // computed: absolute expiry timestamp (ms)
  expiresAt: number;
}

// In-memory token cache (survives within the server process)
let cachedToken: PayrailsToken | null = null;

/**
 * Get the Payrails API key + client ID from environment.
 * Throws a clear error if not configured.
 */
function getCredentials(): { apiKey: string; clientId: string } {
  const apiKey = process.env.PAYRAILS_API_KEY;
  const clientId = process.env.PAYRAILS_CLIENT_ID;
  if (!apiKey || !clientId) {
    throw new Error(
      'Payrails not configured. Set PAYRAILS_API_KEY and PAYRAILS_CLIENT_ID in .env',
    );
  }
  return { apiKey, clientId };
}

/**
 * Check if the cached token is still valid (with a 60s safety margin).
 */
function isTokenValid(token: PayrailsToken | null): boolean {
  if (!token) return false;
  return Date.now() < token.expiresAt - 60_000;
}

/**
 * Request a new access token from Payrails.
 *
 * POST /auth/token/{clientId}
 * Headers: x-api-key: <YOUR_API_KEY>
 * Returns: { access_token, token_type, expires_in }
 *
 * The token is cached until expiry. Call this function before any Payrails
 * API request that needs authentication.
 */
export async function getPayrailsToken(): Promise<string> {
  // Return cached token if still valid
  if (isTokenValid(cachedToken)) {
    return cachedToken!.access_token;
  }

  const { apiKey, clientId } = getCredentials();

  const res = await fetch(`${PAYRAILS_BASE_URL}/auth/token/${clientId}`, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Accept': 'application/json',
    },
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => '');
    throw new Error(
      `Payrails token request failed: HTTP ${res.status} — ${errorBody.slice(0, 300)}`,
    );
  }

  const data = (await res.json()) as {
    access_token: string;
    token_type: string;
    expires_in: number;
  };

  cachedToken = {
    access_token: data.access_token,
    token_type: data.token_type,
    expires_in: data.expires_in,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.access_token;
}

/**
 * Make an authenticated request to any Payrails API endpoint.
 * Automatically attaches the Bearer token.
 */
export async function payrailsFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = await getPayrailsToken();
  const url = path.startsWith('http') ? path : `${PAYRAILS_BASE_URL}${path}`;
  return fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers || {}),
    },
  });
}

/**
 * Check if Payrails is configured (used to show/hide real payment options).
 */
export function isPayrailsConfigured(): boolean {
  return !!(process.env.PAYRAILS_API_KEY && process.env.PAYRAILS_CLIENT_ID);
}

/**
 * Get the Payrails environment (for display in admin UI).
 */
export function getPayrailsEnv(): string {
  return process.env.PAYRAILS_ENV === 'production' ? 'production' : 'staging';
}
