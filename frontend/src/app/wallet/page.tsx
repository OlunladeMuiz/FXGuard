'use client';

import React, { useState, useEffect } from 'react';
import styles from './page.module.css';
import { CurrencyBalanceCard } from '@/components/currency/CurrencyBalanceCard/CurrencyBalanceCard';
import { CurrencySelector } from '@/components/currency/CurrencySelector/CurrencySelector';
import { GlassButton } from '@/components/ui/glass-button';
import { Input } from '@/components/ui/Input/Input';
import { Card } from '@/components/ui/Card/Card';
import { Loader } from '@/components/ui/Loader/Loader';
import { CurrencyCode } from '@/types/currency';
import { Wallet } from '@/types/wallet';
import { Transaction } from '@/types/transaction';
import { formatCurrency } from '@/utils/formatCurrency';
import { calculateConversion } from '@/utils/calculateConversion';

/**
 * Wallet Page
 * Displays wallet details, balances, and recent transactions
 */
export default function WalletPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('USD');

  // Conversion form state
  const [fromCurrency, setFromCurrency] = useState<CurrencyCode>('USD');
  const [toCurrency, setToCurrency] = useState<CurrencyCode>('EUR');
  const [amount, setAmount] = useState<string>('');
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Mock data - would come from useWallet hook
        const mockWallet: Wallet = {
          id: '550e8400-e29b-41d4-a716-446655440000',
          userId: '550e8400-e29b-41d4-a716-446655440001',
          balances: [
            { currency: 'USD', amount: 12500.75, locked: 500 },
            { currency: 'EUR', amount: 8350.00 },
            { currency: 'GBP', amount: 4200.50, locked: 100 },
            { currency: 'NGN', amount: 5000000.00 },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'active',
        };

        const mockTransactions: Transaction[] = [
          {
            id: '550e8400-e29b-41d4-a716-446655440010',
            walletId: mockWallet.id,
            type: 'conversion',
            status: 'completed',
            amount: 100,
            currency: 'USD',
            description: 'Converted USD to EUR',
            createdAt: new Date(Date.now() - 3600000).toISOString(),
            updatedAt: new Date(Date.now() - 3600000).toISOString(),
          },
          {
            id: '550e8400-e29b-41d4-a716-446655440011',
            walletId: mockWallet.id,
            type: 'deposit',
            status: 'completed',
            amount: 500,
            currency: 'GBP',
            description: 'Deposit from bank',
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            updatedAt: new Date(Date.now() - 86400000).toISOString(),
          },
          {
            id: '550e8400-e29b-41d4-a716-446655440012',
            walletId: mockWallet.id,
            type: 'transfer',
            status: 'pending',
            amount: 200,
            currency: 'EUR',
            description: 'Transfer to John Doe',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];

        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        setWallet(mockWallet);
        setTransactions(mockTransactions);
        setError(null);
      } catch {
        setError('Failed to load wallet data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleConvert = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      return;
    }

    try {
      setConverting(true);
      // Mock conversion rate
      const rate = fromCurrency === 'USD' && toCurrency === 'EUR' ? 0.91 : 1.10;
      const convertedAmount = calculateConversion(parseFloat(amount), rate);
      
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Update balances (mock)
      if (wallet) {
        const updatedBalances = wallet.balances.map((b) => {
          if (b.currency === fromCurrency) {
            return { ...b, amount: b.amount - parseFloat(amount) };
          }
          if (b.currency === toCurrency) {
            return { ...b, amount: b.amount + convertedAmount };
          }
          return b;
        });

        setWallet({ ...wallet, balances: updatedBalances });
      }

      setAmount('');
      alert(`Converted ${formatCurrency(parseFloat(amount), fromCurrency)} to ${formatCurrency(convertedAmount, toCurrency)}`);
    } catch {
      alert('Conversion failed');
    } finally {
      setConverting(false);
    }
  };

  if (loading) {
    return <Loader message="Loading wallet..." />;
  }

  if (error || !wallet) {
    return (
      <div className={styles.error}>
        <Card>
          <h2>Error Loading Wallet</h2>
          <p>{error || 'Wallet not found'}</p>
          <GlassButton onClick={() => window.location.reload()} variant="primary">
            Try Again
          </GlassButton>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.wallet}>
      <header className={styles.header}>
        <h1 className={styles.title}>My Wallet</h1>
        <p className={styles.subtitle}>
          Wallet ID: {wallet.id.substring(0, 8)}...
        </p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Balances</h2>
        <div className={styles.balanceGrid}>
          {wallet.balances.map((balance) => (
            <CurrencyBalanceCard
              key={balance.currency}
              currency={balance.currency}
              balance={balance.amount}
              locked={balance.locked}
              isHighlighted={balance.currency === selectedCurrency}
              onClick={() => setSelectedCurrency(balance.currency)}
            />
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Quick Convert</h2>
        <Card>
          <div className={styles.convertForm}>
            <div className={styles.convertRow}>
              <div className={styles.convertField}>
                <label>From</label>
                <CurrencySelector
                  selected={fromCurrency}
                  onChange={setFromCurrency}
                  currencies={wallet.balances.map((b) => b.currency)}
                />
              </div>
              <div className={styles.convertField}>
                <label>To</label>
                <CurrencySelector
                  selected={toCurrency}
                  onChange={setToCurrency}
                  currencies={wallet.balances.map((b) => b.currency)}
                />
              </div>
            </div>
            <div className={styles.convertRow}>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                min={0}
                step={0.01}
              />
              <GlassButton
                variant="primary"
                onClick={handleConvert}
                isLoading={converting}
                disabled={!amount || fromCurrency === toCurrency}
              >
                Convert
              </GlassButton>
            </div>
          </div>
        </Card>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Recent Transactions</h2>
        <div className={styles.transactionsList}>
          {transactions.length > 0 ? (
            transactions.map((tx) => (
              <Card key={tx.id} className={styles.transactionCard}>
                <div className={styles.transactionHeader}>
                  <span className={`${styles.transactionType} ${styles[`type--${tx.type}`]}`}>
                    {tx.type}
                  </span>
                  <span className={`${styles.transactionStatus} ${styles[`status--${tx.status}`]}`}>
                    {tx.status}
                  </span>
                </div>
                <div className={styles.transactionBody}>
                  <p className={styles.transactionAmount}>
                    {formatCurrency(tx.amount, tx.currency)}
                  </p>
                  <p className={styles.transactionDescription}>
                    {tx.description}
                  </p>
                </div>
                <div className={styles.transactionFooter}>
                  <p className={styles.transactionDate}>
                    {new Date(tx.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </Card>
            ))
          ) : (
            <Card>
              <p>No transactions yet</p>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}
