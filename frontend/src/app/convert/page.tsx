'use client';

import { useState, useEffect, useCallback } from 'react';
import { useFXRates } from '@/hooks/useFXRates';
import { useWallet } from '@/hooks/useWallet';
import { Card } from '@/components/ui/Card/Card';
import { GlassButton } from '@/components/ui/glass-button';
import { Input } from '@/components/ui/Input/Input';
import { Loader } from '@/components/ui/Loader/Loader';
import { CurrencySelector } from '@/components/currency/CurrencySelector/CurrencySelector';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { calculateConversion } from '@/lib/utils/calculateConversion';
import type { CurrencyCode } from '@/lib/types/currency';
import styles from './page.module.css';

// Mock wallet ID - in production, this would come from auth context
const MOCK_WALLET_ID = 'wallet-123';

export default function ConvertPage() {
  const { rates, loading: ratesLoading } = useFXRates('USD');
  const { wallet, loading: walletLoading } = useWallet(MOCK_WALLET_ID);

  const [fromCurrency, setFromCurrency] = useState<CurrencyCode>('USD');
  const [toCurrency, setToCurrency] = useState<CurrencyCode>('EUR');
  const [amount, setAmount] = useState<string>('');
  const [convertedAmount, setConvertedAmount] = useState<number>(0);
  const [isConverting, setIsConverting] = useState(false);

  const currentRate = rates.find(
    (r) => r.base === fromCurrency && r.quote === toCurrency
  );

  const fromBalance = wallet?.balances.find((b) => b.currency === fromCurrency);

  const updateConversion = useCallback(() => {
    const numAmount = parseFloat(amount);
    if (!isNaN(numAmount) && currentRate) {
      const result = calculateConversion(numAmount, currentRate.rate, 0.001); // 0.1% fee
      setConvertedAmount(result);
    } else {
      setConvertedAmount(0);
    }
  }, [amount, currentRate]);

  useEffect(() => {
    updateConversion();
  }, [updateConversion]);

  const handleSwapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
    setAmount('');
  };

  const handleConvert = async () => {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (fromBalance && numAmount > fromBalance.amount) {
      alert('Insufficient balance');
      return;
    }

    setIsConverting(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));

    setIsConverting(false);
    setAmount('');
    alert(
      `Successfully converted ${formatCurrency(numAmount, fromCurrency)} to ${formatCurrency(convertedAmount, toCurrency)}`
    );
  };

  if (ratesLoading || walletLoading) {
    return (
      <div className={styles.container}>
        <Loader size="lg" />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Currency Conversion</h1>
        <p>Convert between currencies at live exchange rates</p>
      </header>

      <Card>
        <div className={styles.converterBox}>
          {/* From Currency */}
          <div className={styles.currencyBox}>
            <label className={styles.label}>From</label>
            <CurrencySelector
              selected={fromCurrency}
              onChange={(code) => setFromCurrency(code)}
            />
            <Input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={styles.amountInput}
            />
            {fromBalance && (
              <span className={styles.balance}>
                Available: {formatCurrency(fromBalance.amount, fromCurrency)}
              </span>
            )}
          </div>

          {/* Swap Button */}
          <button
            className={styles.swapButton}
            onClick={handleSwapCurrencies}
            aria-label="Swap currencies"
          >
            ⇅
          </button>

          {/* To Currency */}
          <div className={styles.currencyBox}>
            <label className={styles.label}>To</label>
            <CurrencySelector
              selected={toCurrency}
              onChange={(code) => setToCurrency(code)}
            />
            <div className={styles.resultBox}>
              <span className={styles.convertedAmount}>
                {formatCurrency(convertedAmount, toCurrency)}
              </span>
            </div>
          </div>
        </div>

        {/* Rate Info */}
        {currentRate && (
          <div className={styles.rateInfo}>
            <div className={styles.rateRow}>
              <span>Exchange Rate:</span>
              <span className={styles.rateValue}>
                1 {fromCurrency} = {currentRate.rate.toFixed(4)} {toCurrency}
              </span>
            </div>
            <div className={styles.rateRow}>
              <span>Fee (0.1%):</span>
              <span className={styles.rateValue}>
                {formatCurrency(convertedAmount * 0.001, toCurrency)}
              </span>
            </div>
            <div className={styles.rateRow}>
              <span>You receive:</span>
              <span className={styles.finalAmount}>
                {formatCurrency(convertedAmount, toCurrency)}
              </span>
            </div>
          </div>
        )}

        <GlassButton
          variant="primary"
          onClick={handleConvert}
          disabled={!amount || parseFloat(amount) <= 0 || isConverting}
          className={styles.convertButton}
        >
          {isConverting ? 'Converting...' : 'Convert Now'}
        </GlassButton>
      </Card>

      {/* Recent Rates */}
      <section className={styles.ratesSection}>
        <h2>Live Exchange Rates</h2>
        <div className={styles.ratesGrid}>
          {rates.slice(0, 6).map((rate) => (
            <Card key={`${rate.base}-${rate.quote}`}>
              <div className={styles.rateCard}>
                <span className={styles.ratePair}>
                  {rate.base}/{rate.quote}
                </span>
                <span className={styles.rateCardValue}>{rate.rate.toFixed(4)}</span>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
