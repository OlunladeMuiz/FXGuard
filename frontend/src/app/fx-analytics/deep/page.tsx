'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import styles from './page.module.css';
import { fetchRealFXCandles, fetchRealFXRate, fetchRealFXRateOnDate } from '@/lib/api/fx';
import { fetchRecommendation } from '@/lib/api/recommendation';
import type { SpreadRiskLevel } from '@/lib/types/engine';
import { type FXHistoryResponse, type FXHistoryPoint } from '@/lib/types/fx';
import {
  getActionDisplayText,
  getConfidenceDisplayText,
  getRiskLevelFromScore,
  type Recommendation,
} from '@/lib/types/recommendation';
import {
  useBrentSignal,
  useGarchRisk,
  useInterventionSignal,
  useNewsSignal,
  useRateAlerts,
  useReservesSignal,
  useSeasonalitySignal,
  useSimulator,
  useSpread,
} from '@/hooks/useEngine';

const DEFAULT_ANALYSIS_PAIR = {
  base: 'USD',
  quote: 'EUR',
};

const DEFAULT_SIMULATOR = {
  amount: 10000,
  lookback_days: 30,
};

const SIMULATOR_RATE_BASIS_OPTIONS = [
  { value: 'market', label: 'Market FX (ExchangeRate)' },
  { value: 'official', label: 'CBN official (NAFEM)' },
  { value: 'parallel', label: 'Parallel market' },
  { value: 'bdc', label: 'BDC lane' },
] as const;

function formatAlertPair(pair: string): string {
  return pair.replace('_', '/');
}

function formatAlertTimestamp(value: string | null): string {
  if (!value) {
    return 'Pending';
  }

  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) {
    return value;
  }

  return timestamp.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatHistoryDate(value: string | undefined): string {
  if (!value) {
    return '---';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function formatObservedDate(value: string | null): string {
  if (!value) {
    return 'Live snapshot pending';
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function formatRate(value: number | null | undefined, digits = 4): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '---';
  }

  return value.toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '---';
  }

  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function formatWaitProbability(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '---';
  }

  return `${value.toFixed(0)}%`;
}

function formatWaitDays(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '---';
  }

  const rounded = Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1);
  return `${rounded} day${Number(value.toFixed(1)) === 1 ? '' : 's'}`;
}

function formatSimulatorSource(source: string | null | undefined): string {
  switch (source) {
    case 'exchange_rate_api':
      return 'ExchangeRate API';
    case 'cbn_official':
      return 'CBN official';
    case 'abokifx_parallel':
      return 'AbokiFX parallel';
    case 'nairatoday_parallel':
      return 'NairaToday parallel';
    case 'nairatoday_bdc':
      return 'NairaToday BDC';
    default:
      return source ?? 'Unknown source';
  }
}

function formatRecommendationDataSource(source: string | null | undefined): string {
  switch (source) {
    case 'stored_history':
      return 'stored daily history';
    case 'candle_history':
      return '4h candle fallback history';
    case 'same_currency':
      return 'same-currency matching';
    default:
      return 'stored analytics history';
  }
}

function splitQualityNote(note: string): string[] {
  return (note.match(/[^.!?]+[.!?]?/g) ?? [note])
    .map((part) => part.trim())
    .filter(Boolean);
}

function formatCountLabel(value: number | null | undefined, unit: string): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '---';
  }

  return `${value.toLocaleString('en-US')} ${unit}${value === 1 ? '' : 's'}`;
}

function getMacroToneClass(level: SpreadRiskLevel | null | undefined): string {
  switch (level) {
    case 'LOW':
      return styles.good ?? '';
    case 'MEDIUM':
      return styles.watch ?? '';
    case 'HIGH':
    case 'CRITICAL':
      return styles.risk ?? '';
    default:
      return styles.neutral ?? '';
  }
}

