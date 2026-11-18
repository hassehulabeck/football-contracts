/**
 * The public address of the site, for anything that must be absolute: link
 * previews, the sitemap, canonical URLs. Shared links have to point at the
 * address people actually use, not the railway.app one the service also
 * answers on, so this defaults to the custom domain rather than reading the
 * request's host.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.football-contracts.se').replace(/\/$/, '');

export const SITE_NAME = 'Football Contracts';

export const SITE_DESCRIPTION =
  'A free football prediction game. Bid on coupons that pay out when a team hits three results in a row — Allsvenskan, Superettan, Damallsvenskan, Elitettan and the Championship.';

/** Where server-side code (metadata, preview images) reads the API from. */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');

/**
 * GET a public API route from the server. Null on any failure: a link preview
 * that falls back to the generic one is far better than a page that errors
 * because the API was slow while a chat app crawled it.
 */
export async function fetchPublic<T>(path: string, revalidateSeconds = 300): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      next: { revalidate: revalidateSeconds },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
