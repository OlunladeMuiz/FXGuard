'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './page.module.css';
import { AUTH_USER_UPDATED_EVENT, getPreferredCurrency, getUser } from '@/lib/api/auth';
import { fetchRealFXCandles, fetchRealFXSnapshot } from '@/lib/api/fx';
import { fetchRecommendation } from '@/lib/api/recommendation';
import { formatApiError } from '@/lib/api/errors';
import { fetchAllInvoiceRecords } from '@/lib/invoices/editor';
import { CurrencyCode, CurrencyCodeSchema } from '@/types/currency';
import { FXHistoryPoint } from '@/lib/types/fx';
import { Recommendation, getActionDisplayText } from '@/lib/types/recommendation';

const alerts = [
  { title: 'USD/EUR Rate', subtitle: 'Target: 0.9180', color: 'yellow' },
  { title: 'Volatility Spike', subtitle: 'Threshold: >2%', color: 'blue' },
];

const CURRENCY_PAIRS = [
  { label: 'USD/NGN', base: 'USD', quote: 'NGN' },
  { label: 'EUR/NGN', base: 'EUR', quote: 'NGN' },
  { label: 'USD/EUR', base: 'USD', quote: 'EUR' },
  { label: 'USD/GBP', base: 'USD', quote: 'GBP' },
  { label: 'EUR/GBP', base: 'EUR', quote: 'GBP' },
  { label: 'EUR/USD', base: 'EUR', quote: 'USD' },
  { label: 'GBP/USD', base: 'GBP', quote: 'USD' },
] as const;

type CurrencyPair = { label: string; base: string; quote: string };

const DEFAULT_PAIR: CurrencyPair = { label: 'USD/EUR', base: 'USD', quote: 'EUR' };
const ANALYTICS_RECOMMENDATION_AMOUNT = 10000;
const OPEN_EXPOSURE_STATUSES = new Set(['draft', 'sent', 'overdue']);
const DONUT_RADIUS = 40;
const DONUT_CIRCUMFERENCE = 2 * Math.PI * DONUT_RADIUS;
const CURRENCY_DISTRIBUTION_COLORS: Record<CurrencyCode, string> = {
  USD: '#3b82f6',
  EUR: '#22c55e',
  GBP: '#a855f7',
  NGN: '#f59e0b',
  CAD: '#ef4444',
  AUD: '#14b8a6',
  JPY: '#8b5cf6',
  INR: '#ec4899',
};

interface CurrencyDistributionItem {
  currency: CurrencyCode;
  share: number;
  percent: number;
  amount: string;
  rawAmount: number;
  normalizedAmount: number;
  color: string;
}

interface CurrencyDistributionSummary {
  items: CurrencyDistributionItem[];
  reportingCurrency: CurrencyCode;
  totalNormalizedAmount: number;
  activeInvoiceCount: number;
  valuationDate: string | null;
}

const EMPTY_CURRENCY_DISTRIBUTION_SUMMARY: CurrencyDistributionSummary = {
  items: [],
  reportingCurrency: 'NGN',
  totalNormalizedAmount: 0,
  activeInvoiceCount: 0,
  valuationDate: null,
};

function parseCurrencyCode(value: string | null | undefined): CurrencyCode | null {
  const normalized = value?.trim().toUpperCase();
  if (!normalized) {
    return null;
  }

  const parsed = CurrencyCodeSchema.safeParse(normalized);
  return parsed.success ? parsed.data : null;
}

function formatCurrencyAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function formatObservedDate(value: string | null): string | null {
  if (!value) {
    return null;
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

async function buildCurrencyDistribution(
  reportingCurrency: CurrencyCode,
): Promise<CurrencyDistributionSummary> {
  const invoices = await fetchAllInvoiceRecords();
  const activeInvoices = invoices.filter((invoice) =>
    OPEN_EXPOSURE_STATUSES.has(invoice.status.toLowerCase()),
  );
  const totalsByCurrency = new Map<CurrencyCode, number>();
  const unsupportedCurrencies = new Set<string>();

  for (const invoice of activeInvoices) {
    if (!Number.isFinite(invoice.amount) || invoice.amount <= 0) {
      continue;
    }

    const currency = parseCurrencyCode(invoice.currency);
    if (!currency) {
      unsupportedCurrencies.add(invoice.currency.trim().toUpperCase() || invoice.currency);
      continue;
    }

    totalsByCurrency.set(currency, (totalsByCurrency.get(currency) ?? 0) + invoice.amount);
  }

  if (unsupportedCurrencies.size > 0) {
    throw new Error(
      `Currency distribution cannot be calculated for unsupported invoice currencies: ${Array.from(unsupportedCurrencies).sort().join(', ')}.`,
    );
  }

  if (totalsByCurrency.size === 0) {
    return {
      ...EMPTY_CURRENCY_DISTRIBUTION_SUMMARY,
      reportingCurrency,
      activeInvoiceCount: activeInvoices.length,
    };
  }

  const quoteCurrencies = Array.from(totalsByCurrency.keys()).filter(
    (currency) => currency !== reportingCurrency,
  );
  const snapshot = quoteCurrencies.length > 0
    ? await fetchRealFXSnapshot(reportingCurrency, quoteCurrencies)
    : { date: new Date().toISOString().slice(0, 10), rates: {} as Record<string, number> };

  const preliminaryItems = Array.from(totalsByCurrency.entries())
    .map(([currency, rawAmount]) => {
      const rate = currency === reportingCurrency ? 1 : snapshot.rates[currency];
      if (!rate || rate <= 0) {
        throw new Error(`Missing FX rate required to value ${currency} exposure in ${reportingCurrency}.`);
      }

      const normalizedAmount = currency === reportingCurrency ? rawAmount : rawAmount / rate;

      return {
        currency,
        rawAmount,
        normalizedAmount,
        color: CURRENCY_DISTRIBUTION_COLORS[currency],
      };
    })
    .sort((left, right) => right.normalizedAmount - left.normalizedAmount);

  const totalNormalizedAmount = preliminaryItems.reduce(
    (sum, item) => sum + item.normalizedAmount,
    0,
  );

  const items: CurrencyDistributionItem[] = preliminaryItems.map((item) => {
    const share = totalNormalizedAmount > 0 ? item.normalizedAmount / totalNormalizedAmount : 0;
    return {
      currency: item.currency,
      share,
      percent: Number((share * 100).toFixed(1)),
      amount: formatCurrencyAmount(item.rawAmount, item.currency),
      rawAmount: Number(item.rawAmount.toFixed(2)),
      normalizedAmount: Number(item.normalizedAmount.toFixed(2)),
      color: item.color,
    };
  });

  return {
    items,
    reportingCurrency,
    totalNormalizedAmount: Number(totalNormalizedAmount.toFixed(2)),
    activeInvoiceCount: activeInvoices.length,
    valuationDate: snapshot.date ?? null,
  };
}

function getRecommendationStateLabel(recommendation: Recommendation): string {
  if (recommendation.status === 'provisional_data') {
    return `${getActionDisplayText(recommendation.action)} (Intraday Signal)`;
  }
  if (recommendation.status === 'insufficient_data') {
    return 'Collecting Local History';
  }
  if (recommendation.status === 'limited_data') {
    return `${getActionDisplayText(recommendation.action)} (Early Signal)`;
  }
  return getActionDisplayText(recommendation.action);
}

function getHistoryQualityLabel(recommendation: Recommendation): string {
  switch (recommendation.historyQuality) {
    case 'full':
      return 'Full stored history';
    case 'mixed':
      return 'Mixed real and seeded history';
    case 'seeded':
      return 'Seeded history';
    case 'same_currency':
      return 'No conversion required';
    case 'candle_fallback':
      return 'Intraday candle fallback';
    default:
      return 'Stored history';
  }
}

function getHistorySupportText(recommendation: Recommendation): string {
  if (recommendation.historyQuality === 'candle_fallback') {
    return `Using stored intraday candles as a provisional fallback because only ${recommendation.dataPoints} stored daily close${recommendation.dataPoints === 1 ? ' is' : 's are'} available locally.`;
  }

  return `${getHistoryQualityLabel(recommendation)} · ${recommendation.realDataPoints} real points${recommendation.containsSynthetic ? ` · ${recommendation.syntheticDataPoints} seeded points` : ''}`;
}

const TIME_PERIODS = [
  { label: '1D', value: '1d' as const },
  { label: '7D', value: '7d' as const },
  { label: '1M', value: '30d' as const },
  { label: '3M', value: '90d' as const },
  { label: '1Y', value: '1y' as const },
];

interface ChartData {
  points: FXHistoryPoint[];
  currentRate: number;
  changePercent: number;
  min: number;
  max: number;
  trend: {
    label: string;
    description: string;
    tone: 'positive' | 'negative' | 'neutral';
    stroke: string;
    fillStart: string;
    fillMid: string;
    fillEnd: string;
  };
  periodLabel: string;
}

function deriveTrend(points: FXHistoryPoint[]): ChartData['trend'] {
  if (points.length < 2) {
    return {
      label: 'Single Close',
      description: 'Only one stored close is available for this time window.',
      tone: 'neutral',
      stroke: '#2563eb',
      fillStart: 'rgba(37, 99, 235, 0.24)',
      fillMid: 'rgba(37, 99, 235, 0.10)',
      fillEnd: 'rgba(37, 99, 235, 0.02)',
    };
  }

  const firstRate = points[0]?.rate ?? 0;
  const lastRate = points[points.length - 1]?.rate ?? firstRate;
  const changePercent = firstRate > 0 ? ((lastRate - firstRate) / firstRate) * 100 : 0;
  const dailyMoves = points
    .slice(1)
    .map((point, index) => {
      const previous = points[index]?.rate ?? point.rate;
      if (previous === 0) {
        return 0;
      }
      return Math.abs((point.rate - previous) / previous) * 100;
    });
  const averageDailyMove = dailyMoves.length > 0
    ? dailyMoves.reduce((sum, move) => sum + move, 0) / dailyMoves.length
    : 0;

  if (Math.abs(changePercent) < 0.25 && averageDailyMove < 0.2) {
    return {
      label: 'Consolidation',
      description: 'The pair is moving sideways inside a tight recent range.',
      tone: 'neutral',
      stroke: '#d97706',
      fillStart: 'rgba(217, 119, 6, 0.24)',
      fillMid: 'rgba(245, 158, 11, 0.10)',
      fillEnd: 'rgba(245, 158, 11, 0.02)',
    };
  }

  if (changePercent > 0) {
    return {
      label: 'Uptrend',
      description: 'Successive closes are moving higher across the selected window.',
      tone: 'positive',
      stroke: '#16a34a',
      fillStart: 'rgba(34, 197, 94, 0.24)',
      fillMid: 'rgba(74, 222, 128, 0.10)',
      fillEnd: 'rgba(134, 239, 172, 0.02)',
    };
  }

  return {
    label: 'Downtrend',
    description: 'Successive closes are moving lower across the selected window.',
    tone: 'negative',
    stroke: '#dc2626',
    fillStart: 'rgba(239, 68, 68, 0.24)',
    fillMid: 'rgba(248, 113, 113, 0.10)',
    fillEnd: 'rgba(254, 202, 202, 0.02)',
  };
}

export default function FxAnalyticsHub() {
  const [selectedPair, setSelectedPair] = useState<CurrencyPair>(DEFAULT_PAIR);
  const [selectedPeriod, setSelectedPeriod] = useState<'1d' | '7d' | '30d' | '90d' | '1y'>('7d');
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [recommendationError, setRecommendationError] = useState<string | null>(null);
  const [volatilityData, setVolatilityData] = useState<{ day: string; value: number }[]>([]);
  const [volatilityStats, setVolatilityStats] = useState<{
    average: number;
    max: number;
    min: number;
    level: 'Low' | 'Medium' | 'High';
  }>({ average: 0, max: 0, min: 0, level: 'Low' });
  const [reportingCurrency, setReportingCurrency] = useState<CurrencyCode>('NGN');
  const [distributionSummary, setDistributionSummary] = useState<CurrencyDistributionSummary>(
    EMPTY_CURRENCY_DISTRIBUTION_SUMMARY,
  );
  const [distributionLoading, setDistributionLoading] = useState(true);
  const [distributionError, setDistributionError] = useState<string | null>(null);
  const [viewportWidth, setViewportWidth] = useState<number | null>(null);

  useEffect(() => {
    const syncViewportWidth = () => {
      setViewportWidth(window.innerWidth);
    };

    syncViewportWidth();
    window.addEventListener('resize', syncViewportWidth);

    return () => {
      window.removeEventListener('resize', syncViewportWidth);
    };
  }, []);

  useEffect(() => {
    const syncReportingCurrency = () => {
      const nextCurrency = parseCurrencyCode(getPreferredCurrency(getUser())) ?? 'NGN';
      setReportingCurrency((currentCurrency) => (
        currentCurrency === nextCurrency ? currentCurrency : nextCurrency
      ));
    };

    syncReportingCurrency();
    window.addEventListener(AUTH_USER_UPDATED_EVENT, syncReportingCurrency);
    window.addEventListener('storage', syncReportingCurrency);

    return () => {
      window.removeEventListener(AUTH_USER_UPDATED_EVENT, syncReportingCurrency);
      window.removeEventListener('storage', syncReportingCurrency);
    };
  }, []);

  const fetchData = useCallback(async () => {
    if (!selectedPair) return;
    
    setLoading(true);
    setError(null);
    setRecommendationLoading(true);
    setRecommendationError(null);
    setRecommendation(null);
    
    try {
      const historyData = await fetchRealFXCandles(
        selectedPair.base,
        selectedPair.quote,
        selectedPeriod,
      );

      const points = historyData.data;
      const firstRate = points[0]?.rate || 0;
      const lastRate = points[points.length - 1]?.close ?? points[points.length - 1]?.rate ?? firstRate;
      const changePercent = firstRate > 0 ? ((lastRate - firstRate) / firstRate) * 100 : 0;
      const trend = deriveTrend(points);
      const minRate = points.length > 0
        ? Math.min(...points.map((point) => point.low ?? point.rate))
        : historyData.statistics.min;
      const maxRate = points.length > 0
        ? Math.max(...points.map((point) => point.high ?? point.rate))
        : historyData.statistics.max;

      // Calculate real volatility for last 7 days from actual price movements
      const last7Days = points.slice(-7);
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
      
      const volData = last7Days.map((point, idx) => {
        const dayIndex = new Date(point.date).getDay();
        // Calculate daily volatility from high-low range or daily change
        let volatility = 0;
        if (point.high && point.low && point.rate > 0) {
          // High-Low volatility (intraday range as % of rate)
          volatility = ((point.high - point.low) / point.rate) * 100;
        } else if (idx > 0) {
          // Calculate from daily price change
          const prevPoint = last7Days[idx - 1];
          if (prevPoint?.rate) {
            volatility = Math.abs((point.rate - prevPoint.rate) / prevPoint.rate) * 100;
          }
        }
        return {
          day: dayNames[dayIndex] || 'Mon',
          value: Math.round(volatility * 100) / 100,
        };
      });
      setVolatilityData(volData);

      // Calculate volatility statistics
      const volValues = volData.map(v => v.value).filter(v => v > 0);
      if (volValues.length > 0) {
        const avgVol = volValues.reduce((a, b) => a + b, 0) / volValues.length;
        const maxVol = Math.max(...volValues);
        const minVol = Math.min(...volValues);
        
        // Determine volatility level
        let level: 'Low' | 'Medium' | 'High' = 'Low';
        if (avgVol > 1.0) level = 'High';
        else if (avgVol > 0.3) level = 'Medium';
        
        setVolatilityStats({
          average: Math.round(avgVol * 100) / 100,
          max: Math.round(maxVol * 100) / 100,
          min: Math.round(minVol * 100) / 100,
          level,
        });
      }

      setChartData({
        points,
        currentRate: lastRate,
        changePercent: Math.round(changePercent * 100) / 100,
        min: minRate,
        max: maxRate,
        trend,
        periodLabel: selectedPeriod.toUpperCase(),
      });

      try {
        const nextRecommendation = await fetchRecommendation(
          selectedPair.base,
          selectedPair.quote,
          ANALYTICS_RECOMMENDATION_AMOUNT,
        );
        setRecommendation(nextRecommendation);
      } catch (recommendationFetchError) {
        console.error('Recommendation fetch failed:', recommendationFetchError);
        setRecommendation(null);
        setRecommendationError(
          formatApiError(recommendationFetchError, 'Live recommendation is unavailable right now.'),
        );
      }
    } catch (err) {
      console.error('Error fetching FX data:', err);
      setError(formatApiError(err, 'Failed to fetch market data. Please try again.'));
      setRecommendation(null);
    } finally {
      setLoading(false);
      setRecommendationLoading(false);
    }
  }, [selectedPair, selectedPeriod]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    let cancelled = false;

    const loadCurrencyDistribution = async () => {
      setDistributionLoading(true);
      setDistributionError(null);

      try {
        const nextSummary = await buildCurrencyDistribution(reportingCurrency);
        if (!cancelled) {
          setDistributionSummary(nextSummary);
        }
      } catch (err) {
        console.error('Error fetching currency distribution:', err);
        if (!cancelled) {
          setDistributionSummary({
            ...EMPTY_CURRENCY_DISTRIBUTION_SUMMARY,
            reportingCurrency,
          });
          setDistributionError(
            formatApiError(err, 'Failed to load currency distribution.'),
          );
        }
      } finally {
        if (!cancelled) {
          setDistributionLoading(false);
        }
      }
    };

    void loadCurrencyDistribution();

    return () => {
      cancelled = true;
    };
  }, [reportingCurrency]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderChart = () => {
    if (!chartData || chartData.points.length === 0) return null;

    const { points, min, max } = chartData;
    const isSinglePoint = points.length === 1;
    const isPhoneViewport = viewportWidth !== null && viewportWidth < 640;
    const isTabletViewport = viewportWidth !== null && viewportWidth < 900;
    
    // Add padding to the range for better visualization
    const range = max - min;
    const padding = range > 0 ? range * 0.15 : 0.01;
    const yMin = min - padding;
    const yMax = max + padding;
    const yRange = yMax - yMin;

    // SVG dimensions (viewBox units)
    const width = 100;
    const height = 100;
    
    // Helper functions to map data to SVG coordinates
    const getX = (index: number) => (index / Math.max(points.length - 1, 1)) * width;
    const getY = (rate: number) => {
      if (yRange === 0) return height / 2;
      return height - ((rate - yMin) / yRange) * height;
    };

    const firstPoint = points[0];
    if (!firstPoint) return null;
    
    const singlePointY = getY(firstPoint.rate);

    // Build the line path
    const pathD = isSinglePoint
      ? `M 0 ${singlePointY} L ${width} ${singlePointY}`
      : points.reduce((path, point, index) => {
          if (index === 0) {
            return `M 0 ${getY(point.rate)}`;
          }
          return `${path} L ${getX(index)} ${getY(point.rate)}`;
        }, '');

    // Build the area path (close to bottom of chart)
    const lastX = isSinglePoint ? width : getX(points.length - 1);
    const areaPath = pathD + ` L ${lastX} ${height} L 0 ${height} Z`;

    // Generate Y-axis labels (5 labels for cleaner display)
    const yLabels: string[] = [];
    const labelCount = isPhoneViewport ? 4 : 5;
    for (let i = 0; i <= labelCount; i++) {
      const value = yMax - (i / labelCount) * yRange;
      yLabels.push(value.toFixed(4));
    }

    // Generate X-axis labels (max 7 labels)
    const maxLabels = isPhoneViewport ? 4 : isTabletViewport ? 5 : 7;
    const xLabelInterval = Math.max(1, Math.ceil(points.length / maxLabels));
    const xLabels = points.filter((_, i) => i % xLabelInterval === 0 || i === points.length - 1);

    return (
      <div className={styles.chartArea}>
        <div className={styles.chartYAxis}>
          {yLabels.map((label, i) => (
            <span key={i}>{label}</span>
          ))}
        </div>
        <div className={styles.chartContent}>
          <svg 
            viewBox={`0 0 ${width} ${height}`} 
            preserveAspectRatio="none"
            className={styles.svgChart}
          >
            <defs>
              <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={chartData.trend.fillStart} />
                <stop offset="50%" stopColor={chartData.trend.fillMid} />
                <stop offset="100%" stopColor={chartData.trend.fillEnd} />
              </linearGradient>
            </defs>
            {/* Grid lines */}
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <line
                key={i}
                x1="0"
                y1={(i / 5) * height}
                x2={width}
                y2={(i / 5) * height}
                stroke="rgba(0,0,0,0.05)"
                strokeWidth="0.2"
              />
            ))}
            {/* Area fill */}
            <path d={areaPath} fill="url(#areaGradient)" />
            {/* Line */}
            <path 
              d={pathD} 
              fill="none" 
              stroke={chartData.trend.stroke}
              strokeWidth={isSinglePoint ? '1.2' : '0.8'}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Data points */}
            {points.length <= 30 && points.map((point, index) => (
              <circle
                key={index}
                cx={isSinglePoint ? width / 2 : getX(index)}
                cy={getY(point.rate)}
                r={isSinglePoint ? '1.3' : '0.8'}
                fill={chartData.trend.stroke}
              />
            ))}
          </svg>
          <div className={`${styles.chartXAxis} ${isSinglePoint ? styles.chartXAxisSingle : ''}`}>
            {xLabels.map((point, i) => (
              <span key={i}>{formatDate(point.date)}</span>
            ))}
          </div>
          {isSinglePoint && (
            <p className={styles.chartHint}>
              1D currently shows the latest stored daily close. Switch to 7D or longer to see a trend line.
            </p>
          )}
        </div>
      </div>
    );
  };

  let currencyArcOffset = 0;
  const currencyDistributionArcs = distributionSummary.items.map((item) => {
    const dashLength = item.share * DONUT_CIRCUMFERENCE;
    const circle = (
      <circle
        key={item.currency}
        cx="50"
        cy="50"
        r={DONUT_RADIUS}
        fill="none"
        stroke={item.color}
        strokeWidth="20"
        strokeDasharray={`${dashLength} ${Math.max(DONUT_CIRCUMFERENCE - dashLength, 0)}`}
        strokeDashoffset={-currencyArcOffset}
        transform="rotate(-90 50 50)"
      />
    );
    currencyArcOffset += dashLength;
    return circle;
  });
  const distributionAsOfLabel = formatObservedDate(distributionSummary.valuationDate);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>FX Analytics Hub</h1>
          <p>Monitor currency movements, analyze volatility, and optimize your FX strategy</p>
        </header>

        <div className={styles.layout}>
          {/* Left Column - Charts */}
          <div className={styles.main}>
            {/* Historical Analysis Section */}
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <h3>Historical Analysis</h3>
                <div className={styles.filterRow}>
                  <select 
                    className={styles.select}
                    value={selectedPair ? `${selectedPair.base}/${selectedPair.quote}` : ''}
                    onChange={(e) => {
                      const pair = CURRENCY_PAIRS.find(p => `${p.base}/${p.quote}` === e.target.value);
                      if (pair) setSelectedPair(pair);
                    }}
                  >
                    {CURRENCY_PAIRS.map((pair) => (
                      <option key={pair.label} value={`${pair.base}/${pair.quote}`}>
                        {pair.label}
                      </option>
                    ))}
                  </select>
                  <div className={styles.segment}>
                    {TIME_PERIODS.map((period) => (
                      <button
                        key={period.value}
                        className={`${styles.segmentBtn} ${selectedPeriod === period.value ? styles.active : ''}`}
                        onClick={() => setSelectedPeriod(period.value)}
                      >
                        {period.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className={styles.chartCard}>
                <div className={styles.chartHeader}>
                  <div className={styles.chartTitle}>
                    <span className={styles.chartLabel}>{selectedPair?.label || 'USD/EUR'} Price Chart</span>
                    {loading ? (
                      <span className={styles.chartValue}>Loading...</span>
                    ) : chartData ? (
                      <>
                        <span className={styles.chartValue}>{chartData.currentRate.toFixed(4)}</span>
                        <span className={`${styles.badge} ${chartData.changePercent >= 0 ? styles.badgeGreen : styles.badgeRed}`}>
                          {chartData.changePercent >= 0 ? '+' : ''}{chartData.changePercent.toFixed(2)}%
                        </span>
                        <span
                          className={`${styles.badge} ${
                            chartData.trend.tone === 'positive'
                              ? styles.badgeGreen
                              : chartData.trend.tone === 'negative'
                                ? styles.badgeRed
                                : styles.badgeAmber
                          }`}
                        >
                          {chartData.trend.label}
                        </span>
                      </>
                    ) : null}
                  </div>
                  <div className={styles.chartActions}>
                    <button className={styles.chartBtn}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="9" y1="3" x2="9" y2="21"></line>
                      </svg>
                      Overlays
                    </button>
                    <button className={styles.chartBtn}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                      </svg>
                      Export
                    </button>
                  </div>
                </div>
                {!loading && chartData && (
                  <div className={styles.chartTrendSummary}>
                    <strong>{chartData.trend.label}</strong>
                    <span>{chartData.trend.description}</span>
                    <span>Based on {chartData.points.length} real stored close{chartData.points.length === 1 ? '' : 's'} in the {chartData.periodLabel} window.</span>
                  </div>
                )}
                {error ? (
                  <div className={styles.errorMessage}>{error}</div>
                ) : loading ? (
                  <div className={styles.loadingChart}>
                    <div className={styles.spinner}></div>
                    <p>Fetching real market data...</p>
                  </div>
                ) : (
                  renderChart()
                )}
              </div>
            </section>

            {/* Volatility Analysis */}
            <section className={styles.card}>
              <h3>Volatility Analysis</h3>
              <div className={styles.volatilityLayout}>
                <div className={styles.volatilityChart}>
                  <div className={styles.volatilityTitle}>7-Day Volatility ({selectedPair?.label})</div>
                  <div className={styles.barChartContainer}>
                    <div className={styles.barChartYAxis}>
                      {(() => {
                        const maxVal = Math.max(...volatilityData.map(v => v.value), 0.5);
                        const yMax = Math.ceil(maxVal * 10) / 10 + 0.2;
                        return Array.from({ length: 6 }, (_, i) => {
                          const val = yMax - (i * yMax / 5);
                          return <span key={i}>{val.toFixed(1)}</span>;
                        });
                      })()}
                    </div>
                    <div className={styles.barChartArea}>
                      <div className={styles.barChart}>
                        {volatilityData.length > 0 ? volatilityData.map((item, index) => {
                          const maxVal = Math.max(...volatilityData.map(v => v.value), 0.5);
                          const yMax = Math.ceil(maxVal * 10) / 10 + 0.2;
                          return (
                            <div key={index} className={styles.barWrapper}>
                              <div 
                                className={styles.bar} 
                                style={{ height: `${(item.value / yMax) * 100}%` }}
                                title={`${item.value}%`}
                              ></div>
                              <span className={styles.barLabel}>{item.day}</span>
                            </div>
                          );
                        }) : (
                          <div style={{ color: 'var(--text-secondary)', padding: '2rem' }}>
                            Loading volatility data...
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className={styles.volatilitySummary}>
                  <div className={styles.volatilityMeterContainer}>
                    <div 
                      className={styles.volatilityMeter}
                      style={{
                        background: volatilityStats.level === 'High' 
                          ? 'linear-gradient(90deg, #22c55e 0%, #eab308 50%, #ef4444 100%)'
                          : volatilityStats.level === 'Medium'
                          ? 'linear-gradient(90deg, #22c55e 0%, #eab308 50%, #f97316 100%)'
                          : 'linear-gradient(90deg, #22c55e 0%, #86efac 50%, #d1fae5 100%)'
                      }}
                    ></div>
                    <div 
                      className={styles.volatilityIndicator}
                      style={{
                        left: volatilityStats.level === 'High' ? '85%' 
                          : volatilityStats.level === 'Medium' ? '50%' : '20%'
                      }}
                    ></div>
                  </div>
                  <div className={styles.volatilityInfo}>
                    <span className={
                      volatilityStats.level === 'High' ? styles.highBadge 
                      : volatilityStats.level === 'Medium' ? styles.mediumBadge 
                      : styles.lowBadge
                    }>
                      {volatilityStats.level}
                    </span>
                    <span className={styles.movementLabel}>volatility</span>
                  </div>
                  <div className={styles.volatilityValues}>
                    <div className={styles.volStatRow}>
                      <span>Average:</span>
                      <strong>{volatilityStats.average.toFixed(2)}%</strong>
                    </div>
                    <div className={styles.volStatRow}>
                      <span>Maximum:</span>
                      <strong>{volatilityStats.max.toFixed(2)}%</strong>
                    </div>
                    <div className={styles.volStatRow}>
                      <span>Minimum:</span>
                      <strong>{volatilityStats.min.toFixed(2)}%</strong>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Currency Distribution */}
            <section className={styles.card}>
              <h3>Currency Distribution</h3>
              {distributionError ? (
                <div className={styles.distributionMessage}>{distributionError}</div>
              ) : distributionLoading ? (
                <div className={styles.distributionMessage}>Loading invoice exposure...</div>
              ) : distributionSummary.items.length === 0 ? (
                <div className={styles.distributionMessage}>
                  No open invoice exposure yet. Draft, sent, and overdue invoices will appear here once they use a supported currency.
                </div>
              ) : (
                <div className={styles.currencyLayout}>
                  <div className={styles.donutContainer}>
                    <svg className={styles.donutSvg} viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r={DONUT_RADIUS} fill="none" stroke="#e5e7eb" strokeWidth="20" />
                      {currencyDistributionArcs}
                      <circle cx="50" cy="50" r="25" fill="white" />
                    </svg>
                    <div className={styles.donutCenter}>
                      <span className={styles.donutCenterLabel}>{distributionSummary.reportingCurrency} Exposure</span>
                      <strong className={styles.donutCenterValue}>
                        {formatCurrencyAmount(
                          distributionSummary.totalNormalizedAmount,
                          distributionSummary.reportingCurrency,
                        )}
                      </strong>
                      <span className={styles.donutCenterMeta}>
                        {distributionSummary.activeInvoiceCount} open invoice
                        {distributionSummary.activeInvoiceCount === 1 ? '' : 's'}
                        {distributionAsOfLabel ? ` · As of ${distributionAsOfLabel}` : ''}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* P&L and Hedging Impact */}
            <section className={styles.pnlSection}>
              <div className={styles.pnlCard}>
                <div className={styles.pnlRow}>
                  <span>+5% USD Strength</span>
                  <strong className={styles.textGreen}>+$2,260</strong>
                </div>
                <div className={styles.pnlRow}>
                  <span>Current Rate</span>
                  <strong>$0</strong>
                </div>
                <div className={styles.pnlRow}>
                  <span>-5% USD Weakness</span>
                  <strong className={styles.textRed}>-$2,260</strong>
                </div>
              </div>
              <div className={styles.hedgingCard}>
                <h4>Hedging Impact</h4>
                <div className={styles.hedgingRows}>
                  <div className={styles.hedgingRow}>
                    <span>Unhedged P&amp;L Range</span>
                    <strong className={styles.textOrange}>±$2,260</strong>
                  </div>
                  <div className={styles.hedgingRow}>
                    <span>50% Hedged P&amp;L Range</span>
                    <strong className={styles.textOrange}>±$1,130</strong>
                  </div>
                  <div className={styles.hedgingRow}>
                    <span>Fully Hedged P&amp;L</span>
                    <strong className={styles.textGreen}>$0</strong>
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* Middle Column - Currency Amounts & Scenarios */}
          <div className={styles.middleColumn}>
            <div className={styles.currencyAmounts}>
              {distributionLoading ? (
                <div className={styles.currencyAmountCard}>
                  <span className={styles.amountValue}>Loading...</span>
                  <span className={styles.amountPercent}>Fetching invoice exposure</span>
                </div>
              ) : distributionError ? (
                <div className={styles.currencyAmountCard}>
                  <span className={styles.amountValue}>Unavailable</span>
                  <span className={styles.amountPercent}>Currency distribution could not be valued accurately.</span>
                </div>
              ) : distributionSummary.items.length === 0 ? (
                <div className={styles.currencyAmountCard}>
                  <span className={styles.amountValue}>No exposure</span>
                  <span className={styles.amountPercent}>Open invoices will populate this panel automatically.</span>
                </div>
              ) : (
                distributionSummary.items.map((item) => (
                  <div key={item.currency} className={styles.currencyAmountCard}>
                    <span className={styles.amountCode} style={{ color: item.color }}>{item.currency}</span>
                    <span className={styles.amountValue}>{item.amount}</span>
                    <span className={styles.amountPercent}>{item.percent.toFixed(1)}% of open exposure</span>
                  </div>
                ))
              )}
            </div>
            <div className={styles.scenarioButtons}>
              <button className={styles.scenarioBtn}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                Run Custom Scenario
              </button>
              <button className={styles.scenarioBtn}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
                Simulate Hedging Strategy
              </button>
              <button className={`${styles.scenarioBtn} ${styles.scenarioBtnHighlight}`}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="20" x2="18" y2="10"></line>
                  <line x1="12" y1="20" x2="12" y2="4"></line>
                  <line x1="6" y1="20" x2="6" y2="14"></line>
                </svg>
                Stress Test Portfolio
              </button>
            </div>
          </div>

          {/* Right Sidebar */}
          <aside className={styles.sidebar}>
            {/* AI Insights */}
            <div className={styles.card}>
              <div className={styles.sidebarHeader}>
                <div className={styles.aiIcon}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 16v-4M12 8h.01" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <h3>AI Insights</h3>
              </div>
              {recommendationLoading ? (
                <div style={{ padding: 'var(--spacing-4)', color: 'var(--text-secondary)' }}>
                  Analysing live market data...
                </div>
              ) : recommendation ? (
                <div className={styles.insightList}>
                  <div className={`${styles.insight} ${styles.insightBlue}`}>
                    <div className={styles.insightHeader}>
                      <span className={styles.insightTitle}>
                        {getRecommendationStateLabel(recommendation)}
                      </span>
                      <div className={styles.percentBadge}>
                        <span>{Math.round(recommendation.confidence * 100)}%</span>
                        <div className={styles.progressSmall}>
                          <div style={{ width: `${recommendation.confidence * 100}%` }}></div>
                        </div>
                      </div>
                    </div>
                    <p className={styles.insightText}>{recommendation.explanation}</p>
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                      Optimal window: {recommendation.optimalWindow}
                    </p>
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                      {getHistorySupportText(recommendation)}
                    </p>
                    <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
                      Based on a {recommendation.base} {ANALYTICS_RECOMMENDATION_AMOUNT.toLocaleString('en-US')} invoice.
                    </p>
                  </div>

                  {recommendation.factors?.map((factor) => (
                    <div
                      key={factor.name}
                      className={`${styles.insight} ${
                        factor.impact === 'positive'
                          ? styles.insightGreen
                          : factor.impact === 'negative'
                            ? styles.insightOrange
                            : styles.insightBlue
                      }`}
                    >
                      <div className={styles.insightHeader}>
                        <span className={styles.insightTitle}>{factor.name}</span>
                      </div>
                      <p className={styles.insightText}>{factor.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: 'var(--spacing-4)', color: 'var(--text-secondary)' }}>
                  {recommendationError ?? 'No recommendation available.'}
                </div>
              )}
            </div>

            {/* Active Alerts */}
            <div className={styles.card}>
              <h3>Active Alerts</h3>
              <div className={styles.alertList}>
                {alerts.map((alert) => (
                  <div key={alert.title} className={`${styles.alertItem} ${styles[alert.color]}`}>
                    <div className={styles.alertIcon}>
                      {alert.color === 'yellow' ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="#eab308">
                          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                        </svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                          <polyline points="17 6 23 6 23 12"></polyline>
                        </svg>
                      )}
                    </div>
                    <div className={styles.alertContent}>
                      <strong>{alert.title}</strong>
                      <span>{alert.subtitle}</span>
                    </div>
                    <button className={styles.alertClose}>×</button>
                  </div>
                ))}
                <button className={styles.addAlert}>+ Add New Alert</button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className={styles.card}>
              <h3>Quick Actions</h3>
              <div className={styles.quickActions}>
                <button className={styles.primaryAction}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="17 1 21 5 17 9"></polyline>
                    <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                    <polyline points="7 23 3 19 7 15"></polyline>
                    <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
                  </svg>
                  Execute Conversion
                </button>
                <button className={styles.secondaryAction}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                  </svg>
                  Setup Hedge
                </button>
                <button className={styles.secondaryAction}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  Export Report
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
