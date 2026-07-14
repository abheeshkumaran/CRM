import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getGlobalCurrency, setGlobalCurrency, formatCurrency as formatCurrencyUtil, getCurrencySymbol as getCurrencySymbolUtil } from '@/lib/utils';

interface CurrencyContextType {
  currency: string;
  setCurrency: (currency: string) => void;
  formatCurrency: (amount: number, options?: {
    compact?: boolean;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  }) => string;
  formatCurrencyCompact: (amount: number) => string;
  currencySymbol: string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize currency from localStorage if available, otherwise use global default
  const [currency, setCurrencyState] = useState(() => {
    try {
      const userInfo = localStorage.getItem('userInfo');
      if (userInfo) {
        const parsed = JSON.parse(userInfo);
        if (parsed.organisation?.currency) {
          const orgCurrency = parsed.organisation.currency.toUpperCase();
          setGlobalCurrency(orgCurrency);
          return orgCurrency;
        }
      }
    } catch (e) {
      console.error('Failed to load currency from localStorage', e);
    }
    return getGlobalCurrency();
  });

  useEffect(() => {
    // Listen for storage changes or custom events if needed
    const handleAuthRefresh = (event: any) => {
      const updatedUser = event.detail;
      if (updatedUser?.organisation?.currency) {
        setCurrencyState(updatedUser.organisation.currency);
        setGlobalCurrency(updatedUser.organisation.currency);
      }
    };

    window.addEventListener('auth-refresh', handleAuthRefresh);
    return () => window.removeEventListener('auth-refresh', handleAuthRefresh);
  }, []);

  const setCurrency = useCallback((newCurrency: string) => {
    setCurrencyState(newCurrency);
    setGlobalCurrency(newCurrency);
  }, []);

  const formatCurrency = useCallback((amount: number, options?: any) => {
    return formatCurrencyUtil(amount, currency, options);
  }, [currency]);

  const formatCurrencyCompact = useCallback((amount: number) => {
    return formatCurrencyUtil(amount, currency, { compact: true, maximumFractionDigits: 1 });
  }, [currency]);

  const currencySymbol = getCurrencySymbolUtil(currency);

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatCurrency, formatCurrencyCompact, currencySymbol }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
