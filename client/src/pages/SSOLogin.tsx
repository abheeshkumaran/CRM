import { useState } from 'react';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import Logo from '@/components/shared/Logo';
import { toast } from 'sonner';

const SSOLogin = () => {
  const [identifier, setIdentifier] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Check if input is email or slug
      const payload = identifier.includes('@')
        ? { email: identifier }
        : { slug: identifier };

      const { data } = await api.post('/auth/sso/init', payload);

      if (data.redirectUrl) {
        // Redirect to backend which redirects to IDP
        window.location.href = data.redirectUrl;
      } else {
        toast.error('SSO configuration not found');
        setIsLoading(false);
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || 'Failed to initiate SSO');
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-950 px-4">
      <Card className="w-full max-w-[400px] shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <Logo size="lg" showText={false} />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Single Sign-On
          </CardTitle>
          <CardDescription>
            Enter your email or company ID to log in with your identity provider.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier">Work Email or Company ID</Label>
              <Input
                id="identifier"
                placeholder="name@company.com or company-slug"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
              />
            </div>

            <Button className="w-full" type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Continue with SSO
            </Button>

            <div className="text-center">
              <Link to="/login" className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 flex items-center justify-center gap-1">
                <ArrowLeft className="h-3 w-3" />
                Back to standard login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SSOLogin;
