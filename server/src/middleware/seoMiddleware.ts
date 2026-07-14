import fs from 'fs';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';


const SITE_URL = 'https://pypecrm.com';

interface RouteSEO {
  title: string;
  description: string;
  h1?: string;
}

const seoData: Record<string, RouteSEO> = {
  '/': {
    title: 'Pype CRM | Intelligent Lead Management & Sales Automation',
    description: 'Accelerate your sales with Pype CRM. The all-in-one platform for lead tracking, automated follow-ups, and pipeline management. Close deals faster today.',
    h1: 'Close more leads with AI-powered CRM'
  },
  '/features': {
    title: 'Features | Pype CRM',
    description: 'Explore Pype CRM features: Lead scoring, automated workflows, WhatsApp integration, and real-time sales analytics.',
    h1: 'Enterprise-grade CRM features for every sales team'
  },
  '/pricing': {
    title: 'Pricing | Pype CRM',
    description: 'Affordable CRM pricing for startups and scaling businesses. No hidden fees, clear plans, and a 14-day free trial.',
    h1: 'Simple, transparent pricing'
  },
  '/about': {
    title: 'About Us | Pype CRM',
    description: 'Learn about Pype CRM\'s mission to empower sales teams with intelligent automation and lead management tools.',
    h1: 'Empowering sales teams worldwide'
  },
  '/contact': {
    title: 'Contact Us | Pype CRM',
    description: 'Get in touch with Pype CRM support or sales. We\'re here to help you scale your business.',
    h1: 'We\'d love to hear from you'
  },
  '/privacy': {
    title: 'Privacy Policy | Pype CRM',
    description: 'Your privacy is our priority. Read Pype CRM\'s privacy policy to learn how we protect your data.',
    h1: 'Privacy Policy'
  },
  '/terms': {
    title: 'Terms of Service | Pype CRM',
    description: 'Read the terms and conditions for using Pype CRM services.',
    h1: 'Terms of Service'
  }
};

export const seoMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const route = req.path.toLowerCase();
  
  if (req.path.startsWith('/api') || req.path.includes('.')) {
    return next();
  }

  let seo: RouteSEO | null = null;
  const matchedStatic = Object.keys(seoData).find(r => r === route);

  if (matchedStatic) {
    seo = seoData[matchedStatic];
  } else if (route.startsWith('/pages/')) {
    const slug = route.split('/pages/')[1];
    if (slug) {
      try {
        const page = await prisma.landingPage.findFirst({
          where: { slug, status: 'published', isDeleted: false },
          select: { name: true }
        });
        if (page) {
          seo = {
            title: `${page.name} | Pype CRM`,
            description: `Explore ${page.name} on Pype CRM. Discover how our intelligent lead management can help your business grow.`,
            h1: page.name
          };
        }
      } catch (err) {
        console.error('Error fetching dynamic page SEO:', err);
      }
    }
  }

  if (!seo) {
    return next();
  }

  // Path logic to handle local dev and various EC2 deployment structures
  const paths = [
    path.join(__dirname, '../../../client/dist/index.html'),      // Local/GitHub structure
    '/var/www/crm-client/index.html',                            // Primary Production path
    path.join(__dirname, '../../../../client/dist/index.html'),  // Alternative EC2 structure
    path.join(__dirname, '../../../../frontend-temp/dist/index.html') // Temp build path
  ];
  
  let indexPath = '';
  for (const p of paths) {
    if (fs.existsSync(p)) {
      indexPath = p;
      break;
    }
  }

  if (!indexPath) {
    console.error('SEO Middleware: index.html not found at expected paths:', paths);
    return next();
  }

  fs.readFile(indexPath, 'utf8', (err, html) => {
    if (err) {
      console.error('Error reading index.html:', err);
      return next();
    }

    // Inject SEO tags
    let modifiedHtml = html
      .replace(/<title>.*?<\/title>/, `<title>${seo!.title}</title>`)
      .replace(
        /<meta name="description" content=".*?" \/>/,
        `<meta name="description" content="${seo!.description}" />`
      );

    // Inject Open Graph
    modifiedHtml = modifiedHtml
      .replace(/<meta property="og:title" content=".*?" \/>/, `<meta property="og:title" content="${seo!.title}" />`)
      .replace(/<meta property="og:description" content=".*?" \/>/, `<meta property="og:description" content="${seo!.description}" />`)
      .replace(/<meta property="og:url" content=".*?" \/>/, `<meta property="og:url" content="${SITE_URL}${route}" />`);

    // Inject JSON-LD
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": seo!.title,
      "description": seo!.description,
      "url": `${SITE_URL}${route}`
    };

    const jsonLdScript = `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`;
    modifiedHtml = modifiedHtml.replace('</head>', `${jsonLdScript}</head>`);

    if (seo!.h1) {
      const noscript = `<noscript><h1>${seo!.h1}</h1><p>${seo!.description}</p></noscript>`;
      modifiedHtml = modifiedHtml.replace('<div id="root"></div>', `<div id="root"></div>${noscript}`);
    }

    res.send(modifiedHtml);
  });
};
