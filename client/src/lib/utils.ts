import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

// Currency symbol mapping
const CURRENCY_SYMBOLS: Record<string, string> = {
    USD: '$',
    INR: '₹',
    EUR: '€',
    GBP: '£',
    AED: 'د.إ',
    AUD: 'A$',
    CAD: 'C$',
    SGD: 'S$',
    JPY: '¥',
    CNY: '¥',
    KRW: '₩',
    BRL: 'R$',
    MXN: '$',
    ZAR: 'R',
    CHF: 'CHF',
    SEK: 'kr',
    NOK: 'kr',
    DKK: 'kr',
    PLN: 'zł',
    THB: '฿',
    IDR: 'Rp',
    MYR: 'RM',
    PHP: '₱',
    VND: '₫',
    TRY: '₺',
    RUB: '₽',
    SAR: 'ر.س',
    QAR: 'ر.ق',
    KWD: 'د.ك',
    BHD: 'د.ب',
    OMR: 'ر.ع',
    NZD: 'NZ$',
    HKD: 'HK$',
    TWD: 'NT$',
};

// Locale mapping for proper number formatting
const CURRENCY_LOCALES: Record<string, string> = {
    USD: 'en-US',
    INR: 'en-IN',
    EUR: 'de-DE',
    GBP: 'en-GB',
    AED: 'ar-AE',
    AUD: 'en-AU',
    CAD: 'en-CA',
    SGD: 'en-SG',
    JPY: 'ja-JP',
    CNY: 'zh-CN',
    KRW: 'ko-KR',
    BRL: 'pt-BR',
    MXN: 'es-MX',
    ZAR: 'en-ZA',
    CHF: 'de-CH',
    SEK: 'sv-SE',
    NOK: 'nb-NO',
    DKK: 'da-DK',
    PLN: 'pl-PL',
    THB: 'th-TH',
    IDR: 'id-ID',
    MYR: 'ms-MY',
    PHP: 'en-PH',
    VND: 'vi-VN',
    TRY: 'tr-TR',
    RUB: 'ru-RU',
    SAR: 'ar-SA',
    QAR: 'ar-QA',
    KWD: 'ar-KW',
    BHD: 'ar-BH',
    OMR: 'ar-OM',
    NZD: 'en-NZ',
    HKD: 'zh-HK',
    TWD: 'zh-TW',
};

// Global currency store (simple module-level variable)
let currentCurrency = 'INR';

export function setGlobalCurrency(currency: string) {
    currentCurrency = currency.toUpperCase();
}

export function getGlobalCurrency() {
    return currentCurrency;
}

export function getCurrencySymbol(currency?: string): string {
    const curr = (currency || currentCurrency).toUpperCase();
    return CURRENCY_SYMBOLS[curr] || curr;
}

export function formatCurrency(amount: number, currency?: string, options?: {
    compact?: boolean;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
}) {
    const curr = (currency || currentCurrency).toUpperCase();
    const locale = CURRENCY_LOCALES[curr] || 'en-US';

    // Determine fraction digits with proper defaults
    const isCompact = options?.compact ?? false;
    const maxFractionDigits = options?.maximumFractionDigits ?? (isCompact ? 0 : 2);
    const minFractionDigits = options?.minimumFractionDigits ?? (isCompact ? 0 : Math.min(maxFractionDigits, 2));

    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: curr,
        notation: isCompact ? 'compact' : 'standard',
        minimumFractionDigits: minFractionDigits,
        maximumFractionDigits: maxFractionDigits,
    }).format(amount);
}

export function formatCurrencyCompact(amount: number, currency?: string) {
    return formatCurrency(amount, currency, { compact: true, maximumFractionDigits: 1 });
}

/**
 * Helper to construct safe URL for assets (brochures, images, etc.)
 * Ensures URLs bypass React Router and go directly to backend
 */
export function getAssetUrl(path?: string): string {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;

    // Ensure path starts with /
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;

    // In development, use localhost backend
    if (import.meta.env.DEV) {
        return `http://localhost:5001${normalizedPath}`;
    }

    // In production, ALWAYS use full absolute URL with protocol
    // This ensures React Router cannot intercept the request
    if (typeof window !== 'undefined') {
        const protocol = window.location.protocol;
        const host = window.location.host;
        return `${protocol}//${host}${normalizedPath}`;
    }

    // Fallback for SSR
    return normalizedPath;
}

