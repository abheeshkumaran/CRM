import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Logo from '@/components/shared/Logo';
import SEO from '@/components/shared/SEO';
import { Sparkles, Check, Eye, EyeOff } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { saveAndroidToken, saveAndroidApiUrl } from '@/utils/androidBridge';
import { API_URL } from '@/config';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [autoLogin, setAutoLogin] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { data } = await api.post('/auth/login', { email, password });
      const sanitizedData = { ...data };
      if (sanitizedData.profileImage && sanitizedData.profileImage.includes('null')) {
        sanitizedData.profileImage = null;
      }
      if (sanitizedData.avatar && sanitizedData.avatar.includes('null')) {
        sanitizedData.avatar = null;
      }
      localStorage.setItem('userInfo', JSON.stringify(sanitizedData));

      if (autoLogin) {
        localStorage.setItem('autoLogin', 'true');
        saveAndroidToken(sanitizedData.token);
        saveAndroidApiUrl(API_URL);
      } else {
        localStorage.removeItem('autoLogin');
      }

      window.dispatchEvent(new CustomEvent('auth-refresh', { detail: sanitizedData }));
      // Small delay for animation
      setTimeout(() => { window.location.href = '/dashboard'; }, 500);
    } catch (err: unknown) {
      // 1. Production-grade diagnostic logging
      console.error("====== LOGIN ERROR DIAGNOSTICS ======");
      console.error("Original Error Object:", err);

      const isAxiosError = err && typeof err === 'object' && ('isAxiosError' in err || 'config' in err);
      console.error("Is Axios/API Error:", !!isAxiosError);

      if (isAxiosError) {
        const apiError = err as {
          message?: string;
          code?: string;
          config?: { url?: string; method?: string; baseURL?: string; headers?: Record<string, string> };
          response?: { status?: number; data?: unknown; headers?: Record<string, string> };
          request?: unknown;
        };

        console.error("Error Message:", apiError.message);
        console.error("Error Code:", apiError.code);
        console.error("Requested Endpoint:", `${apiError.config?.baseURL || ''}${apiError.config?.url || ''}`);
        console.error("Request Method:", apiError.config?.method?.toUpperCase());

        if (apiError.response) {
          console.error("HTTP Response Status:", apiError.response.status);
          console.error("HTTP Response Data:", apiError.response.data);
          console.error("HTTP Response Headers:", apiError.response.headers);
        } else if (apiError.request) {
          console.error("No response received from server. Request details:", apiError.request);
          console.error("Troubleshooting Advice: This usually happens when the backend server is crashed/offline, there is a local CORS policy mismatch, or there is a Mixed Content block (HTTPS requesting HTTP).");
        }
      } else {
        const standardError = err as { message?: string; stack?: string };
        console.error("Non-API Error Message:", standardError.message || String(err));
        if (standardError.stack) {
          console.error("Non-API Error Stack:", standardError.stack);
        }
      }
      console.error("=====================================");

      // 2. User-facing UI error message resolution
      let errorMessage = 'Login failed';
      const parsedError = err as {
        response?: {
          data?: { message?: string; error?: string };
          status?: number
        };
        request?: unknown;
        message?: string;
        code?: string
      };

      if (parsedError.response) {
        // Server returned an error code (4xx, 5xx)
        errorMessage = parsedError.response.data?.message || parsedError.response.data?.error || `Server error (${parsedError.response.status})`;
      } else if (parsedError.request) {
        // Request made but no response returned
        if (parsedError.code === 'ERR_NETWORK') {
          errorMessage = 'Network Error: Cannot connect to the server. Please verify the backend service is running and CORS allows this origin.';
        } else {
          errorMessage = 'Network Error: Connection timed out or server unreachable. Please try again.';
        }
      } else {
        // Other unexpected errors
        errorMessage = parsedError.message || 'Unknown Error';
      }

      setError(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <SEO
        title="Login"
        description="Securely access your Pype CRM account. Manage your sales pipeline and leads with ease."
      />
      {/* Visual Section - CSS Mesh Gradient & Animated Elements */}
      <div className="hidden lg:flex relative h-full overflow-hidden bg-[#0A0C10] flex-col justify-between p-12 text-white">
        {/* Dynamic Mesh Gradient Background */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[70%] h-[70%] rounded-full bg-indigo-600/20 blur-[120px] animate-pulse-soft" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-purple-600/20 blur-[120px] animate-pulse-soft" style={{ animationDelay: '-5s' }} />
          <div className="absolute top-[20%] right-[10%] w-[40%] h-[40%] rounded-full bg-blue-600/10 blur-[100px] animate-pulse-soft" style={{ animationDelay: '-10s' }} />
        </div>

        {/* Decorative Elements */}
        <div className="absolute inset-0 z-0 opacity-30">
          <div className="absolute top-[15%] left-[10%] w-64 h-64 rounded-full border border-white/10 animate-float" />
          <div className="absolute bottom-[20%] right-[15%] w-96 h-96 rounded-full border border-white/5 animate-float" style={{ animationDelay: '-7s' }} />
          <div className="absolute top-[40%] right-[20%] w-32 h-32 rounded-full bg-gradient-to-br from-indigo-500/10 to-transparent animate-float" style={{ animationDelay: '-12s' }} />
        </div>

        {/* Grid Overlay */}
        <div className="absolute inset-0 z-0 bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E')] opacity-20 mix-blend-overlay" />
        <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]" />

        <div className="relative z-10 flex items-center gap-2">
          <Logo size="lg" className="text-white" />
        </div>

        <div className="relative z-10 space-y-8 max-w-lg">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm text-xs font-medium text-indigo-200">
              <Sparkles className="w-3.5 h-3.5" />
              Next-Gen Sales Intelligence
            </div>
            <h2 className="text-5xl font-bold tracking-tight leading-[1.1]">
              Accelerate your <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Sales Velocity.</span>
            </h2>
          </div>

          <div className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md shadow-2xl space-y-4">
            <blockquote className="text-lg font-medium text-slate-200 leading-relaxed italic">
              "The transition from spreadsheets to Pype CRM was the single best decision for our sales team's productivity."
            </blockquote>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500" />
              <div>
                <div className="text-sm font-bold text-white">Sarah Jenkins</div>
                <div className="text-xs text-slate-400">Head of Sales @ GrowthScale</div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-slate-500 uppercase tracking-widest font-bold">
          <span>© 2026 PYPE CRM</span>
          <div className="flex gap-6">
            <span className="hover:text-white cursor-pointer transition-colors">Privacy</span>
            <span className="hover:text-white cursor-pointer transition-colors">Terms</span>
          </div>
        </div>
      </div>

      {/* Form Section */}
      <div className="flex items-center justify-center p-4 lg:p-12 bg-background data-[theme=dark]:bg-background">
        <Card className="w-full max-w-[400px] shadow-lg border-0 bg-card shadow-sm">
          <CardHeader className="space-y-1 text-center lg:text-left px-6 pt-6">
            <CardTitle className="text-3xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">Welcome Back</span>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Enter your credentials to access your account
            </p>
          </CardHeader>
          <CardContent className="space-y-4 px-6 pb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-white dark:bg-background"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                </div>
                {/* Hidden field for accessibility/password managers - moved before password for better browser detection */}
                <input type="text" name="username" value={email} readOnly style={{ position: 'absolute', opacity: 0, height: 0, width: 0, zIndex: -1 }} tabIndex={-1} autoComplete="username" aria-hidden="true" />
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="bg-white dark:bg-background pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-muted-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-md bg-destructive/15 text-destructive text-sm flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                  {error}
                </div>
              )}

              <div className="flex items-center space-x-2 py-2">
                <Checkbox
                  id="autoLogin"
                  checked={autoLogin}
                  onCheckedChange={(checked) => setAutoLogin(checked as boolean)}
                />
                <Label
                  htmlFor="autoLogin"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Remember me for 30 days
                </Label>
              </div>

              <Button
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300"
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>

        </Card>
      </div >
    </div >
  );
};

export default Login;