function buildLinePath(points: FXHistoryPoint[], width: number, height: number): string {
  if (points.length === 0) {
    return '';
  }

  const rates = points.map((point) => point.rate);
  const minRate = Math.min(...rates);
  const maxRate = Math.max(...rates);
  const xStep = points.length > 1 ? width / (points.length - 1) : width;

  return points
    .map((point, index) => {
      const normalized = maxRate === minRate ? 0.5 : (point.rate - minRate) / (maxRate - minRate);
      const x = index * xStep;
      const y = height - normalized * height;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function buildAreaPath(points: FXHistoryPoint[], width: number, height: number): string {
  const linePath = buildLinePath(points, width, height);
  if (!linePath) {
    return '';
  }

  return `${linePath} L ${width} ${height} L 0 ${height} Z`;
}

function getChartLabels(points: FXHistoryPoint[]): string[] {
  if (points.length === 0) {
    return ['No data', '', ''];
  }

  const middleIndex = Math.floor(points.length / 2);
  return [
    formatHistoryDate(points[0]?.date),
    formatHistoryDate(points[middleIndex]?.date),
    formatHistoryDate(points[points.length - 1]?.date),
  ];
}

export default function FxDeepAnalysis() {
  const [analysisBase, setAnalysisBase] = useState(DEFAULT_ANALYSIS_PAIR.base);
  const [analysisQuote, setAnalysisQuote] = useState(DEFAULT_ANALYSIS_PAIR.quote);
  const [fxRate, setFxRate] = useState<number | null>(null);
  const [observedOn, setObservedOn] = useState<string | null>(null);
  const [rateChange, setRateChange] = useState<{ value: number; percent: number } | null>(null);
  const [history, setHistory] = useState<FXHistoryResponse | null>(null);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(true);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [simAmount, setSimAmount] = useState(String(DEFAULT_SIMULATOR.amount));
  const [simBase, setSimBase] = useState(DEFAULT_ANALYSIS_PAIR.base);
  const [simQuote, setSimQuote] = useState(DEFAULT_ANALYSIS_PAIR.quote);
  const [simLookback, setSimLookback] = useState(String(DEFAULT_SIMULATOR.lookback_days));
  const [simSource, setSimSource] = useState('market');
  const {
    result: simResult,
    loading: simLoading,
    error: simError,
    run: runSimulator,
    clear: clearSimulator,
  } = useSimulator();
  const { spread } = useSpread();
  const { signal: brentSignal } = useBrentSignal();
  const { data: garchRisk } = useGarchRisk(`${analysisBase}/${analysisQuote}`, 60);
  const { signal: seasonality } = useSeasonalitySignal();
  const { signal: newsSignal } = useNewsSignal();
  const { signal: reservesSignal } = useReservesSignal();
  const { signal: interventionSignal } = useInterventionSignal();

  const {
    alerts,
    loading: alertsLoading,
    creating,
    error: alertsError,
    successMessage,
    create: createAlert,
    remove: removeAlert,
  } = useRateAlerts();

  const [showAlertForm, setShowAlertForm] = useState(false);
  const [newAlertTarget, setNewAlertTarget] = useState('');
  const [newAlertDirection, setNewAlertDirection] = useState<'ABOVE' | 'BELOW'>('ABOVE');

  useEffect(() => {
    setSimBase(analysisBase);
    setSimQuote(analysisQuote);
  }, [analysisBase, analysisQuote]);

  const snapshotRateBasisSupported = simBase === 'USD' && simQuote === 'NGN';
  const simulatorRateOptions = snapshotRateBasisSupported
    ? SIMULATOR_RATE_BASIS_OPTIONS
    : SIMULATOR_RATE_BASIS_OPTIONS.filter((option) => option.value === 'market');

  useEffect(() => {
    if (snapshotRateBasisSupported || simSource === 'market') {
      return;
    }

    setSimSource('market');
    clearSimulator();
  }, [clearSimulator, simSource, snapshotRateBasisSupported]);

  useEffect(() => {
    let cancelled = false;

    const loadAnalysis = async () => {
      setAnalysisLoading(true);
      setAnalysisError(null);

      const previousDay = new Date();
      previousDay.setDate(previousDay.getDate() - 2);
      const previousDate = previousDay.toISOString().slice(0, 10);

      const results = await Promise.allSettled([
        fetchRealFXRate(analysisBase, analysisQuote),
        fetchRealFXRateOnDate(analysisBase, analysisQuote, previousDate),
        fetchRealFXCandles(analysisBase, analysisQuote, '30d'),
        fetchRecommendation(analysisBase, analysisQuote, DEFAULT_SIMULATOR.amount),
        runSimulator({
          base_currency: analysisBase,
          quote_currency: analysisQuote,
          amount: DEFAULT_SIMULATOR.amount,
          lookback_days: DEFAULT_SIMULATOR.lookback_days,
          rate_source: 'market',
        }),
      ]);

      if (cancelled) {
        return;
      }

      const [currentRateResult, previousRateResult, historyResult, recommendationResult] = results;

      if (currentRateResult.status === 'fulfilled') {
        setFxRate(currentRateResult.value.rate);
        setObservedOn(currentRateResult.value.date);
      } else {
        console.error('Failed to load deep analysis spot rate:', currentRateResult.reason);
      }

      if (
        currentRateResult.status === 'fulfilled'
        && previousRateResult.status === 'fulfilled'
      ) {
        const deltaValue = currentRateResult.value.rate - previousRateResult.value.rate;
        const deltaPercent = previousRateResult.value.rate === 0
          ? 0
          : (deltaValue / previousRateResult.value.rate) * 100;
        setRateChange({
          value: deltaValue,
          percent: deltaPercent,
        });
      } else {
        setRateChange(null);
      }

      if (historyResult.status === 'fulfilled') {
        setHistory(historyResult.value);
      } else {
        console.error('Failed to load deep analysis history:', historyResult.reason);
        setHistory(null);
      }

      if (recommendationResult.status === 'fulfilled') {
        setRecommendation(recommendationResult.value);
      } else {
        console.error('Failed to load deep analysis recommendation:', recommendationResult.reason);
        setRecommendation(null);
      }

      if (currentRateResult.status === 'rejected' && historyResult.status === 'rejected') {
        setAnalysisError('Live analysis data is unavailable for this pair right now.');
      }

      setAnalysisLoading(false);
    };

    void loadAnalysis();

    return () => {
      cancelled = true;
    };
  }, [analysisBase, analysisQuote, runSimulator]);

  const handleRunSimulator = async () => {
    const amount = Number.parseFloat(simAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }

    try {
      await runSimulator({
        base_currency: simBase.toUpperCase(),
        quote_currency: simQuote.toUpperCase(),
        amount,
        lookback_days: Math.max(7, Math.min(365, Number.parseInt(simLookback, 10) || 30)),
        rate_source: simSource,
      });
    } catch {
      // The hook exposes the error state for the UI.
    }
  };

  const handleCreateAlert = async () => {
    const target = Number.parseFloat(newAlertTarget);
    if (!Number.isFinite(target) || target <= 0) {
      return;
    }

    try {
      await createAlert({
        pair: `${analysisBase}_${analysisQuote}`,
        target_rate: target,
        direction: newAlertDirection,
        rate_source: 'any',
        channels: ['email', 'in_app'],
      });
      setNewAlertTarget('');
      setShowAlertForm(false);
    } catch {
      // The hook exposes the error state for the UI.
    }
  };

  const chartPoints = history?.data ?? [];
  const chartLabels = getChartLabels(chartPoints);
  const chartPath = buildLinePath(chartPoints, 720, 240);
  const chartAreaPath = buildAreaPath(chartPoints, 720, 240);
  const changeDisplay = rateChange
    ? `${rateChange.value >= 0 ? '+' : ''}${rateChange.value.toFixed(4)} (${formatPercent(rateChange.percent)})`
    : 'Flat versus the last stored checkpoint';
  const pairAlerts = alerts.filter((alert) => alert.pair.replace('/', '_').toUpperCase() === `${analysisBase}_${analysisQuote}`);
  const otherAlertCount = alerts.length - pairAlerts.length;
  const recommendationTone = recommendation ? getRiskLevelFromScore(recommendation.riskScore) : 'medium';
  const simulatedQuoteCurrency = simResult?.quote_currency ?? simQuote;
  const garchSnapshot = garchRisk[0];
  const waitInsight = simResult?.wait_insight;
  const simulatorQualityNoteParts = simResult?.quality_note ? splitQualityNote(simResult.quality_note) : [];
  const simulatorRealDays = simResult?.real_data_points ?? simResult?.data_points ?? 0;
  const simulatorSeededDays = simResult?.synthetic_data_points ?? 0;
  const simulatorComparisonDays = simResult?.comparison_data_points ?? simResult?.data_points ?? 0;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>FX Deep Analysis</span>
            <h1>{analysisBase}/{analysisQuote} execution room</h1>
            <p>
              A live decision surface for today&apos;s spot rate, the last 30 days of stored market structure,
              the simulator outcome, and the engine signals sitting behind the recommendation.
            </p>

            <div className={styles.analysisPairControls}>
              <label className={styles.field}>
                <span>Analysis from</span>
                <select value={analysisBase} onChange={(event) => setAnalysisBase(event.target.value)}>
                  <option>USD</option>
                  <option>EUR</option>
                  <option>GBP</option>
                  <option>NGN</option>
                </select>
              </label>

              <label className={styles.field}>
                <span>Analysis to</span>
                <select value={analysisQuote} onChange={(event) => setAnalysisQuote(event.target.value)}>
                  <option>EUR</option>
                  <option>USD</option>
                  <option>GBP</option>
                  <option>NGN</option>
                </select>
              </label>
            </div>

            <div className={styles.heroLinks}>
              <Link href="/fx-analytics" className={styles.primaryLink}>
                Back to analytics
              </Link>
              <Link href="/dashboard" className={styles.secondaryLink}>
                Open dashboard
              </Link>
            </div>
          </div>

          <div className={styles.heroCard}>
            <div className={styles.heroTopRow}>
              <span className={styles.heroLabel}>Spot rate</span>
              <span className={`${styles.statusPill} ${styles[recommendationTone]}`}>
                {recommendation ? getActionDisplayText(recommendation.action) : 'Loading'}
              </span>
            </div>

            <div className={styles.heroValue}>{analysisLoading ? '...' : formatRate(fxRate)}</div>
            <div className={styles.heroDelta}>{analysisLoading ? 'Loading live move...' : changeDisplay}</div>

            <div className={styles.heroStats}>
              <div>
                <span>Observed on</span>
                <strong>{formatObservedDate(observedOn)}</strong>
              </div>
              <div>
                <span>30d average</span>
                <strong>{formatRate(recommendation?.indicators.avg30Day ?? history?.statistics.average)}</strong>
              </div>
              <div>
                <span>Confidence</span>
                <strong>{recommendation ? getConfidenceDisplayText(recommendation.confidence) : '---'}</strong>
              </div>
              <div>
                <span>Range position</span>
                <strong>
                  {recommendation?.indicators.rangePositionPercent !== undefined
                    ? `${recommendation.indicators.rangePositionPercent.toFixed(0)}th pct`
                    : '---'}
                </strong>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.secondaryFrame}>
          <section className={styles.contextStrip}>
            <article className={`${styles.contextCard} ${styles.contextCardSpreadRisk}`}>
              <span className={styles.contextCardLabel}>Spread risk</span>
              <strong
                className={`${styles.contextCardValue} ${styles.contextCardValuePill} ${styles.contextCardSpreadRiskValue} ${getMacroToneClass(spread?.risk_level)}`}
              >
                {spread?.risk_level ?? 'Loading'}
              </strong>
              <p className={styles.contextCardMessage}>
                {spread?.risk_message ?? 'Nigeria spread context will appear once the engine refreshes.'}
              </p>
            </article>

            <article className={`${styles.contextCard} ${styles.contextCardBrent}`}>
              <span className={styles.contextCardLabel}>Brent signal</span>
              <strong
                className={`${styles.contextCardValue} ${styles.contextCardValuePill} ${styles.contextCardBrentValue} ${brentSignal?.signal === 'NEGATIVE' ? styles.risk : brentSignal?.signal === 'POSITIVE' ? styles.good : styles.neutral}`}
              >
                {brentSignal?.signal ?? 'NEUTRAL'}
              </strong>
              <p className={styles.contextCardMessage}>
                {brentSignal?.message ?? 'Oil context is waiting for the next engine check.'}
              </p>
            </article>

            <article className={`${styles.contextCard} ${styles.contextCardMomentum}`}>
              <span className={styles.contextCardLabel}>7d momentum</span>
              <strong
                className={`${styles.contextCardValue} ${styles.contextCardValuePill} ${styles.contextCardMomentumValue} ${recommendation?.indicators.change7dPercent && recommendation.indicators.change7dPercent >= 0 ? styles.good : styles.risk}`}
              >
                {recommendation ? formatPercent(recommendation.indicators.change7dPercent) : '---'}
              </strong>
              <p className={styles.contextCardMessage}>
                {recommendation ? `${recommendation.indicators.trend} trend across the stored recommendation window.` : 'Trend signal is loading.'}
              </p>
            </article>

            <article className={`${styles.contextCard} ${styles.contextCardVolatility}`}>
              <span className={styles.contextCardLabel}>Volatility</span>
              <strong className={`${styles.contextCardValue} ${styles.contextCardValuePill} ${styles.contextCardVolatilityValue}`}>
                {garchSnapshot ? `${garchSnapshot.garch_volatility_pct.toFixed(2)}%` : '---'}
              </strong>
              <p className={styles.contextCardMessage}>{garchSnapshot ? `${garchSnapshot.risk_level} risk · ${garchSnapshot.window_days}d window` : 'Execution window is loading from the risk engine.'}</p>
            </article>
          </section>
        </section>

        <div className={styles.layout}>
          <div className={styles.main}>
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.panelEyebrow}>30-Day Structure</span>
                  <h2>Stored candle map</h2>
                </div>
                <span className={styles.panelMeta}>
                  {history ? `${history.dataPoints} points in ${history.period}` : 'Loading price map'}
                </span>
              </div>

              {analysisError ? (
                <div className={styles.emptyState}>{analysisError}</div>
              ) : chartPoints.length === 0 ? (
                <div className={styles.emptyState}>Stored chart data is still loading for this pair.</div>
              ) : (
                <>
                  <div className={styles.chartCard}>
                    <svg viewBox="0 0 720 240" className={styles.chartSvg} preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="deepArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="rgba(37, 99, 235, 0.38)" />
                          <stop offset="100%" stopColor="rgba(37, 99, 235, 0.02)" />
                        </linearGradient>
                      </defs>
                      <path d={chartAreaPath} fill="url(#deepArea)" />
                      <path d={chartPath} className={styles.chartLine} />
                    </svg>
                  </div>

                  <div className={styles.chartAxis}>
                    {chartLabels.map((label) => (
                      <span key={label}>{label}</span>
                    ))}
                  </div>
                </>
              )}
            </section>

            <section className={styles.secondaryFrame}>
            <section className={styles.signalGrid}>
              <article className={styles.signalCard}>
                <span>Recommendation engine action</span>
                <strong>{recommendation ? getActionDisplayText(recommendation.action) : 'Loading'}</strong>
                <p>{recommendation?.explanation ?? 'Recommendation detail is loading from the analytics engine.'}</p>
              </article>

              <article className={styles.signalCard}>
                <span>Current regime</span>
                <strong>
                  {recommendation
                    ? recommendation.indicators.isOverbought
                      ? 'Overbought'
                      : recommendation.indicators.isOversold
                        ? 'Oversold'
                        : 'Balanced'
                    : 'Loading'}
                </strong>
                <p>
                  {recommendation
                    ? `RSI ${recommendation.indicators.rsi14.toFixed(1)} with price in the ${recommendation.indicators.rangePositionPercent.toFixed(0)}th percentile of the recent range.`
                    : 'Momentum diagnostics are loading.'}
                </p>
              </article>

              <article className={styles.signalCard}>
                <span>Thirty-day envelope</span>
                <strong>
                  {history
                    ? `${formatRate(history.statistics.min)} - ${formatRate(history.statistics.max)}`
                    : 'Loading'}
                </strong>
                <p>{history ? `Average ${formatRate(history.statistics.average)} across the stored 30-day lane.` : 'Range data is loading.'}</p>
              </article>

              <article className={styles.signalCard}>
                <span>Recommendation quality</span>
                <strong>{recommendation ? getConfidenceDisplayText(recommendation.confidence) : 'Loading'}</strong>
                <p>
                  {recommendation
                    ? `${recommendation.realDataPoints} real data points supporting a ${recommendation.status.replace('_', ' ')} signal from ${formatRecommendationDataSource(recommendation.indicators.dataSource)}.`
                    : 'Recommendation support metrics are loading.'}
                </p>
              </article>
            </section>
            </section>

            <div className={styles.engineBoundaryNote}>
              <strong>Recommendation engine vs simulator</strong>
              <p>
                The recommendation cards above use pattern and regime analysis from stored analytics history. The simulator below uses the selected rate basis to price an execution scenario. They can disagree because they answer different questions.
              </p>
            </div>

            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.panelEyebrow}>Execution Lab</span>
                  <h2>Conversion simulator</h2>
                </div>
                <button className={styles.primaryButton} onClick={handleRunSimulator} disabled={simLoading}>
                  {simLoading ? 'Running...' : 'Refresh scenario'}
                </button>
              </div>

              <div className={styles.simulatorGrid}>
                <div className={styles.simulatorForm}>
                  <label className={styles.field}>
                    <span>Amount</span>
                    <input
                      type="number"
                      min="1"
                      value={simAmount}
                      onChange={(event) => setSimAmount(event.target.value)}
                    />
                  </label>

                  <div className={styles.fieldRow}>
                    <label className={styles.field}>
                      <span>From</span>
                      <select value={simBase} onChange={(event) => setSimBase(event.target.value)}>
                        <option>USD</option>
                        <option>EUR</option>
                        <option>GBP</option>
                        <option>NGN</option>
                      </select>
                    </label>

                    <label className={styles.field}>
                      <span>To</span>
                      <select value={simQuote} onChange={(event) => setSimQuote(event.target.value)}>
                        <option>EUR</option>
                        <option>USD</option>
                        <option>GBP</option>
                        <option>NGN</option>
                      </select>
                    </label>
                  </div>

                  <label className={styles.field}>
                    <span>Lookback window</span>
                    <select value={simLookback} onChange={(event) => setSimLookback(event.target.value)}>
                      <option value="7">Last 7 days</option>
                      <option value="30">Last 30 days</option>
                      <option value="90">Last 90 days</option>
                    </select>
                  </label>

                  <label className={styles.field}>
                    <span>Rate basis</span>
                    <select value={simSource} onChange={(event) => setSimSource(event.target.value)}>
                      {simulatorRateOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <p className={styles.formHint}>
                    {snapshotRateBasisSupported
                      ? 'Run the simulator to compare today&apos;s execution against the best and worst stored conversion windows.'
                      : 'For non-USD/NGN pairs, genuine simulator history currently uses market FX closes only. Official, parallel, and BDC bases are limited to USD/NGN snapshot feeds.'}
                  </p>
                </div>

                <div className={styles.simulatorOutput}>
                  {simError && <div className={styles.errorState}>{simError}</div>}

                  {simResult && simResult.data_available ? (
                    <>
                      <div className={styles.metricGrid}>
                        <div className={styles.metricCard}>
                          <span>Current rate</span>
                          <strong>{formatRate(simResult.today_rate, 5)}</strong>
                        </div>
                        <div className={styles.metricCard}>
                          <span>Best day</span>
                          <strong>{formatHistoryDate(simResult.best_rate_date)}</strong>
                        </div>
                        <div className={styles.metricCard}>
                          <span>Worst day</span>
                          <strong>{formatHistoryDate(simResult.worst_rate_date)}</strong>
                        </div>
                        <div className={styles.metricCard}>
                          <span>Rate percentile</span>
                          <strong>{simResult.current_rate_percentile?.toFixed(0) ?? '---'}th</strong>
                        </div>
                      </div>

                      <div className={styles.metricStack}>
                        <div className={styles.metricRow}>
                          <span>Current scenario converts to</span>
                          <strong>
                            {simResult.today_converted?.toLocaleString('en-US', { maximumFractionDigits: 2 }) ?? '---'} {simulatedQuoteCurrency}
                          </strong>
                        </div>
                        <div className={styles.metricRow}>
                          <span>Best possible output</span>
                          <strong>
                            {simResult.best_converted?.toLocaleString('en-US', { maximumFractionDigits: 2 }) ?? '---'} {simulatedQuoteCurrency}
                          </strong>
                        </div>
                        <div className={styles.metricRow}>
                          <span>Opportunity cost vs best</span>
                          <strong className={`${styles.metricRowValue} ${styles.metricRowOpportunityValue} ${(simResult.opportunity_cost_vs_best ?? 0) > 0 ? styles.risk : styles.good}`}>
                            {simResult.opportunity_cost_vs_best?.toLocaleString('en-US', { maximumFractionDigits: 2 }) ?? '---'} {simulatedQuoteCurrency}
                          </strong>
                        </div>
                      </div>

                      {simResult.quality_note && (
                        <section className={styles.simulatorNotice}>
                          <div className={styles.simulatorNoticeHeader}>
                            <div>
                              <span className={styles.simulatorNoticeLabel}>Method note</span>
                              <strong className={styles.simulatorNoticeTitle}>Scenario provenance</strong>
                            </div>

                            <div className={styles.simulatorNoticeChips}>
                              <span className={styles.simulatorNoticeChip}>
                                {formatCountLabel(simulatorRealDays, 'real day')}
                              </span>
                              {simulatorSeededDays > 0 && (
                                <span className={`${styles.simulatorNoticeChip} ${styles.simulatorNoticeChipMuted}`}>
                                  Excluded {formatCountLabel(simulatorSeededDays, 'seeded day')}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className={styles.simulatorNoticeMetrics}>
                            <div className={styles.simulatorNoticeMetric}>
                              <span>Comparison days</span>
                              <strong>{formatCountLabel(simulatorComparisonDays, 'day')}</strong>
                            </div>
                            <div className={styles.simulatorNoticeMetric}>
                              <span>Current basis</span>
                              <strong>{formatSimulatorSource(simResult.current_rate_source)}</strong>
                            </div>
                            <div className={styles.simulatorNoticeMetric}>
                              <span>Observed on</span>
                              <strong>
                                {simResult.current_rate_as_of
                                  ? formatObservedDate(simResult.current_rate_as_of)
                                  : 'Live pending'}
                              </strong>
                            </div>
                          </div>

                          <div className={styles.simulatorNoticeBody}>
                            {simulatorQualityNoteParts.map((part, index) => (
                              <p
                                key={`${index}-${part}`}
                                className={
                                  index === 0
                                    ? styles.simulatorNoticeLead
                                    : styles.simulatorNoticeFootnote
                                }
                              >
                                {part}
                              </p>
                            ))}
                          </div>
                        </section>
                      )}

                      {waitInsight && (
                        <div className={styles.recommendationCard}>
                          <span className={styles.recommendationLabel}>Historical wait odds</span>
                          <p>{waitInsight.note}</p>

                          {waitInsight.available && (
                            <>
                              <div className={styles.metricGrid}>
                                {waitInsight.windows.map((window) => (
                                  <div key={window.horizon_days} className={styles.metricCard}>
                                    <span>Better within {window.horizon_days}d</span>
                                    <strong>{formatWaitProbability(window.better_rate_probability_pct)}</strong>
                                    <p>{window.eligible_samples} comparable day{window.eligible_samples === 1 ? '' : 's'}</p>
                                  </div>
                                ))}
                              </div>

                              <div className={styles.recommendationMeta}>
                                <span>Avg wait {formatWaitDays(waitInsight.avg_days_to_better)}</span>
                                <span>Median {formatWaitDays(waitInsight.median_days_to_better)}</span>
                                <span>{waitInsight.comparable_sample_size} similar past days</span>
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      <div className={styles.recommendationCard}>
                        <span className={styles.recommendationLabel}>Simulator timing view</span>
                        <strong className={styles.recommendationTitle}>{simResult.recommendation ?? 'Monitor'}</strong>
                        <p>{simResult.recommendation_reason ?? 'The simulator does not have a strong timing bias yet.'}</p>
                        <div className={styles.recommendationMeta}>
                          <span>
                            Source {formatSimulatorSource(simResult.current_rate_source)}
                            {simResult.current_rate_as_of ? ` - ${formatObservedDate(simResult.current_rate_as_of)}` : ''}
                          </span>
                          <span>
                            {simResult.real_data_points ?? simResult.data_points ?? 0} real
                            {simResult.synthetic_data_points ? ` / ${simResult.synthetic_data_points} seeded` : ''}
                          </span>
                        </div>
                        <div className={styles.recommendationMeta}>
                          <span>{simResult.comparison_data_points ?? simResult.data_points ?? '---'} comparison days</span>
                          <span>Spread {simResult.spread_risk ?? 'UNKNOWN'}</span>
                          <span>Brent {simResult.brent_signal ?? 'NEUTRAL'}</span>
                        </div>
                      </div>
                    </>
                  ) : simResult && !simResult.data_available ? (
                    <div className={styles.emptyState}>
                      {simResult.error ?? 'No historical simulator data is available for that pair yet.'}
                    </div>
                  ) : (
                    <div className={styles.emptyState}>
                      Live simulator output will appear here after the engine finishes the first scenario.
                    </div>
                  )}
                </div>
              </div>
            </section>
          </div>

          <aside className={styles.sidebar}>
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.panelEyebrow}>Live Alerts</span>
                  <h2>{analysisBase}/{analysisQuote} thresholds</h2>
                </div>
                <button className={styles.linkButton} onClick={() => setShowAlertForm((current) => !current)}>
                  {showAlertForm ? 'Close form' : 'Add alert'}
                </button>
              </div>

              {showAlertForm && (
                <div className={styles.alertForm}>
                  <div className={styles.fieldRow}>
                    <label className={styles.field}>
                      <span>Direction</span>
                      <select
                        value={newAlertDirection}
                        onChange={(event) => setNewAlertDirection(event.target.value as 'ABOVE' | 'BELOW')}
                      >
                        <option value="ABOVE">Above</option>
                        <option value="BELOW">Below</option>
                      </select>
                    </label>

                    <label className={styles.field}>
                      <span>Target rate</span>
                      <input
                        type="number"
                        min="0"
                        step="0.0001"
                        value={newAlertTarget}
                        onChange={(event) => setNewAlertTarget(event.target.value)}
                        placeholder="0.9250"
                      />
                    </label>
                  </div>

                  <button className={styles.primaryButton} onClick={handleCreateAlert} disabled={creating || !newAlertTarget}>
                    {creating ? 'Saving...' : 'Save alert'}
                  </button>
                </div>
              )}

              {successMessage && <div className={styles.successState}>{successMessage}</div>}
              {alertsError && <div className={styles.errorState}>{alertsError}</div>}

              <div className={styles.alertList}>
                {alertsLoading ? (
                  <div className={styles.emptyState}>Loading live alerts from the engine...</div>
                ) : pairAlerts.length === 0 ? (
                  <div className={styles.emptyState}>
                    No alert is set for {analysisBase}/{analysisQuote} yet.
                    {otherAlertCount > 0 ? ` ${otherAlertCount} alert${otherAlertCount === 1 ? '' : 's'} remain active on other pairs.` : ''}
                  </div>
                ) : (
                  pairAlerts.map((alert) => (
                    <article key={alert.id} className={styles.alertCard}>
                      <div className={styles.alertHeader}>
                        <strong>{formatAlertPair(alert.pair)} {alert.direction} {alert.target_rate.toLocaleString()}</strong>
                        <button
                          className={styles.linkButton}
                          onClick={() => {
                            void removeAlert(alert.id).catch(() => undefined);
                          }}
                        >
                          Delete
                        </button>
                      </div>

                      <p>
                        {alert.is_triggered
                          ? `Triggered at ${alert.triggered_rate?.toLocaleString() ?? 'unknown'} on ${formatAlertTimestamp(alert.triggered_at)}`
                          : `${alert.is_active ? 'Active' : 'Inactive'} via ${alert.rate_source}`}
                      </p>
                    </article>
                  ))
                )}
              </div>
            </section>

            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.panelEyebrow}>Recommendation</span>
                  <h2>Why the recommendation engine leans this way</h2>
                </div>
              </div>

              {recommendation ? (
                <div className={styles.noteStack}>
                  <div className={styles.noteCard}>
                    <strong>{getActionDisplayText(recommendation.action)}</strong>
                    <p>{recommendation.explanation}</p>
                  </div>

                  <div className={styles.noteCard}>
                    <strong>Signal factors</strong>
                    <ul className={styles.factorList}>
                      {(recommendation.factors ?? []).slice(0, 4).map((factor) => (
                        <li key={factor.name}>
                          <span className={`${styles.factorTone} ${styles[factor.impact]}`} />
                          <div>
                            <strong>{factor.name}</strong>
                            <p>{factor.description}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className={styles.emptyState}>Recommendation details are still loading for this pair.</div>
              )}
            </section>

            <section className={styles.secondaryFrame}>
            <section className={styles.panel}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.panelEyebrow}>Macro Overlay</span>
                  <h2>Nigeria engine context</h2>
                </div>
              </div>

              <div className={styles.noteStack}>
                <div className={styles.noteCard}>
                  <strong>NGN spread context</strong>
                  <p>{spread?.risk_message ?? 'Spread context is waiting for the next decision-engine update.'}</p>
                </div>

                <div className={styles.noteCard}>
                  <strong>Brent oil context</strong>
                  <p>{brentSignal?.message ?? 'Brent signal is not available yet.'}</p>
                </div>

                <div className={styles.noteCard}>
                  <strong>Seasonality + holidays</strong>
                  <p>
                    {seasonality
                      ? `${seasonality.composite_level.toUpperCase()} risk · ${seasonality.signals.length} active signals`
                      : 'Seasonality signals are loading.'}
                  </p>
                </div>

                <div className={styles.noteCard}>
                  <strong>News sentiment (CBN + Nairametrics)</strong>
                  <p>
                    {newsSignal
                      ? `Avg sentiment ${newsSignal.avg_sentiment.toFixed(2)} · ${newsSignal.headline_count} flagged headlines`
                      : 'News sentiment is loading.'}
                  </p>
                </div>

                <div className={styles.noteCard}>
                  <strong>CBN reserves signal</strong>
                  <p>
                    {reservesSignal
                      ? `${reservesSignal.signal} · ${reservesSignal.message}`
                      : 'Reserves signal is loading.'}
                  </p>
                </div>

                <div className={styles.noteCard}>
                  <strong>Intervention early warning</strong>
                  <p>
                    {interventionSignal
                      ? `${interventionSignal.risk_level} risk · ${interventionSignal.message}`
                      : 'Intervention risk is loading.'}
                  </p>
                </div>
              </div>
            </section>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
