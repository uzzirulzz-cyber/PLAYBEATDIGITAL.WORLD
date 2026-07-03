"use client";

// Admin panel password gate.
//
// NOTE: This is a SOFT, client-side gate. The password is embedded in the
// frontend bundle, so it keeps casual storefront visitors out but is NOT
// real security (anyone can read it from the bundled JS). For genuine
// protection, move authentication server-side (e.g. NextAuth + hashed password).
//
// The password is intentionally embedded here per the owner's request so the
// admin panel is locked without requiring a backend auth service.

export const ADMIN_PASSWORD = "playbeat123";

export function checkAdminPassword(pw: string): boolean {
  return pw === ADMIN_PASSWORD;
}
