import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '@/services/api';
import { PageLoader } from '@/components/ui/page-loader';

interface LandingPage {
  id: string;
  name: string;
  slug: string;
  html?: string;
  status: string;
}

export default function LandingPageView() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<LandingPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPage = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/landing-pages/slug/${slug}`);
        setPage(response.data);
      } catch (err) {
        setError('Landing page not found');
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchPage();
    }
  }, [slug]);

  if (loading) {
    return <PageLoader text="Loading page..." />;
  }

  if (error || !page) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
          <p className="text-gray-600">Page not found</p>
        </div>
      </div>
    );
  }

  if (page.status !== 'published') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Page Not Available</h1>
          <p className="text-gray-600">This page is not published yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {page.html ? (
        <div dangerouslySetInnerHTML={{ __html: page.html }} />
      ) : (
        <div className="container mx-auto px-4 py-16">
          <h1 className="text-4xl font-bold mb-4">{page.name}</h1>
          <p className="text-gray-600">No content available</p>
        </div>
      )}
    </div>
  );
}
