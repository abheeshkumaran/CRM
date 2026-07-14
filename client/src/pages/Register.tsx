import { useState } from 'react';
import loginBg from '@/assets/login-bg.png';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Logo from '@/components/shared/Logo';
import SEO from '@/components/shared/SEO';
import { User, Mail, Lock, Loader2, Building, ArrowRight } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

const Register = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [autoLogin, setAutoLogin] = useState(true);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!acceptedTerms) {
      setError('Please accept the Terms and Conditions to proceed.');
      return;
    }

    setIsLoading(true);

    try {
      const { data } = await api.post('/auth/register', {
        firstName,
        lastName,
        companyName,
        email,
        password,
        role: 'admin' // First user is Admin of their Org
      });
      localStorage.setItem('userInfo', JSON.stringify(data));

      if (autoLogin) {
        localStorage.setItem('autoLogin', 'true');
        const { saveAndroidToken } = await import('@/utils/androidBridge');
        saveAndroidToken(data.token);
      } else {
        localStorage.removeItem('autoLogin');
      }

      window.dispatchEvent(new CustomEvent('auth-refresh', { detail: data }));
      // Small delay for animation
      setTimeout(() => navigate('/dashboard'), 500);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      setError(err.response?.data?.message || 'Registration failed');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <SEO
        title="Create Account"
        description="Start your free trial with Pype CRM today. The most powerful lead management platform for modern sales teams."
      />
      {/* Image Section */}
      <div className="hidden lg:block relative h-full bg-slate-900 order-last lg:order-first">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/90 to-purple-900/90 mix-blend-multiply z-10" />
        <img
          src={loginBg}
          alt="Login Background"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="relative z-20 h-full flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-2">
            <Logo size="lg" className="text-white" />
          </div>
          <div className="space-y-4 max-w-md">
            <blockquote className="text-2xl font-medium leading-relaxed">
              "Start your journey with the most powerful CRM built for modern sales teams."
            </blockquote>
            <div className="text-sm text-slate-300">
              Join thousands of growing companies.
            </div>
          </div>
        </div>
      </div>

      {/* Form Section */}
      <div className="flex items-center justify-center p-4 lg:p-12 bg-background">
        <Card className="w-full max-w-[500px] shadow-lg border-0 bg-card shadow-sm">
          <CardHeader className="space-y-1 text-center lg:text-left px-6 pt-6">
            <CardTitle className="text-3xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-primary to-violet-500 bg-clip-text text-transparent">Create Account</span>
            </CardTitle>
            <CardDescription>
              Start your 14-day free trial, no credit card required.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-6 pb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <div className="relative">
                  <Building className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="companyName"
                    placeholder="Acme Inc."
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="pl-9 bg-white dark:bg-background"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="firstName"
                      placeholder="John"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="pl-9 bg-white dark:bg-background"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="lastName"
                      placeholder="Doe"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="pl-9 bg-white dark:bg-background"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    placeholder="name@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 bg-white dark:bg-background"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 bg-white dark:bg-background"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="terms"
                    checked={acceptedTerms}
                    onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                  />
                  <Label htmlFor="terms" className="text-sm font-normal">
                    I agree to the <a href="/terms" target="_blank" className="text-primary hover:underline">Terms and Conditions</a>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
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
              </div>

              {error && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                  {error}
                </div>
              )}

              <Button
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300"
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  <>
                    Register <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center border-t px-6 py-4">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <a href="/login" className="font-medium text-primary hover:text-primary/80 transition-colors hover:underline">
                Login
              </a>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Register;
