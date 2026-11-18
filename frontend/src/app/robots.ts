import type { MetadataRoute } from 'next';

const resolveSiteUrl = () => {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'https://kloc.talab.io.vn';
  return raw.replace(/\/$/, '');
};

export default function robots(): MetadataRoute.Robots {
  const siteUrl = resolveSiteUrl();

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard', '/portal', '/api', '/login', '/register'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
