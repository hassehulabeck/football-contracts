import { OAuth2Client } from 'google-auth-library';

/**
 * Google sign-in is off unless GOOGLE_CLIENT_ID is set (the frontend needs
 * the same id as NEXT_PUBLIC_GOOGLE_CLIENT_ID to show the button at all).
 */
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID?.trim() || null;

const client = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

export interface GoogleIdentity {
  sub: string;
  email: string;
}

/**
 * Checks a Google ID token (the "credential" the sign-in button hands the
 * browser): signature against Google's keys, issuer, expiry, and that it was
 * issued to *this* site's client id. Null for anything that fails, including
 * an address Google has not verified — that would let someone claim an
 * account for an email they do not own.
 */
export async function verifyGoogleCredential(credential: string): Promise<GoogleIdentity | null> {
  if (!client || !GOOGLE_CLIENT_ID) return null;
  try {
    const ticket = await client.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email || payload.email_verified !== true) return null;
    return { sub: payload.sub, email: payload.email.toLowerCase() };
  } catch {
    return null;
  }
}
