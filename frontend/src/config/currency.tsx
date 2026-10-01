import React, { createContext, useContext, useState, useEffect } from 'react';

export type CurrencyCode = 'INR' | 'USD';

export const DEFAULT_CURRENCY: CurrencyCode = 'INR';
export const STORAGE_KEY_CURRENCY = 'nh_base_currency';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  label: string;
  locale: string;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  INR: {
    code: 'INR',
    symbol: 'Rs.',
    label: 'INR (Rs.)',
    locale: 'en-IN',
  },
  USD: {
    code: 'USD',
    symbol: '$',
    label: 'USD ($)',
    locale: 'en-US',
  },
};

/**
 * Format a numeric amount according to the target currency rules.
 * - INR: "Rs. 1,255" or "Rs. 1,25,500" (Indian digit grouping, no cents for whole numbers)
 * - USD: "$1,255.00" (Standard digit grouping, always 2 decimal places)
 */
export function formatCurrency(
  amount: number | string | undefined | null,
  currency: CurrencyCode = DEFAULT_CURRENCY,
  options?: { hideSymbol?: boolean }
): string {
  const num = typeof amount === 'number' ? amount : Number(amount) || 0;
  const cfg = CURRENCIES[currency] || CURRENCIES[DEFAULT_CURRENCY];

  let formattedNum = '';
  if (currency === 'INR') {
    // Has decimals? If non-zero decimals, format with 2 digits, otherwise 0 digits (e.g. Rs. 100, Rs. 1,255)
    const hasFraction = Math.abs(num % 1) >= 0.005;
    formattedNum = new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: hasFraction ? 2 : 0,
      maximumFractionDigits: 2,
    }).format(num);
  } else {
    // USD standard formatting with .00
    formattedNum = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  }

  if (options?.hideSymbol) {
    return formattedNum;
  }

  if (currency === 'INR') {
    return `${cfg.symbol} ${formattedNum}`;
  }
  return `${cfg.symbol}${formattedNum}`;
}

export interface CurrencyContextType {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  symbol: string;
  code: CurrencyCode;
  format: (amount: number | string | undefined | null, options?: { hideSymbol?: boolean }) => string;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: DEFAULT_CURRENCY,
  setCurrency: () => {},
  symbol: CURRENCIES[DEFAULT_CURRENCY].symbol,
  code: DEFAULT_CURRENCY,
  format: (amount, options) => formatCurrency(amount, DEFAULT_CURRENCY, options),
});

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CURRENCY);
      if (stored === 'USD' || stored === 'INR') return stored;
      // Default to INR
      localStorage.setItem(STORAGE_KEY_CURRENCY, DEFAULT_CURRENCY);
      return DEFAULT_CURRENCY;
    } catch {
      return DEFAULT_CURRENCY;
    }
  });

  const setCurrency = (c: CurrencyCode) => {
    setCurrencyState(c);
    try {
      localStorage.setItem(STORAGE_KEY_CURRENCY, c);
      window.dispatchEvent(new Event('nh_currency_changed'));
    } catch {}
  };

  useEffect(() => {
    const handleSync = () => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY_CURRENCY);
        if ((stored === 'USD' || stored === 'INR') && stored !== currency) {
          setCurrencyState(stored);
        }
      } catch {}
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('nh_currency_changed', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('nh_currency_changed', handleSync);
    };
  }, [currency]);

  const value: CurrencyContextType = {
    currency,
    setCurrency,
    symbol: CURRENCIES[currency].symbol,
    code: currency,
    format: (amount, options) => formatCurrency(amount, currency, options),
  };

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
};

export const useCurrency = (): CurrencyContextType => {
  return useContext(CurrencyContext);
};

export interface MoneyProps {
  amount: number | string | undefined | null;
  hideSymbol?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const Money: React.FC<MoneyProps> = ({ amount, hideSymbol, className, style }) => {
  const { format } = useCurrency();
  return (
    <span className={className} style={style}>
      {format(amount, { hideSymbol })}
    </span>
  );
};
