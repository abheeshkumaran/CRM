interface MobileCallData {
    phoneNumber: string;
    duration: number;
    timestamp: number;
    status: string;
    [key: string]: string | number | undefined;
}

declare global {
    interface Window {
        MobileBridge?: {
            initiateCall: (phoneNumber: string, callSessionId?: string) => void;
            syncToken?: (token: string) => void;
            onCallCompleted?: (data: MobileCallData) => void;
        };
    }
}

export const isMobileApp = () => {
    return typeof window !== 'undefined' && !!(window as any).AndroidBridge;
};

export const initiateCall = (phoneNumber: string, callSessionId?: string) => {
    const sessionId = callSessionId || '';
    if (isMobileApp() && (window as any).AndroidBridge) {
        try {
            (window as any).AndroidBridge.initiateCall(phoneNumber, sessionId);
            return true;
        } catch (e) {
            console.error("Failed to call AndroidBridge.initiateCall", e);
        }
    }
    return false;
};

export const syncToken = (token: string) => {
    if (isMobileApp() && (window as any).AndroidBridge?.saveToken) {
        try {
            (window as any).AndroidBridge.saveToken(token);
        } catch (e) {
            console.error("Failed to call AndroidBridge.saveToken", e);
        }
    }
};

// Initialize MobileBridge object if detecting mobile environment
if (typeof window !== 'undefined') {
    window.MobileBridge = window.MobileBridge || {
        initiateCall: (phoneNumber: string, callSessionId?: string) => { 
            const sessionId = callSessionId || '';
            if ((window as any).AndroidBridge) {
                (window as any).AndroidBridge.initiateCall(phoneNumber, sessionId);
            }
        }
    };

    // Define the native callback handler that dispatches a DOM event
    window.MobileBridge.onCallCompleted = (data: MobileCallData) => {
        const event = new CustomEvent('mobile_call_completed', { detail: data });
        window.dispatchEvent(event);
    };
}

export const onCallCompleted = (callback: (data: MobileCallData) => void) => {
    if (typeof window !== 'undefined') {
        const handler = (event: Event) => {
            const customEvent = event as CustomEvent;
            callback(customEvent.detail);
        };
        window.addEventListener('mobile_call_completed', handler);
        return () => window.removeEventListener('mobile_call_completed', handler);
    }
    return () => { };
};

