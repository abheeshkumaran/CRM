import axios from 'axios';
import { parsePhoneNumberFromString, getCountryCallingCode, CountryCode } from 'libphonenumber-js';

interface GeoLocationData {
    country: string;
    countryCode: string;
    phoneCountryCode: string;
}

// Map of country codes to phone country codes (Fallback/Legacy)
const COUNTRY_TO_PHONE_CODE: Record<string, string> = {
    'US': '+1', 'CA': '+1', 'GB': '+44', 'IN': '+91', 'AU': '+61', 'NZ': '+64',
    'DE': '+49', 'FR': '+33', 'IT': '+39', 'ES': '+34', 'NL': '+31', 'BE': '+32',
    'CH': '+41', 'AT': '+43', 'SE': '+46', 'NO': '+47', 'DK': '+45', 'FI': '+358',
    'PL': '+48', 'CZ': '+420', 'HU': '+36', 'RO': '+40', 'GR': '+30', 'PT': '+351',
    'IE': '+353', 'BR': '+55', 'MX': '+52', 'AR': '+54', 'CL': '+56', 'CO': '+57',
    'PE': '+51', 'VE': '+58', 'ZA': '+27', 'EG': '+20', 'NG': '+234', 'KE': '+254',
    'GH': '+233', 'CN': '+86', 'JP': '+81', 'KR': '+82', 'TH': '+66', 'VN': '+84',
    'PH': '+63', 'ID': '+62', 'MY': '+60', 'SG': '+65', 'HK': '+852', 'TW': '+886',
    'PK': '+92', 'BD': '+880', 'LK': '+94', 'AE': '+971', 'SA': '+966', 'IL': '+972',
    'TR': '+90', 'RU': '+7', 'UA': '+380', 'KZ': '+7'
};

// Map of country codes to country names
const COUNTRY_CODE_TO_NAME: Record<string, string> = {
    'US': 'United States', 'CA': 'Canada', 'GB': 'United Kingdom', 'IN': 'India',
    'AU': 'Australia', 'NZ': 'New Zealand', 'DE': 'Germany', 'FR': 'France',
    'IT': 'Italy', 'ES': 'Spain', 'NL': 'Netherlands', 'BE': 'Belgium',
    'CH': 'Switzerland', 'AT': 'Austria', 'SE': 'Sweden', 'NO': 'Norway',
    'DK': 'Denmark', 'FI': 'Finland', 'PL': 'Poland', 'CZ': 'Czech Republic',
    'HU': 'Hungary', 'RO': 'Romania', 'GR': 'Greece', 'PT': 'Portugal',
    'IE': 'Ireland', 'BR': 'Brazil', 'MX': 'Mexico', 'AR': 'Argentina',
    'CL': 'Chile', 'CO': 'Colombia', 'PE': 'Peru', 'VE': 'Venezuela',
    'ZA': 'South Africa', 'EG': 'Egypt', 'NG': 'Nigeria', 'KE': 'Kenya',
    'GH': 'Ghana', 'CN': 'China', 'JP': 'Japan', 'KR': 'South Korea',
    'TH': 'Thailand', 'VN': 'Vietnam', 'PH': 'Philippines', 'ID': 'Indonesia',
    'MY': 'Malaysia', 'SG': 'Singapore', 'HK': 'Hong Kong', 'TW': 'Taiwan',
    'PK': 'Pakistan', 'BD': 'Bangladesh', 'LK': 'Sri Lanka', 'AE': 'United Arab Emirates',
    'SA': 'Saudi Arabia', 'IL': 'Israel', 'TR': 'Turkey', 'RU': 'Russia',
    'UA': 'Ukraine', 'KZ': 'Kazakhstan'
};

export const GeoLocationService = {
    /**
     * Detect country from IP address using ip-api.com (free, no API key required)
     */
    async detectCountryFromIP(ipAddress: string): Promise<GeoLocationData | null> {
        try {
            if (!ipAddress || ipAddress === '::1' || ipAddress.startsWith('127.') || ipAddress.startsWith('192.168.') || ipAddress.startsWith('10.')) {
                return null;
            }

            const response = await axios.get(`http://ip-api.com/json/${ipAddress}`, {
                params: { fields: 'status,country,countryCode' },
                timeout: 3000
            });

            if (response.data.status === 'success') {
                const countryCode = response.data.countryCode;
                const phoneCountryCode = this.getPhoneCountryCode(countryCode);
                
                return {
                    country: response.data.country,
                    countryCode: countryCode,
                    phoneCountryCode: phoneCountryCode
                };
            }

            return null;
        } catch (error) {
            console.error('[GeoLocation] Error detecting country from IP:', error);
            return null;
        }
    },

    /**
     * Extract country data from Meta lead form data
     */
    extractCountryFromMetaLead(fieldMap: Record<string, string>): GeoLocationData | null {
        try {
            const countryName = fieldMap.country || fieldMap.country_name;
            if (countryName) {
                const countryCode = Object.entries(COUNTRY_CODE_TO_NAME).find(
                    ([_, name]) => name.toLowerCase() === countryName.toLowerCase()
                )?.[0];

                if (countryCode) {
                    return {
                        country: COUNTRY_CODE_TO_NAME[countryCode],
                        countryCode: countryCode,
                        phoneCountryCode: this.getPhoneCountryCode(countryCode)
                    };
                }
            }
            return null;
        } catch (error) {
            console.error('[GeoLocation] Error extracting country from Meta lead:', error);
            return null;
        }
    },

    /**
     * Get phone country code from country code
     */
    getPhoneCountryCode(countryCode: string): string {
        if (!countryCode) return '';
        try {
            const code = getCountryCallingCode(countryCode.toUpperCase() as CountryCode);
            return `+${code}`;
        } catch (e) {
            return COUNTRY_TO_PHONE_CODE[countryCode.toUpperCase()] || '';
        }
    },

    /**
     * Get country name from country code
     */
    getCountryName(countryCode: string): string {
        return COUNTRY_CODE_TO_NAME[countryCode.toUpperCase()] || '';
    },

    /**
     * Detect country code and name from phone number using libphonenumber-js
     */
    detectCountryFromPhone(phone: string): GeoLocationData | null {
        if (!phone) return null;
        try {
            // Standardize phone for parsing (needs a + prefix to detect country)
            let phoneToParse = phone.toString().trim();
            const cleanPhone = phoneToParse.replace(/\D/g, '');

            if (!phoneToParse.startsWith('+')) {
                // Heuristic for India: 10 digits starting with 6-9
                if (cleanPhone.length === 10 && /^[6-9]/.test(cleanPhone)) {
                    phoneToParse = `+91${cleanPhone}`;
                } else if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) {
                    phoneToParse = `+${cleanPhone}`;
                } else {
                    // Default behavior: just prepend + and hope for the best
                    phoneToParse = `+${cleanPhone}`;
                }
            }

            const phoneNumber = parsePhoneNumberFromString(phoneToParse);
            if (phoneNumber && phoneNumber.country) {
                const countryCode = phoneNumber.country;
                return {
                    country: this.getCountryName(countryCode) || countryCode,
                    countryCode: countryCode,
                    phoneCountryCode: `+${phoneNumber.countryCallingCode}`
                };
            }

            return null;
        } catch (error) {
            console.error('[GeoLocation] Error detecting country from phone:', error);
            return null;
        }
    }
};

export default GeoLocationService;
