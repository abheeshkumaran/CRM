// Helper to sanitize URL (remove trailing slash and /api suffix)
const sanitizeUrl = (url: string): string => {
    if (!url) return '';
    return url.replace(/\/$/, '').replace(/\/api$/, '');
};

/**
 * Intelligently determines the base API URL:
 * 1. Uses explicit VITE_API_URL if configured.
 * 2. If loaded from a remote domain/IP (not localhost), defaults to window.location.origin
 *    since the backend serves the frontend static files on the same host/port.
 * 3. Defaults to http://localhost:5001 for local development.
 */
const getApiUrl = (): string => {
    const envUrl = import.meta.env.VITE_API_URL;
    if (envUrl && !envUrl.includes('null') && !envUrl.includes('undefined')) {
        return sanitizeUrl(envUrl);
    }

    if (typeof window !== 'undefined' && window.location) {
        const hostname = window.location.hostname;
        // If accessed via a real server hostname or IP address (e.g. non-local)
        if (hostname && hostname !== 'localhost' && hostname !== '127.0.0.1') {
            return window.location.origin;
        }
    }

    return 'http://localhost:5001';
};

export const API_URL = getApiUrl();

// Debugging logic for production URL issues
if (API_URL.includes('null') || API_URL.includes('undefined')) {
    console.error('CRITICAL: API_URL contains invalid characters. Detected:', API_URL);
}

