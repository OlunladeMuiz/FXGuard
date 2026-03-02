'use client';

import { useTransactions } from '@/hooks/useTransactions';
import { Card } from '@/components/ui/Card/Card';
import { Loader } from '@/components/ui/Loader/Loader';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import type { CurrencyCode } from '@/lib/types/currency';
import styles from './page.module.css';

// Mock wallet ID - in production, this would come from auth context
const MOCK_WALLET_ID = 'wallet-123';

export default function TransactionsPage() {
  const { transactions, loading, error } = useTransactions(MOCK_WALLET_ID);

  if (loading) {
    return (
      <div className={styles.container}>
        <Loader size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <Card>
          <div className={styles.error}>
            <h2>Error Loading Transactions</h2>
            <p>{error.message}</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Transaction History</h1>
        <p>View all your past transactions</p>
      </header>

      <div className={styles.filters}>
        <select className={styles.filterSelect}>
          <option value="all">All Types</option>
          <option value="conversion">Conversions</option>
          <option value="deposit">Deposits</option>
          <option value="withdrawal">Withdrawals</option>
          <option value="transfer">Transfers</option>
        </select>
        <select className={styles.filterSelect}>
          <option value="all">All Currencies</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="GBP">GBP</option>
          <option value="NGN">NGN</option>
        </select>
      </div>

      <div className={styles.transactionList}>
        {transactions.length === 0 ? (
          <Card>
            <div className={styles.empty}>
              <p>No transactions yet</p>
            </div>
          </Card>
        ) : (
          transactions.map((tx) => (
            <Card key={tx.id}>
              <div className={styles.transaction}>
                <div className={styles.txLeft}>
                  <span className={`${styles.txType} ${styles[tx.type]}`}>
                    {tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}
                  </span>
                  <span className={styles.txDate}>
                    {new Date(tx.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div className={styles.txRight}>
                  <span className={styles.txAmount}>
                    {tx.type === 'withdrawal' ? '-' : '+'}
                    {formatCurrency(tx.amount, tx.currency)}
                  </span>
                  <span className={`${styles.txStatus} ${styles[tx.status]}`}>
                    {tx.status}
                  </span>
                </div>
              </div>
              {tx.type === 'conversion' && tx.metadata && (
                <div className={styles.conversionDetails}>
                  <span>
                    {formatCurrency(
                      Number(tx.metadata.fromAmount) || 0,
                      (tx.metadata.fromCurrency as CurrencyCode) || 'USD'
                    )} →{' '}
                    {formatCurrency(
                      Number(tx.metadata.toAmount) || 0,
                      (tx.metadata.toCurrency as CurrencyCode) || 'USD'
                    )}
                  </span>
                  <span className={styles.rate}>
                    Rate: {Number(tx.metadata.rate)?.toFixed(4)}
                  </span>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
