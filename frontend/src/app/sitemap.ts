import type { MetadataRoute } from 'next';
import { fetchPublic, SITE_URL } from '@/lib/site';

// Rebuilt hourly: new contracts arrive once a week, so this is plenty.
export const revalidate = 3600;

const STATIC_PAGES: { path: string; changeFrequency: 'daily' | 'weekly' | 'monthly'; priority: number }[] = [
  { path: '/', changeFrequency: 'weekly', priority: 1 },
  { path: '/contracts', changeFrequency: 'daily', priority: 0.9 },
  { path: '/results', changeFrequency: 'daily', priority: 0.8 },
  { path: '/leaderboard', changeFrequency: 'daily', priority: 0.7 },
  { path: '/rules', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/privacy', changeFrequency: 'monthly', priority: 0.2 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // The contracts still open for bids, the ones worth landing on from a search.
  const open = await fetchPublic<{ contracts: { id: string; createdAt: string }[] }>(
    '/api/contracts?status=open&pageSize=100',
    3600,
  );

  return [
    ...STATIC_PAGES.map((p) => ({
      url: `${SITE_URL}${p.path}`,
      changeFrequency: p.changeFrequency,
      priority: p.priority,
    })),
    ...(open?.contracts ?? []).map((c) => ({
      url: `${SITE_URL}/contracts/${c.id}`,
      lastModified: new Date(c.createdAt),
      changeFrequency: 'daily' as const,
      priority: 0.6,
    })),
  ];
}
