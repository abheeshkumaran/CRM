import axios from 'axios';
import { API_URL } from '@/config';

export const api = axios.create({
    baseURL: `${API_URL}/api`,
    withCredentials: true,
    timeout: 60000,
});

api.interceptors.request.use(
    (config) => {
        const userInfo = localStorage.getItem('userInfo');
        if (userInfo) {
            const { token } = JSON.parse(userInfo);
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Detailed console diagnostics for all API request failures
        console.error('====== API REQUEST FAILURE ======');
        console.error('Target URL:', `${error.config?.baseURL || ''}${error.config?.url || ''}`);
        console.error('Request Method:', error.config?.method?.toUpperCase());
        console.error('HTTP Status:', error.response?.status || 'No Response (Network/Connection Error)');
        console.error('Error Code:', error.code || 'UNKNOWN');
        console.error('Error Message:', error.message || 'No Message');
        if (error.response?.data) {
            console.error('Response Data:', error.response.data);
        }
        console.error('=================================');

        if (error.response && error.response.status === 401) {
            // Don't redirect if we're already on the login page or this IS a login request
            const isLoginPage = window.location.pathname === '/login';
            const isLoginRequest = error.config?.url?.includes('/auth/login');

            if (!isLoginPage && !isLoginRequest) {
                localStorage.removeItem('userInfo');
                window.location.href = '/login';
            }
        }
        
        // Handle 500 errors gracefully for generic requests, 
        // but let specific pages handle their own errors if needed.
        // Actually, it's better to just log and let the caller handle it, 
        // OR return a structure that doesn't crash callers.
        if (error.response && error.response.status === 500) {
            console.error('Server error:', error.response.data);
        }
        
        return Promise.reject(error);
    }
);


