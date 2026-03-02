'use client';

import React from 'react';
import styles from './FXRateDisplay.module.css';
import { CurrencyCode } from '@/types/currency';
import { Card } from '@/components/ui/Card/Card';
import { CURRENCY_INFO } from '@/constants/currencyPairs';

interface FXRateDisplayProps {
  baseCurrency: CurrencyCode;
  quoteCurrency: CurrencyCode;
  rate: number;
  lastUpdated?: Date | undefined;
  isLoading?: boolean;
}

/**
 * FX Rate Display Component
 * Shows exchange rate between two currencies
 */
export const FXRateDisplay: React.FC<FXRateDisplayProps> = ({
  baseCurrency,
  quoteCurrency,
  rate,
  lastUpdated,
  isLoading = false,
}) => {
  const baseInfo = CURRENCY_INFO[baseCurrency];
  const quoteInfo = CURRENCY_INFO[quoteCurrency];

  const getPriceChange = () => {
    if (rate > 1) return 'up';
    if (rate < 1) return 'down';
    return 'neutral';
  };

  const formattedRate = rate.toFixed(6);
  const priceChange = getPriceChange();

  return (
    <Card className={styles.rateCard}>
      {isLoading ? (
        <div className={styles.loading}>Loading rate...</div>
      ) : (
        <>
          <div className={styles.rateHeader}>
            <div className={styles.currencyPair}>
              <span className={styles.baseCurrency}>{baseCurrency}</span>
              <span className={styles.arrow}>→</span>
              <span className={styles.quoteCurrency}>{quoteCurrency}</span>
            </div>
            <div className={styles.rateSymbols}>
              <span className={styles.baseSymbol}>{baseInfo.symbol}</span>
              <span className={styles.quoteSymbol}>{quoteInfo.symbol}</span>
            </div>
          </div>

          <div className={styles.rateBody}>
            <p className={styles.rateLabel}>Exchange Rate</p>
            <div className={`${styles.rateValue} ${styles[`rate--${priceChange}`]}`}>
              <span className={styles.rate}>1 {baseCurrency}</span>
              <span className={styles.equals}>=</span>
              <span className={styles.rate}>{formattedRate} {quoteCurrency}</span>
            </div>
          </div>

          {lastUpdated && (
            <div className={styles.rateFooter}>
              <p className={styles.timestamp}>
                Updated: {lastUpdated.toLocaleTimeString()}
              </p>
            </div>
          )}
        </>
      )}
    </Card>
  );
};
