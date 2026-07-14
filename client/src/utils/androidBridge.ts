// Android Bridge Utility for WebView Integration

// Define the shape of the interface we injected from Android
interface AndroidInterface {
    syncLeads: (token: string) => void;
    saveToken: (token: string) => void;
    saveApiUrl: (url: string) => void;
    getToken: () => string | null;
    clearToken: () => void;
    requestLocationPermission: () => void;
    getRecordingStatus: () => string;
    showNotification: (title: string, message: string) => void;
    initiateCall?: (phone: string, sessionId: string) => void;
}

declare global {
    interface Window {
        AndroidBridge?: AndroidInterface;
    }
}

export const isAndroidWebView = (): boolean => {
    return typeof window !== 'undefined' && !!window.AndroidBridge;
};

/**
 * Triggers the Android App to fetch the latest leads and store them
 * securely in its local SQLite database.
 * Used for offline caller ID detection.
 */
export const triggerAndroidLeadSync = (token: string) => {
    if (isAndroidWebView() && window.AndroidBridge) {
        try {
            window.AndroidBridge.syncLeads(token);
            console.log("Triggered Android lead sync");
        } catch (e) {
            console.error("Failed to trigger Android lead sync", e);
        }
    }
};

/**
 * Gets the current recording status from the Android Service.
 */
export const getAndroidRecordingStatus = () => {
    if (isAndroidWebView() && window.AndroidBridge) {
        try {
            const statusString = window.AndroidBridge.getRecordingStatus();
            return JSON.parse(statusString);
        } catch (e) {
            console.error("Failed to parse Android recording status", e);
        }
    }
    return null;
};

/**
 * Saves the token to Android SharedPreferences for background persistence.
 */
export const saveAndroidToken = (token: string) => {
    if (isAndroidWebView() && window.AndroidBridge && window.AndroidBridge.saveToken) {
        try {
            window.AndroidBridge.saveToken(token);
        } catch (e) {
            console.error("Failed to save token to Android", e);
        }
    }
};

/**
 * Saves the API URL to Android SharedPreferences for background services.
 */
export const saveAndroidApiUrl = (url: string) => {
    if (isAndroidWebView() && window.AndroidBridge && window.AndroidBridge.saveApiUrl) {
        try {
            window.AndroidBridge.saveApiUrl(url);
        } catch (e) {
            console.error("Failed to save API URL to Android", e);
        }
    }
};

export const getAndroidToken = (): string | null => {
    if (isAndroidWebView() && window.AndroidBridge && window.AndroidBridge.getToken) {
        try {
            return window.AndroidBridge.getToken();
        } catch (e) {
            console.error("Failed to get token from Android", e);
        }
    }
    return null;
};

/**
 * Clears the token from Android SharedPreferences on logout.
 */
export const clearAndroidToken = () => {
    if (isAndroidWebView() && window.AndroidBridge && window.AndroidBridge.clearToken) {
        try {
            window.AndroidBridge.clearToken();
        } catch (e) {
            console.error("Failed to clear token from Android", e);
        }
    }
};

/**
 * Native request for device location permissions.
 */
export const requestAndroidLocationPermission = () => {
    if (isAndroidWebView() && window.AndroidBridge && window.AndroidBridge.requestLocationPermission) {
        try {
            window.AndroidBridge.requestLocationPermission();
        } catch (e) {
            console.error("Failed to request Android location permission", e);
        }
    }
};

/**
 * Triggers a native Android Push Notification from the CRM backend websocket.
 */
export const triggerAndroidNotification = (title: string, message: string) => {
    if (isAndroidWebView() && window.AndroidBridge && window.AndroidBridge.showNotification) {
        try {
            window.AndroidBridge.showNotification(title, message);
        } catch (e) {
            console.error("Failed to trigger Android notification", e);
        }
    }
};
