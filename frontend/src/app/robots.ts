import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Personal or one-shot pages: nothing for a search engine there.
      disallow: ['/admin', '/dashboard', '/history', '/settings', '/auth/', '/unsubscribe'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
