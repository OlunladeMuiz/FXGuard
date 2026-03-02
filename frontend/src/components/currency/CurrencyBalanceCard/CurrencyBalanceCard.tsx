'use client';

import React from 'react';
import styles from './CurrencyBalanceCard.module.css';
import { CurrencyCode } from '@/types/currency';
import { formatCurrency } from '@/utils/formatCurrency';
import { CURRENCY_INFO } from '@/constants/currencyPairs';
import { Card } from '@/components/ui/Card/Card';

interface CurrencyBalanceCardProps {
  currency: CurrencyCode;
  balance: number;
  locked?: number | undefined;
  isHighlighted?: boolean;
  onClick?: () => void;
}

/**
 * Currency Balance Card Component
 * Displays balance for a specific currency
 */
export const CurrencyBalanceCard: React.FC<CurrencyBalanceCardProps> = ({
  currency,
  balance,
  locked = 0,
  isHighlighted = false,
  onClick,
}) => {
  const info = CURRENCY_INFO[currency];
  const available = balance - locked;

  return (
    <Card
      className={`${styles.currencyCard} ${
        isHighlighted ? styles['currencyCard--highlight'] : ''
      }`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className={styles.currencyCardHeader}>
        <div className={styles.currencyInfo}>
          <h3 className={styles.currencyCode}>{currency}</h3>
          <p className={styles.currencyName}>{info.name}</p>
        </div>
        <div className={styles.currencySymbol}>{info.symbol}</div>
      </div>

      <div className={styles.currencyCardBody}>
        <div className={styles.balanceSection}>
          <p className={styles.balanceLabel}>Total Balance</p>
          <p className={styles.balanceAmount}>
            {formatCurrency(balance, currency)}
          </p>
        </div>

        {locked > 0 && (
          <div className={styles.lockedSection}>
            <p className={styles.lockedLabel}>Locked</p>
            <p className={styles.lockedAmount}>
              {formatCurrency(locked, currency)}
            </p>
          </div>
        )}
      </div>

      {locked > 0 && (
        <div className={styles.currencyCardFooter}>
          <p className={styles.availableLabel}>Available</p>
          <p className={styles.availableAmount}>
            {formatCurrency(available, currency)}
          </p>
        </div>
      )}
    </Card>
  );
};
