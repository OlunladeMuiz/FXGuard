'use client';

import React, { useMemo } from 'react';
import styles from './BestRateComparison.module.css';
import { BestRateComparisonData, FXHistoryPoint } from '@/types/fx';
import { calculateBestRateComparison } from '@/utils/calculations';

interface BestRateComparisonProps {
  amount: number;
  currentRate: number;
  historicalRates: FXHistoryPoint[];
  targetCurrency: string;
}

/**
 * BestRateComparison Component
 * Shows comparison between current rate and best rate this month
 * Presentation-only - calculation done by utility function
 */
export const BestRateComparison: React.FC<BestRateComparisonProps> = ({
  amount,
  currentRate,
  historicalRates,
  targetCurrency,
}) => {
  // Calculate best rate comparison using utility function
  const comparison: BestRateComparisonData = useMemo(
    () => calculateBestRateComparison(amount, currentRate, historicalRates),
    [amount, currentRate, historicalRates]
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

  const formatNumber = (num: number): string => {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const hasMissedOpportunity = comparison.difference > 0;

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Best Rate This Month</h3>
      
      <div className={styles.comparisonBox}>
        <div className={styles.quote}>
          {hasMissedOpportunity ? (
            <>
              If converted at best rate this month, you would have received{' '}
              <span className={styles.highlight}>
                {targetSymbol}{formatNumber(comparison.amountAtBestRate)}
              </span>{' '}
              instead of{' '}
              <span className={styles.current}>
                {targetSymbol}{formatNumber(comparison.amountAtCurrentRate)}
              </span>
            </>
          ) : (
            <>
              Current rate is the best this month! You receive{' '}
              <span className={styles.highlight}>
                {targetSymbol}{formatNumber(comparison.amountAtCurrentRate)}
              </span>
            </>
          )}
        </div>
      </div>

      <div className={styles.stats}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Current Rate</span>
          <span className={styles.statValue}>{comparison.currentRate.toFixed(4)}</span>
        </div>
        
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Best Rate</span>
          <span className={`${styles.statValue} ${styles.bestRate}`}>
            {comparison.bestRate.toFixed(4)}
          </span>
          <span className={styles.statDate}>
            on {formatDate(comparison.bestRateDate)}
          </span>
        </div>
        
        {hasMissedOpportunity && (
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Potential Gain</span>
            <span className={`${styles.statValue} ${styles.difference}`}>
              +{targetSymbol}{formatNumber(comparison.difference)}
              <span className={styles.percentage}>
                ({comparison.percentageDifference.toFixed(2)}%)
              </span>
            </span>
          </div>
        )}
      </div>

      <div className={styles.insight}>
        <span className={styles.insightIcon}>💡</span>
        <span className={styles.insightText}>
          {hasMissedOpportunity
            ? `The best rate was ${comparison.percentageDifference.toFixed(1)}% higher than today's rate.`
            : 'Now is an optimal time to convert based on this month\'s rates.'}
        </span>
      </div>
    </div>
  );
};

export default BestRateComparison;
