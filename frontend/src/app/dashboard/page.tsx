'use client';

import React, { useState, useCallback } from 'react';
import styles from './page.module.css';
import { FXRateDisplay } from '@/components/currency/FXRateDisplay/FXRateDisplay';
import { CurrencySelector } from '@/components/currency/CurrencySelector/CurrencySelector';
import { Loader } from '@/components/ui/Loader/Loader';
import { Card } from '@/components/ui/Card/Card';
import { Button } from '@/components/ui/Button/Button';
import { CurrencyCode } from '@/types/currency';
import { Invoice } from '@/types/invoice';
import { InvoiceForm } from '@/components/invoices/InvoiceForm';
import { InvoiceTable } from '@/components/invoices/InvoiceTable';
import { RecommendationPanel } from '@/components/fx/RecommendationPanel';
import { FXVolatilityMeter } from '@/components/fx/FXVolatilityMeter';
import { useInvoices } from '@/hooks/useInvoices';
import { useRecommendation } from '@/hooks/useRecommendation';
import { useFXHistory } from '@/hooks/useFXHistory';
import { useFXRates } from '@/hooks/useFXRates';

/**
 * Dashboard Page
 * AI-powered FX Intelligence Dashboard for SMEs
 * Displays invoices, recommendations, volatility metrics, and conversion insights
 */
export default function DashboardPage() {
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('USD');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);

  // Fetch invoices
  const { 
    invoices, 
    loading: invoicesLoading, 
    error: invoicesError, 
    refetch: refetchInvoices 
  } = useInvoices();

  // Fetch FX rates
  const { 
    rates, 
    loading: ratesLoading, 
    lastUpdated 
  } = useFXRates(selectedCurrency, ['NGN', 'EUR', 'GBP']);

  // Fetch FX history for selected invoice's target currency
  const targetCurrency = selectedInvoice?.targetCurrency || 'NGN';
  const { 
    history, 
    statistics,
    loading: historyLoading 
  } = useFXHistory('USD', targetCurrency as CurrencyCode, '30d');

  // Fetch recommendation for selected invoice
  const { 
    recommendation, 
    loading: recommendationLoading, 
    error: recommendationError,
    refresh: refreshRecommendation 
  } = useRecommendation(selectedInvoice?.id || null);

  const handleInvoiceSelect = useCallback((invoice: Invoice) => {
    setSelectedInvoice(invoice);
  }, []);

  const handleInvoiceCreated = useCallback(() => {
    setShowInvoiceForm(false);
    refetchInvoices();
  }, [refetchInvoices]);

  const handleRefreshRecommendation = useCallback(() => {
    refreshRecommendation();
  }, [refreshRecommendation]);

  // Get current and average rate
  const currentRate = statistics?.currentRate || 1550;
  const averageRate = statistics?.averageRate || 1530;
  const volatility = statistics?.volatility || 0.35;
  const historicalRates = history?.data || [];

  // Loading state
  if (invoicesLoading && ratesLoading) {
    return <Loader message="Loading dashboard..." />;
  }

  const filteredRates = rates.filter(
    (rate) => rate.base === selectedCurrency
  );

  return (
    <div className={styles.dashboard}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>FX Intelligence Dashboard</h1>
          <p className={styles.subtitle}>
            AI-powered insights for smart currency decisions
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
          <Button
            variant="primary"
            onClick={() => setShowInvoiceForm(true)}
          >
            Create Invoice
          </Button>
        </div>
      </header>

      {/* Invoice Form Modal */}
      {showInvoiceForm && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <InvoiceForm
              onSuccess={handleInvoiceCreated}
              onCancel={() => setShowInvoiceForm(false)}
            />
          </div>
        </div>
      )}

      {/* Main Grid Layout */}
      <div className={styles.mainGrid}>
        {/* Left Column - Invoices */}
        <div className={styles.leftColumn}>
          <section className={styles.section}>
            <InvoiceTable
              invoices={invoices}
              loading={invoicesLoading}
              error={invoicesError}
              onSelectInvoice={handleInvoiceSelect}
              selectedInvoiceId={selectedInvoice?.id}
            />
          </section>

          {/* FX Rates Section */}
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

          {/* Volatility Overview */}
          <section className={styles.section}>
            <Card>
              <div className={styles.volatilitySection}>
                <h2 className={styles.sectionTitle}>Market Volatility</h2>
                <FXVolatilityMeter volatility={volatility} size="lg" />
              </div>
            </Card>
          </section>
        </div>

        {/* Right Column - Recommendations */}
        <div className={styles.rightColumn}>
          {selectedInvoice ? (
            <RecommendationPanel
              recommendation={recommendation}
              loading={recommendationLoading || historyLoading}
              error={recommendationError}
              invoiceAmount={selectedInvoice.amount}
              currentRate={currentRate}
              averageRate={averageRate}
              historicalRates={historicalRates}
              targetCurrency={selectedInvoice.targetCurrency}
              volatility={volatility}
              onRefresh={handleRefreshRecommendation}
            />
          ) : (
            <Card className={styles.noSelectionCard}>
              <div className={styles.noSelection}>
                <h3>Select an Invoice</h3>
                <p>
                  Choose an invoice from the table to view AI-powered 
                  conversion recommendations and market insights.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
