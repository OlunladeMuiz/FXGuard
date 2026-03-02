'use client';

import React, { useState, useEffect } from 'react';
import styles from './page.module.css';
import { CurrencyBalanceCard } from '@/components/currency/CurrencyBalanceCard/CurrencyBalanceCard';
import { FXRateDisplay } from '@/components/currency/FXRateDisplay/FXRateDisplay';
import { CurrencySelector } from '@/components/currency/CurrencySelector/CurrencySelector';
import { Loader } from '@/components/ui/Loader/Loader';
import { Card } from '@/components/ui/Card/Card';
import { CurrencyCode } from '@/types/currency';
import { Balance } from '@/types/wallet';
import { FXRate } from '@/types/currency';

/**
 * Dashboard Page
 * Multi-currency wallet dashboard with FX rates and balances
 */
export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [rates, setRates] = useState<FXRate[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('USD');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    // Simulate fetching data - In production, replace with actual hooks
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Mock data - would come from useWallet and useFXRates hooks
        const mockBalances: Balance[] = [
          { currency: 'USD', amount: 12500.75, locked: 500 },
          { currency: 'EUR', amount: 8350.00, locked: 0 },
          { currency: 'GBP', amount: 4200.50, locked: 100 },
          { currency: 'NGN', amount: 5000000.00, locked: 0 },
        ];

        const mockRates: FXRate[] = [
          { base: 'USD', quote: 'EUR', rate: 0.91, timestamp: new Date().toISOString() },
          { base: 'USD', quote: 'GBP', rate: 0.79, timestamp: new Date().toISOString() },
          { base: 'USD', quote: 'NGN', rate: 1550.25, timestamp: new Date().toISOString() },
          { base: 'EUR', quote: 'USD', rate: 1.10, timestamp: new Date().toISOString() },
          { base: 'GBP', quote: 'USD', rate: 1.27, timestamp: new Date().toISOString() },
        ];

        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        setBalances(mockBalances);
        setRates(mockRates);
        setLastUpdated(new Date());
        setError(null);
      } catch {
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <Loader message="Loading dashboard..." />;
  }

  if (error) {
    return (
      <div className={styles.error}>
        <Card>
          <h2>Error Loading Dashboard</h2>
          <p>{error}</p>
          <button onClick={() => window.location.reload()}>Try Again</button>
        </Card>
      </div>
    );
  }

  const filteredRates = rates.filter(
    (rate) => rate.base === selectedCurrency
  );

  return (
    <div className={styles.dashboard}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.subtitle}>
            Multi-currency wallet overview
            {lastUpdated && (
              <span className={styles.lastUpdated}>
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <div className={styles.headerActions}>
          <CurrencySelector
            selected={selectedCurrency}
            onChange={setSelectedCurrency}
            currencies={['USD', 'EUR', 'GBP', 'NGN']}
          />
        </div>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Wallet Balances</h2>
        <div className={styles.balanceGrid}>
          {balances.map((balance) => (
            <CurrencyBalanceCard
              key={balance.currency}
              currency={balance.currency}
              balance={balance.amount}
              locked={balance.locked}
              isHighlighted={balance.currency === selectedCurrency}
            />
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>
          Exchange Rates (Base: {selectedCurrency})
        </h2>
        <div className={styles.ratesGrid}>
          {filteredRates.length > 0 ? (
            filteredRates.map((rate) => (
              <FXRateDisplay
                key={`${rate.base}-${rate.quote}`}
                baseCurrency={rate.base}
                quoteCurrency={rate.quote}
                rate={rate.rate}
                lastUpdated={lastUpdated ?? undefined}
              />
            ))
          ) : (
            <Card>
              <p>No exchange rates available for {selectedCurrency}</p>
            </Card>
          )}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Quick Actions</h2>
        <div className={styles.actionsGrid}>
          <Card>
            <h3>Convert Currency</h3>
            <p>Exchange between your wallet currencies at live rates</p>
          </Card>
          <Card>
            <h3>Send Money</h3>
            <p>Transfer funds to other wallets or bank accounts</p>
          </Card>
          <Card>
            <h3>Add Funds</h3>
            <p>Deposit money into your multi-currency wallet</p>
          </Card>
          <Card>
            <h3>View Transactions</h3>
            <p>See your complete transaction history</p>
          </Card>
        </div>
      </section>
    </div>
  );
}
