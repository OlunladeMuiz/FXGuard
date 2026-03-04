'use client';

import React from 'react';
import styles from './RecommendationPanel.module.css';
import { Card } from '@/components/ui/Card/Card';
import { Button } from '@/components/ui/Button/Button';
import { Loader } from '@/components/ui/Loader/Loader';
import { FXVolatilityMeter } from '@/components/fx/FXVolatilityMeter';
import { RiskScoreBadge } from '@/components/fx/RiskScoreBadge';
import { SavingsEstimator } from '@/components/fx/SavingsEstimator';
import { BestRateComparison } from '@/components/fx/BestRateComparison';
import { Recommendation, getActionDisplayText, getConfidenceDisplayText } from '@/types/recommendation';
import { FXHistoryPoint } from '@/types/fx';

interface RecommendationPanelProps {
  recommendation: Recommendation | null;
  loading: boolean;
  error: Error | null;
  invoiceAmount: number;
  currentRate: number;
  averageRate: number;
  historicalRates: FXHistoryPoint[];
  targetCurrency: string;
  volatility: number;
  onRefresh?: () => void;
}

/**
 * RecommendationPanel Component
 * Comprehensive panel displaying AI recommendation with all insights
 * Combines RiskScoreBadge, FXVolatilityMeter, SavingsEstimator, BestRateComparison
 */
export const RecommendationPanel: React.FC<RecommendationPanelProps> = ({
  recommendation,
  loading,
  error,
  invoiceAmount,
  currentRate,
  averageRate,
  historicalRates,
  targetCurrency,
  volatility,
  onRefresh,
}) => {
  if (loading) {
    return (
      <Card className={styles.panel}>
        <Loader message="Loading recommendation..." />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={styles.panel}>
        <div className={styles.errorState}>
          <h3>Unable to Load Recommendation</h3>
          <p>{error.message}</p>
          {onRefresh && (
            <Button variant="secondary" onClick={onRefresh}>
              Try Again
            </Button>
          )}
        </div>
      </Card>
    );
  }

  if (!recommendation) {
    return (
      <Card className={styles.panel}>
        <div className={styles.emptyState}>
          <h3>No Recommendation Available</h3>
          <p>Select an invoice to view AI-powered recommendations.</p>
        </div>
      </Card>
    );
  }

  const getActionColor = (action: string): string => {
    const colors: Record<string, string> = {
      convert_now: 'var(--color-success)',
      wait: 'var(--color-warning)',
      hedge: 'var(--color-primary)',
      split_conversion: 'var(--color-primary)',
    };
    return colors[action] || 'var(--color-neutral-700)';
  };

  return (
    <Card className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.title}>AI Recommendation</h2>
        {onRefresh && (
          <Button variant="secondary" size="sm" onClick={onRefresh}>
            Refresh
          </Button>
        )}
      </div>

      {/* Main Recommendation */}
      <div className={styles.mainRecommendation}>
        <div 
          className={styles.actionBadge}
          style={{ backgroundColor: getActionColor(recommendation.action) }}
        >
          {getActionDisplayText(recommendation.action)}
        </div>
        
        <div className={styles.confidenceRow}>
          <span className={styles.confidenceLabel}>Confidence:</span>
          <span className={styles.confidenceValue}>
            {getConfidenceDisplayText(recommendation.confidence)}
            <span className={styles.confidencePercent}>
              ({(recommendation.confidence * 100).toFixed(0)}%)
            </span>
          </span>
        </div>

        <p className={styles.explanation}>{recommendation.explanation}</p>

        <div className={styles.riskRow}>
          <span className={styles.riskLabel}>Risk Assessment:</span>
          <RiskScoreBadge riskScore={recommendation.riskScore} size="sm" />
        </div>
      </div>

      {/* Volatility Meter */}
      <div className={styles.section}>
        <FXVolatilityMeter volatility={volatility} size="md" />
      </div>

      {/* Savings Estimator */}
      <div className={styles.section}>
        <SavingsEstimator
          amount={invoiceAmount}
          currentRate={currentRate}
          averageRate={averageRate}
          targetCurrency={targetCurrency}
        />
      </div>

      {/* Best Rate Comparison */}
      <div className={styles.section}>
        <BestRateComparison
          amount={invoiceAmount}
          currentRate={currentRate}
          historicalRates={historicalRates}
          targetCurrency={targetCurrency}
        />
      </div>

      {/* Factors */}
      {recommendation.factors && recommendation.factors.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Key Factors</h3>
          <div className={styles.factorsList}>
            {recommendation.factors.map((factor, index) => (
              <div key={index} className={styles.factorItem}>
                <span 
                  className={`${styles.factorImpact} ${styles[`impact--${factor.impact}`]}`}
                />
                <div className={styles.factorContent}>
                  <span className={styles.factorName}>{factor.name}</span>
                  <span className={styles.factorDescription}>{factor.description}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alternative Actions */}
      {recommendation.alternativeActions && recommendation.alternativeActions.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Alternative Strategies</h3>
          <div className={styles.alternativesList}>
            {recommendation.alternativeActions.map((alt, index) => (
              <div key={index} className={styles.alternativeItem}>
                <span className={styles.altAction}>
                  {getActionDisplayText(alt.action)}
                </span>
                <span className={styles.altConfidence}>
                  {(alt.confidence * 100).toFixed(0)}% confidence
                </span>
                <span className={styles.altReason}>{alt.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

export default RecommendationPanel;
