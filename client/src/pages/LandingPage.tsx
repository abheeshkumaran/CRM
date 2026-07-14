import LandingNavbar from "@/components/landing/LandingNavbar";
import Hero from "@/components/landing/Hero";
import FeatureSection from "@/components/landing/FeatureSection";
import IntegrationSection from "@/components/landing/IntegrationSection";
import Testimonials from "@/components/landing/Testimonials";
import PricingTable from "@/components/landing/PricingTable";
import FAQSection from "@/components/landing/FAQSection";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";
import SEO from "@/components/shared/SEO";

const landingJsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Pype CRM",
    "url": "https://pypecrm.com",
    "logo": "https://pypecrm.com/logo.png",
    "sameAs": [
      "https://www.linkedin.com/company/pypecrm",
      "https://twitter.com/pypecrm"
    ]
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Pype CRM",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "127"
    }
  }
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 font-sans selection:bg-blue-100 dark:selection:bg-blue-900">
      <SEO
        title="AI-Powered Lead Management & Sales Automation"
        description="Close more deals with AI-driven lead scoring, automated follow-ups, and a unified sales pipeline. Start your free 14-day trial today."
        keywords="pype crm, ai crm, best crm for startups, lead management software, sales automation tools, india crm"
        jsonLd={landingJsonLd}
      />
      <LandingNavbar />
      <main>
        <Hero />
        <FeatureSection />
        <IntegrationSection />
        <Testimonials />
        <PricingTable />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
