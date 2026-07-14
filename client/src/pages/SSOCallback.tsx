import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { syncToken } from '../utils/mobileBridge';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const SSOCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  useEffect(() => {
    const dataParam = searchParams.get('data');
    if (dataParam) {
      try {
        const userInfoStr = decodeURIComponent(dataParam);
        const userInfo = JSON.parse(userInfoStr);

        if (userInfo && userInfo.token) {
          // Save to localStorage
          localStorage.setItem('userInfo', JSON.stringify(userInfo));

          // Sync token
          localStorage.setItem('autoLogin', 'true');
          syncToken(userInfo.token);
          window.dispatchEvent(new CustomEvent('auth-refresh', { detail: userInfo }));

          toast.success('Successfully logged in via SSO');

          // Redirect to dashboard
          window.location.href = '/dashboard';
        } else {
          setTimeout(() => setError('Invalid token data received'), 0);
        }
      } catch (err) {
        console.error('SSO Parse Error', err);
        setTimeout(() => setError('Failed to process login data'), 0);
      }
    } else {
      setTimeout(() => setError('No login data received'), 0);
    }
  }, [searchParams, navigate]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-red-500 font-medium mb-4">{error}</div>
        <button
          onClick={() => navigate('/login')}
          className="text-blue-600 hover:underline"
        >
          Return to Login
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
      <p className="text-gray-500">Completing secure sign-in...</p>
    </div>
  );
};

export default SSOCallback;
