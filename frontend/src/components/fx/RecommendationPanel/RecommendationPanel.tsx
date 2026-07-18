'use client';

import Link from 'next/link';

import styles from './RecommendationPanel.module.css';
import { getActionDisplayText, Recommendation } from '@/types/recommendation';

interface RecommendationPanelProps {
  recommendation: Recommendation | null;
  loading: boolean;
  error: Error | null;
  compact?: boolean;
  primaryActionHref?: string;
  primaryActionLabel?: string;
  secondaryActionHref?: string;
  secondaryActionLabel?: string;
  onRefresh?: () => void;
}

/**
 * FXGuard v2 Recommendation Card
 *
 * Matches fxguard-style-guide-v2.html exactly:
 * - Dark surface card with action-colored badge/dot
 * - Prominent headline + explanation
 * - Confidence bar (High/Medium/Low) + data quality indicator (always visible)
 * - "Convert & Generate Payment Link" CTA + "See why →" ghost link
 *
 * Three consumers:
 * - invoice-generator/page.tsx (compact)
 * - invoice-generator/review/page.tsx (full)
 * - dashboard/page.tsx (full)
 */
export const RecommendationPanel = ({
  recommendation,
  loading,
  error,
  compact = false,
  primaryActionHref,
  primaryActionLabel = 'Convert & Generate Payment Link',
  secondaryActionHref,
  secondaryActionLabel = 'See why →',
  onRefresh,
}: RecommendationPanelProps) => {
  /* ── Loading state ── */
  if (loading) {
    return (
      <section className={styles.recCard} aria-busy="true">
        <div className={styles.stateBlock}>
          <span className={styles.stateKicker}>Recommendation</span>
          <h2 className={styles.stateTitle}>Checking market data</h2>
          <p className={styles.stateBody}>
            Loading the latest rates and indicators before showing guidance.
          </p>
        </div>
      </section>
    );
  }

  /* ── Error state ── */
  if (error) {
    return (
      <section className={styles.recCard} role="alert">
        <div className={styles.stateBlock}>
          <span className={styles.stateKicker}>Recommendation</span>
          <h2 className={styles.stateTitle}>Unable to load guidance</h2>
          <p className={styles.stateBody}>{error.message}</p>
          {onRefresh ? (
            <div className={styles.stateAction}>
              <button className={styles.btnGhost} type="button" onClick={onRefresh}>
                Try again
              </button>
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  /* ── Empty state ── */
  if (!recommendation) {
    return (
      <section className={styles.recCard}>
        <div className={styles.stateBlock}>
          <span className={styles.stateKicker}>Recommendation</span>
          <h2 className={styles.stateTitle}>No recommendation available yet</h2>
          <p className={styles.stateBody}>
            Select an invoice and currency pair to load a decision.
          </p>
        </div>
      </section>
    );
  }

  /* ── Data helpers ── */

  // Action → CSS class map
  const actionCss =
    (recommendation.action === 'convert_now' ? styles.actionConvert
      : recommendation.action === 'wait' ? styles.actionWait
      : recommendation.action === 'hedge' ? styles.actionHedge
      : recommendation.action === 'split_conversion' ? styles.actionSplit
      : styles.actionWait) ?? '';

  // Confidence bucketing
  const confidencePct = Math.round(recommendation.confidence * 100);
  let confidenceBucket: 'High' | 'Medium' | 'Low';
  let confidenceCss: string;

  if (recommendation.confidence >= 0.8) {
    confidenceBucket = 'High';
    confidenceCss = styles.confidenceHigh ?? '';
  } else if (recommendation.confidence >= 0.5) {
    confidenceBucket = 'Medium';
    confidenceCss = styles.confidenceMedium ?? '';
  } else {
    confidenceBucket = 'Low';
    confidenceCss = styles.confidenceLow ?? '';
  }

  // Data quality disclosure — always visible
  const isSynthetic = recommendation.containsSynthetic;
  const isFullHistory = recommendation.historyQuality === 'full';
  const realPoints = recommendation.realDataPoints;

  let qualityLabel: string;
  let qualityCss: string;

  if (isSynthetic) {
    qualityLabel = 'Estimated · synthetic history';
    qualityCss = styles.dataQualitySynthetic ?? '';
  } else if (isFullHistory) {
    qualityLabel = `Live · ${realPoints} real data points`;
    qualityCss = styles.dataQuality ?? '';
  } else {
    qualityLabel = `Limited data · ${realPoints} real points`;
    qualityCss = styles.dataQualityLimited ?? '';
  }

  // Headline: Dynamic based on recommendation action
  const amountFormatted = recommendation.amount.toLocaleString('en-US', {
    style: 'currency',
    currency: recommendation.base,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  const getDynamicHeadline = (action: string, amount: string): string => {
    switch (action) {
      case 'convert_now':
        return `Convert your ${amount} invoice today`;
      case 'wait':
        return `Hold off converting your ${amount} invoice`;
      case 'hedge':
        return `Hedge your ${amount} invoice exposure`;
      case 'split_conversion':
        return `Split the conversion of your ${amount} invoice`;
      default:
        return `Review your ${amount} invoice`;
    }
  };

  const headline = getDynamicHeadline(recommendation.action, amountFormatted);

  // "convert_now" gets the special state class on the card (border glow)
  const isConvert = recommendation.action === 'convert_now';
  const cardStateCss = isConvert ? (styles.stateConvert ?? '') : '';

  // Button background color tied to recommendation action
  const btnActionClass =
    (recommendation.action === 'convert_now' ? styles.btnConvert
      : recommendation.action === 'wait' ? styles.btnWait
      : recommendation.action === 'hedge' ? styles.btnHedge
      : recommendation.action === 'split_conversion' ? styles.btnSplit
      : styles.btnWait) ?? '';

  /* ── Full card ── */
  return (
    <section className={`${styles.recCard} ${cardStateCss}`.trim()}>
      {/* Action badge with dot */}
      <div className={`${styles.actionBadge} ${actionCss}`}>
        <span className={styles.actionBadgeDot} />
        {getActionDisplayText(recommendation.action)}
      </div>

      {compact ? null : (
        <>
          {/* Headline */}
          <h3 className={styles.headline}>{headline}</h3>

          {/* Explanation */}
          <p className={styles.explanation}>{recommendation.explanation}</p>
        </>
      )}

      {/* Meta row: confidence + data quality */}
      <div className={styles.metaRow}>
        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Confidence</span>
          <div className={`${styles.confidenceWrap} ${confidenceCss}`}>
            <div className={styles.confidenceTrack}>
              <div
                className={styles.confidenceFill}
                style={{ width: `${confidencePct}%` }}
              />
            </div>
            <div className={styles.confidenceLabel}>
              <span className={styles.confidencePct}>{confidencePct}%</span> {confidenceBucket}
            </div>
          </div>
        </div>

        <div className={styles.metaItem}>
          <span className={styles.metaLabel}>Data quality</span>
          <div className={`${styles.dataQuality} ${qualityCss}`}>
            <span className={styles.dataQualityDot} />
            {qualityLabel}
          </div>
        </div>
      </div>

      {/* CTA buttons (hidden in compact mode) */}
      {compact ? null : (
        <div className={styles.ctaRow}>
          {primaryActionHref ? (
            <Link className={`${styles.btnPrimary} ${btnActionClass}`} href={primaryActionHref}>
              {primaryActionLabel}
            </Link>
          ) : (
            <button className={`${styles.btnPrimary} ${btnActionClass}`} type="button" disabled>
              {primaryActionLabel}
            </button>
          )}
          {secondaryActionHref && (
            <Link className={styles.btnGhost} href={secondaryActionHref}>
              {secondaryActionLabel}
            </Link>
          )}
        </div>
      )}
    </section>
  );
};

export default RecommendationPanel;
