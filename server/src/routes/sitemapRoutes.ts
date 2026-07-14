import express from 'express';
import prisma from '../config/prisma';


const router = express.Router();
const SITE_URL = 'https://pypecrm.com';

const staticRoutes = [
  { loc: '/', changefreq: 'weekly', priority: '1.0' },
  { loc: '/features', changefreq: 'monthly', priority: '0.8' },
  { loc: '/pricing', changefreq: 'monthly', priority: '0.8' },
  { loc: '/about', changefreq: 'monthly', priority: '0.6' },
  { loc: '/contact', changefreq: 'yearly', priority: '0.5' },
  { loc: '/privacy', changefreq: 'yearly', priority: '0.3' },
  { loc: '/terms', changefreq: 'yearly', priority: '0.3' },
];

router.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(`User-agent: *
Allow: /
Allow: /features
Allow: /pricing
Allow: /about
Allow: /contact
Allow: /pages/
Disallow: /api/
Disallow: /dashboard/
Disallow: /leads/
Disallow: /settings/
Disallow: /login
Disallow: /register

Sitemap: ${SITE_URL}/sitemap.xml`);
});

router.get('/sitemap.xml', async (req, res) => {
  try {
    const landingPages = await prisma.landingPage.findMany({
      where: {
        status: 'published',
        isDeleted: false,
      },
      select: {
        slug: true,
        updatedAt: true,
      },
    });

    const urls = [
      ...staticRoutes.map(r => ({ ...r, lastmod: new Date().toISOString().split('T')[0] })),
      ...landingPages.map(p => ({
        loc: `/pages/${p.slug}`,
        lastmod: p.updatedAt.toISOString().split('T')[0],
        changefreq: 'monthly',
        priority: '0.7',
      })),
    ];

    res.set('Content-Type', 'application/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    u => `  <url>
    <loc>${SITE_URL}${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`);
  } catch (error) {
    console.error('Sitemap generation error:', error);
    res.status(500).end();
  }
});

export default router;
