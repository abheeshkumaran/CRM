export interface CountryCode {
    name: string;
    code: string;
    prefix: string;
    flag: string;
}

export const countryCodes: CountryCode[] = [
    { name: 'India', code: 'IN', prefix: '+91', flag: '🇮🇳' },
    { name: 'United States', code: 'US', prefix: '+1', flag: '🇺🇸' },
    { name: 'United Kingdom', code: 'GB', prefix: '+44', flag: '🇬🇧' },
    { name: 'United Arab Emirates', code: 'AE', prefix: '+971', flag: '🇦🇪' },
    { name: 'Australia', code: 'AU', prefix: '+61', flag: '🇦🇺' },
    { name: 'Canada', code: 'CA', prefix: '+1', flag: '🇨🇦' },
    { name: 'Saudi Arabia', code: 'SA', prefix: '+966', flag: '🇸🇦' },
    { name: 'Singapore', code: 'SG', prefix: '+65', flag: '🇸🇬' },
    { name: 'Germany', code: 'DE', prefix: '+49', flag: '🇩🇪' },
    { name: 'France', code: 'FR', prefix: '+33', flag: '🇫🇷' },
    { name: 'Qatar', code: 'QA', prefix: '+974', flag: '🇶🇦' },
    { name: 'Oman', code: 'OM', prefix: '+968', flag: '🇴🇲' },
    { name: 'Kuwait', code: 'KW', prefix: '+965', flag: '🇰🇼' },
    { name: 'Bahrain', code: 'BH', prefix: '+973', flag: '🇧🇭' },
    { name: 'Malaysia', code: 'MY', prefix: '+60', flag: '🇲🇾' },
    { name: 'Sri Lanka', code: 'LK', prefix: '+94', flag: '🇱🇰' },
    { name: 'Pakistan', code: 'PK', prefix: '+92', flag: '🇵🇰' },
    { name: 'Bangladesh', code: 'BD', prefix: '+880', flag: '🇧🇩' },
    { name: 'Nepal', code: 'NP', prefix: '+977', flag: '🇳🇵' },
];

export const getCountryByPrefix = (prefix: string) => {
    return countryCodes.find(c => c.prefix === prefix);
};

export const getCountryByCode = (code: string) => {
    return countryCodes.find(c => c.code === code.toUpperCase());
};

export const identifyCountryFromPhone = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Sort by prefix length descending to match longest prefixes first (e.g. +880 before +8)
    const sortedCodes = [...countryCodes].sort((a, b) => b.prefix.length - a.prefix.length);
    
    for (const country of sortedCodes) {
        const prefixNoPlus = country.prefix.replace('+', '');
        if (cleanPhone.startsWith(prefixNoPlus)) {
            return {
                country,
                localNumber: cleanPhone.slice(prefixNoPlus.length)
            };
        }
    }
    
    return null;
};
