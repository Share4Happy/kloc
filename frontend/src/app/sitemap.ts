import type { MetadataRoute } from 'next';

const PUBLIC_ROUTES = ['/', '/kols', '/about', '/contact', '/privacy'] as const;

const resolveSiteUrl = () => {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'https://kloc.talab.io.vn';
  return raw.replace(/\/$/, '');
};

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = resolveSiteUrl();
  const now = new Date();

  return PUBLIC_ROUTES.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: now,
    changeFrequency: path === '/' ? 'daily' : 'weekly',
    priority: path === '/' ? 1 : 0.7,
  }));
}
