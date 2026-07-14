/**
 * Brand Logos for Integrations
 * SVG-based brand icons for third-party integration services
 */

import React from 'react';

interface LogoProps {
  className?: string;
}

// Facebook/Meta Logo
export const FacebookLogo: React.FC<LogoProps> = ({ className = "h-6 w-6" }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

// WhatsApp Logo
export const WhatsAppLogo: React.FC<LogoProps> = ({ className = "h-6 w-6" }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

// Google Ads Logo (simplified G with ad icon)
export const GoogleAdsLogo: React.FC<LogoProps> = ({ className = "h-6 w-6" }) => (
  <svg viewBox="0 0 24 24" className={className}>
    <path fill="#FBBC04" d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4H7v2h5.55c-.67 1.86-1.65 3.59-2.98 5.04-1.12-1.23-2.02-2.62-2.71-4.13H4.84c.84 1.96 1.99 3.76 3.45 5.32L3.39 17.03l1.41 1.41L9.59 14l3.95 3.95.4-.39-1.07-2.49z" />
    <circle fill="#4285F4" cx="18.5" cy="16.5" r="3.5" />
  </svg>
);

// Happilee Logo (stylized H)
export const HappileeLogo: React.FC<LogoProps> = ({ className = "h-6 w-6" }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <rect x="4" y="4" width="4" height="16" rx="1" fill="#4FC3F7" />
    <rect x="16" y="4" width="4" height="16" rx="1" fill="#4FC3F7" />
    <rect x="6" y="10" width="12" height="4" rx="1" fill="#4FC3F7" />
    <circle cx="6" cy="6" r="1.5" fill="#FFD54F" />
    <circle cx="18" cy="6" r="1.5" fill="#FFD54F" />
  </svg>
);

// Wabis Logo (stylized W)
export const WabisLogo: React.FC<LogoProps> = ({ className = "h-6 w-6" }) => (
  <svg viewBox="0 0 24 24" className={className}>
    <path fill="#4CAF50" d="M2 6l4 12h2l3-9 3 9h2l4-12h-2.5l-2.5 8-3-8h-2l-3 8-2.5-8H2z" />
  </svg>
);

// DoubleTick Logo (two checkmarks)
export const DoubleTickLogo: React.FC<LogoProps> = ({ className = "h-6 w-6" }) => (
  <svg viewBox="0 0 24 24" className={className}>
    <path d="M1.5 12.5l5 5L18 6" stroke="#4CAF50" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M7 12.5l5 5L23.5 6" stroke="#2196F3" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Wati Logo (stylized chat bubble with W)
export const WatiLogo: React.FC<LogoProps> = ({ className = "h-6 w-6" }) => (
  <svg viewBox="0 0 24 24" className={className}>
    <path fill="#25D366" d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
    <text x="7" y="14" fill="white" fontSize="8" fontWeight="bold" fontFamily="Arial">W</text>
  </svg>
);

// HAL API Logo (code/API symbol)
export const HalApiLogo: React.FC<LogoProps> = ({ className = "h-6 w-6" }) => (
  <svg viewBox="0 0 24 24" className={className}>
    <path fill="#7C4DFF" d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z" />
    <rect x="10" y="11" width="4" height="2" fill="#7C4DFF" />
  </svg>
);

// Web Form Logo (form/input icon)
export const WebFormLogo: React.FC<LogoProps> = ({ className = "h-6 w-6" }) => (
  <svg viewBox="0 0 24 24" className={className}>
    <rect x="3" y="3" width="18" height="18" rx="2" fill="#2196F3" />
    <rect x="6" y="6" width="12" height="2" rx="0.5" fill="white" />
    <rect x="6" y="10" width="8" height="2" rx="0.5" fill="white" opacity="0.7" />
    <rect x="6" y="14" width="10" height="2" rx="0.5" fill="white" opacity="0.7" />
  </svg>
);

// Slack Logo
export const SlackLogo: React.FC<LogoProps> = ({ className = "h-6 w-6" }) => (
  <svg viewBox="0 0 24 24" className={className}>
    <path fill="#E01E5A" d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" />
    <path fill="#36C5F0" d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" />
    <path fill="#2EB67D" d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z" />
    <path fill="#ECB22E" d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
  </svg>
);

// Twilio Logo
export const TwilioLogo: React.FC<LogoProps> = ({ className = "h-6 w-6" }) => (
  <svg viewBox="0 0 24 24" className={className}>
    <circle cx="12" cy="12" r="12" fill="#F22F46" />
    <circle cx="9" cy="9" r="2" fill="white" />
    <circle cx="15" cy="9" r="2" fill="white" />
    <circle cx="9" cy="15" r="2" fill="white" />
    <circle cx="15" cy="15" r="2" fill="white" />
  </svg>
);

// SSO Logo (lock with key)
export const SSOLogo: React.FC<LogoProps> = ({ className = "h-6 w-6" }) => (
  <svg viewBox="0 0 24 24" className={className}>
    <rect x="5" y="10" width="14" height="10" rx="2" fill="#5C6BC0" />
    <path d="M12 7a3 3 0 0 0-3 3v1h6v-1a3 3 0 0 0-3-3z" fill="none" stroke="#5C6BC0" strokeWidth="2" />
    <circle cx="12" cy="15" r="1.5" fill="white" />
    <rect x="11.5" y="15" width="1" height="2" fill="white" />
  </svg>
);

// Zapier Logo (lightning bolt Z)
export const ZapierLogo: React.FC<LogoProps> = ({ className = "h-6 w-6" }) => (
  <svg viewBox="0 0 24 24" className={className}>
    <path d="M12 2L4 14h7l-1 8 9-12h-7l1-8z" fill="currentColor" />
  </svg>
);

export default {
  FacebookLogo,
  WhatsAppLogo,
  GoogleAdsLogo,
  HappileeLogo,
  WabisLogo,
  DoubleTickLogo,
  WatiLogo,
  HalApiLogo,
  WebFormLogo,
  SlackLogo,
  TwilioLogo,
  SSOLogo,
  ZapierLogo,
};
