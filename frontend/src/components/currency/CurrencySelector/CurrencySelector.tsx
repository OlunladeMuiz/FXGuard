'use client';

import React from 'react';
import styles from './CurrencySelector.module.css';
import { CurrencyCode } from '@/types/currency';
import { CURRENCY_INFO } from '@/constants/currencyPairs';

interface CurrencySelectorProps {
  selected: CurrencyCode;
  onChange: (currency: CurrencyCode) => void;
  disabled?: boolean;
  currencies?: CurrencyCode[];
}

/**
 * Currency Selector Component
 * Dropdown for selecting currency
 */
export const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  selected,
  onChange,
  disabled = false,
  currencies,
}) => {
  const availableCurrencies: CurrencyCode[] = currencies || (Object.keys(CURRENCY_INFO) as CurrencyCode[]);

  return (
    <div className={styles.selector}>
      <select
        value={selected}
        onChange={(e) => onChange(e.target.value as CurrencyCode)}
        disabled={disabled}
        className={styles.select}
      >
        {availableCurrencies.map((code) => {
          const info = CURRENCY_INFO[code];
          return (
            <option key={code} value={code}>
              {code} - {info.name}
            </option>
          );
        })}
      </select>
      <span className={styles.currentSymbol}>
        {CURRENCY_INFO[selected]?.symbol}
      </span>
    </div>
  );
};