export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        } else {
            // Fallback for non-secure contexts (HTTP)
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            textArea.style.top = "0";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                textArea.remove();
                return true;
            } catch (err) {
                console.error('Fallback: Oops, unable to copy', err);
                textArea.remove();
                return false;
            }
        }
    } catch (err) {
        console.error('Failed to copy: ', err);
        return false;
    }
}

/**
 * Safely retrieves and parses user info from localStorage
 */
export function getUserInfo() {
    try {
        const userInfo = localStorage.getItem('userInfo');
        return userInfo ? JSON.parse(userInfo) : null;
    } catch (e) {
        console.error("Failed to parse user info", e);
        return null;
    }
}

/**
 * Robust role checking helper that handles both string and object-based roles,
 * and is case-insensitive.
 */
export function checkRole(user: any, targetRoles: string | string[]): boolean {
    if (!user) return false;

    const targets = Array.isArray(targetRoles) ? targetRoles : [targetRoles];

    // Respect explicit boolean overrides sent by the backend login
    if (targets.includes('super_admin') && user.isSuperAdmin) return true;
    if (targets.includes('admin') && (user.isAdmin || user.isSuperAdmin)) return true;
    if (targets.includes('organisation_admin') && (user.isAdmin || user.isSuperAdmin)) return true;

    if (!user.role) return false;

    // Normalize user role to a lowercase string, replacing spaces and hyphens with underscores
    const userRoleStr = (typeof user.role === 'object'
        ? (user.role.roleKey || user.role.name || '')
        : String(user.role)).toLowerCase().replace(/[\s-]/g, '_');
        
    const userPositionStr = user.position ? String(user.position).toLowerCase().replace(/[\s-]/g, '_') : '';

    return targets.some(target => {
        const normalizedTarget = target.toLowerCase().replace(/[\s-]/g, '_');
        return normalizedTarget === userRoleStr || normalizedTarget === userPositionStr;
    });
}

/**
 * Checks if a user has administrative privileges (Admin or Super Admin)
 */
export function isAdmin(user: any): boolean {
    return checkRole(user, ['admin', 'super_admin']);
}

/**
 * Checks if a user has organizational administrator privileges (Org Admin, Admin, or Super Admin)
 */
export function isOrgAdmin(user: any): boolean {
    return checkRole(user, ['org_admin', 'organisation_admin', 'admin', 'super_admin']);
}

/**
 * Checks if a user is a Super Admin
 */
export function isSuperAdmin(user: any): boolean {
    return checkRole(user, 'super_admin');
}

/**
 * Checks if a user is a Branch Manager
 */
export function isBranchManager(user: any): boolean {
    return checkRole(user, 'branch_manager') || !!user?.isBranchManager;
}

/**
 * Checks if a user has manager privileges (Manager, Admin, or Super Admin)
 */
export function isManager(user: any): boolean {
    return checkRole(user, ['manager', 'admin', 'super_admin']);
}

/**
 * Checks if a user has access to the settings page
 * All users can access settings (they'll see filtered sections based on role)
 */
export function canAccessSettings(user: any): boolean {
    return !!user; // All authenticated users can access settings
}
/**
 * Formats a phone number for WhatsApp wa.me links.
 * 1. Removes all non-digit characters.
 * 2. Uses provided country code if available.
 * 3. Fallback: If the number is 10 digits and starts with 6-9 (Indian), prepends 91.
 */
export function formatWhatsAppNumber(phone?: string, countryCode?: string): string {
    if (!phone) return "";

    // Clean all non-digits
    let cleanedPhone = phone.toString().replace(/\D/g, "");
    let cleanedCC = countryCode ? countryCode.toString().replace(/\D/g, "") : "";

    // If we have a country code, ensure it's prepended
    if (cleanedCC) {
        // If phone already starts with the country code, don't prepend again
        // But be careful! Some country codes might overlap with local prefixes.
        // Usually, if it's long (>10) and starts with CC, it's already international.
        if (cleanedPhone.startsWith(cleanedCC) && cleanedPhone.length > 10) {
            return cleanedPhone;
        }
        return `${cleanedCC}${cleanedPhone}`;
    }

    // Logic for India (+91) - Default context fallback
    // If it's a 10-digit number, we assume it's Indian if it starts with mobile digits.
    if (cleanedPhone.length === 10 && /^[6-9]/.test(cleanedPhone)) {
        return `91${cleanedPhone}`;
    }

    return cleanedPhone;
}
