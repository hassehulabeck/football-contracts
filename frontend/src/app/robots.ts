import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Personal or one-shot pages: nothing for a search engine there. /join/
      // is left crawlable on purpose: link-preview bots that obey robots.txt
      // would otherwise not unfurl an invite. Those pages say noindex instead.
      disallow: ['/admin', '/dashboard', '/history', '/settings', '/auth/', '/unsubscribe', '/mini-leagues'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
