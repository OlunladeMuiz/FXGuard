'use client';

import React, { useMemo } from 'react';
import styles from './SavingsEstimator.module.css';
import { SavingsEstimate } from '@/types/fx';
import { calculateSavingsEstimate, formatSavingsMessage } from '@/utils/calculations';

interface SavingsEstimatorProps {
  amount: number;
  currentRate: number;
  averageRate: number;
  targetCurrency: string;
  baseCurrency?: string;
}

/**
 * SavingsEstimator Component
 * Displays estimated savings if converting at current vs average rate
 * Presentation-only - calculation done by utility function
 */
export const SavingsEstimator: React.FC<SavingsEstimatorProps> = ({
  amount,
  currentRate,
  averageRate,
  targetCurrency,
  baseCurrency = 'USD',
}) => {
  // Calculate savings using utility function
  const estimate: SavingsEstimate = useMemo(
    () => calculateSavingsEstimate(amount, currentRate, averageRate),
    [amount, currentRate, averageRate]
  );

  // Get currency symbol
  const getCurrencySymbol = (currency: string): string => {
    const symbols: Record<string, string> = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      NGN: '₦',
    };
    return symbols[currency] || currency;
  };

  const targetSymbol = getCurrencySymbol(targetCurrency);
  const savingsMessage = formatSavingsMessage(estimate.savings, targetSymbol);

  const formatNumber = (num: number): string => {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Savings Estimator</h3>
      
      <div 
        className={`${styles.messageBox} ${
          estimate.isPositiveSavings ? styles.positive : styles.negative
        }`}
      >
        <span className={styles.messageIcon}>
          {estimate.isPositiveSavings ? '✓' : '!'}
        </span>
        <span className={styles.messageText}>{savingsMessage}</span>
      </div>

      <div className={styles.details}>
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Invoice Amount</span>
          <span className={styles.detailValue}>
            {getCurrencySymbol(baseCurrency)}{formatNumber(amount)}
          </span>
        </div>
        
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Current Rate</span>
          <span className={styles.detailValue}>{currentRate.toFixed(4)}</span>
        </div>
        
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>30-Day Average</span>
          <span className={styles.detailValue}>{averageRate.toFixed(4)}</span>
        </div>
        
        <div className={styles.divider} />
        
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>At Current Rate</span>
          <span className={styles.detailValue}>
            {targetSymbol}{formatNumber(estimate.currentConversion)}
          </span>
        </div>
        
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>At Average Rate</span>
          <span className={styles.detailValue}>
            {targetSymbol}{formatNumber(estimate.averageConversion)}
          </span>
        </div>
        
        <div className={styles.detailRow}>
          <span className={styles.detailLabel}>Difference</span>
          <span 
            className={`${styles.detailValue} ${
              estimate.isPositiveSavings ? styles.positiveValue : styles.negativeValue
            }`}
          >
            {estimate.isPositiveSavings ? '+' : ''}
            {targetSymbol}{formatNumber(estimate.savings)}
            <span className={styles.percentage}>
              ({estimate.savingsPercentage.toFixed(2)}%)
            </span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default SavingsEstimator;
