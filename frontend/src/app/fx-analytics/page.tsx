'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import styles from './page.module.css';
import { fetchRealFXHistory, fetchRealFXRate } from '@/lib/api/fx';
import { FXHistoryPoint } from '@/lib/types/fx';

// Currency distribution (portfolio data - would come from user's actual portfolio in production)
const currencyDistribution = [
  { currency: 'USD', percent: 65.2, amount: '$45,230', color: '#3b82f6' },
  { currency: 'EUR', percent: 28.7, amount: '€18,450', color: '#22c55e' },
  { currency: 'GBP', percent: 6.1, amount: '£3,200', color: '#a855f7' },
];

const CURRENCY_PAIRS = [
  { label: 'USD/EUR', base: 'USD', quote: 'EUR' },
  { label: 'USD/GBP', base: 'USD', quote: 'GBP' },
  { label: 'EUR/GBP', base: 'EUR', quote: 'GBP' },
  { label: 'EUR/USD', base: 'EUR', quote: 'USD' },
  { label: 'GBP/USD', base: 'GBP', quote: 'USD' },
] as const;

type CurrencyPair = { label: string; base: string; quote: string };

const DEFAULT_PAIR: CurrencyPair = { label: 'USD/EUR', base: 'USD', quote: 'EUR' };

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
}

export default function FxAnalyticsHub() {
  const [selectedPair, setSelectedPair] = useState<CurrencyPair>(DEFAULT_PAIR);
  const [selectedPeriod, setSelectedPeriod] = useState<'1d' | '7d' | '30d' | '90d' | '1y'>('7d');
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [volatilityData, setVolatilityData] = useState<{ day: string; value: number }[]>([]);
  const [volatilityStats, setVolatilityStats] = useState<{
    average: number;
    max: number;
    min: number;
    level: 'Low' | 'Medium' | 'High';
  }>({ average: 0, max: 0, min: 0, level: 'Low' });

  const fetchData = useCallback(async () => {
    if (!selectedPair) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const [historyData, currentRateData] = await Promise.all([
        fetchRealFXHistory(selectedPair.base, selectedPair.quote, selectedPeriod),
        fetchRealFXRate(selectedPair.base, selectedPair.quote),
      ]);

      const points = historyData.data;
      const firstRate = points[0]?.rate || 0;
      const lastRate = currentRateData.rate;
      const changePercent = firstRate > 0 ? ((lastRate - firstRate) / firstRate) * 100 : 0;

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
        min: historyData.statistics.min,
        max: historyData.statistics.max,
      });
    } catch (err) {
      console.error('Error fetching FX data:', err);
      setError('Failed to fetch market data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedPair, selectedPeriod]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Generate dynamic insights based on real market data
  const insights = useMemo(() => {
    if (!chartData) return [];
    
    const { changePercent, currentRate } = chartData;
    const { level: volLevel, average: avgVol } = volatilityStats;
    
    // Calculate trend strength (based on recent price movement)
    const trendStrength = Math.min(Math.abs(changePercent) * 20, 100);
    const isUptrend = changePercent > 0;
    
    // Calculate conversion window score based on trend and volatility
    const conversionScore = volLevel === 'Low' ? 95 : volLevel === 'Medium' ? 75 : 55;
    
    // Calculate hedging recommendation based on volatility
    const hedgingPercent = volLevel === 'High' ? 60 : volLevel === 'Medium' ? 40 : 20;
    const hedgingScore = volLevel === 'High' ? 92 : volLevel === 'Medium' ? 78 : 58;
    
    // Calculate target rate (2% favorable from current)
    const targetRate = isUptrend 
      ? (currentRate * 1.02).toFixed(4) 
      : (currentRate * 0.98).toFixed(4);
    
    return [
      {
        title: 'Optimal Conversion Window',
        percent: Math.round(conversionScore),
        text: volLevel === 'Low' 
          ? `Current ${selectedPair?.label} volatility is low (${avgVol.toFixed(2)}%). Good time for conversion.`
          : volLevel === 'Medium'
          ? `Moderate volatility (${avgVol.toFixed(2)}%). Consider timing your conversion carefully.`
          : `High volatility detected (${avgVol.toFixed(2)}%). Consider waiting or hedging.`,
        link: 'Why this recommendation?',
        color: 'blue',
      },
      {
        title: 'Hedging Recommendation',
        percent: Math.round(hedgingScore),
        text: `Consider hedging ${hedgingPercent}% of exposure given ${volLevel.toLowerCase()} volatility (${avgVol.toFixed(2)}% avg).`,
        link: 'Hedging strategy details',
        color: 'orange',
      },
      {
        title: 'Rate Alert Setup',
        percent: Math.round(trendStrength + 50),
        text: `Set alert for ${selectedPair?.label} at ${targetRate} for optimal conversion opportunity.`,
        hasButton: true,
        color: 'green',
      },
    ];
  }, [chartData, volatilityStats, selectedPair]);

  // Generate dynamic alerts based on real market data
  const alerts = useMemo(() => {
    if (!chartData) return [];
    
    const { currentRate } = chartData;
    const { average: avgVol, level: volLevel } = volatilityStats;
    
    // Target rate is 2% favorable
    const targetRate = (currentRate * 0.98).toFixed(4);
    
    return [
      { 
        title: `${selectedPair?.label} Rate`, 
        subtitle: `Target: ${targetRate}`, 
        color: 'yellow' as const 
      },
      { 
        title: 'Volatility Alert', 
        subtitle: `Current: ${avgVol.toFixed(2)}% (${volLevel})`, 
        color: 'blue' as const 
      },
    ];
  }, [chartData, volatilityStats, selectedPair]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderChart = () => {
    if (!chartData || chartData.points.length === 0) return null;

    const { points, min, max } = chartData;
    
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
    
    // Build the line path
    let pathD = `M 0 ${getY(firstPoint.rate)}`;
    points.forEach((point, index) => {
      if (index > 0) {
        pathD += ` L ${getX(index)} ${getY(point.rate)}`;
      }
    });

    // Build the area path (close to bottom of chart)
    const lastX = getX(points.length - 1);
    const areaPath = pathD + ` L ${lastX} ${height} L 0 ${height} Z`;

    // Generate Y-axis labels (5 labels for cleaner display)
    const yLabels: string[] = [];
    const labelCount = 5;
    for (let i = 0; i <= labelCount; i++) {
      const value = yMax - (i / labelCount) * yRange;
      yLabels.push(value.toFixed(4));
    }

    // Generate X-axis labels (max 7 labels)
    const maxLabels = 7;
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
                <stop offset="0%" stopColor="rgba(59, 130, 246, 0.4)" />
                <stop offset="50%" stopColor="rgba(59, 130, 246, 0.15)" />
                <stop offset="100%" stopColor="rgba(59, 130, 246, 0.02)" />
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
              stroke="#3b82f6" 
              strokeWidth="0.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Data points */}
            {points.length <= 30 && points.map((point, index) => (
              <circle
                key={index}
                cx={getX(index)}
                cy={getY(point.rate)}
                r="0.8"
                fill="#3b82f6"
              />
            ))}
          </svg>
          <div className={styles.chartXAxis}>
            {xLabels.map((point, i) => (
              <span key={i}>{formatDate(point.date)}</span>
            ))}
          </div>
        </div>
      </div>
    );
  };
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
              <div className={styles.currencyLayout}>
                <div className={styles.donutContainer}>
                  <svg className={styles.donutSvg} viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#a855f7" strokeWidth="20" strokeDasharray="15.08 236.18" strokeDashoffset="0" transform="rotate(-90 50 50)" />
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#22c55e" strokeWidth="20" strokeDasharray="72.07 179.19" strokeDashoffset="-15.08" transform="rotate(-90 50 50)" />
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#3b82f6" strokeWidth="20" strokeDasharray="163.79 87.47" strokeDashoffset="-87.15" transform="rotate(-90 50 50)" />
                    <circle cx="50" cy="50" r="25" fill="white" />
                  </svg>
                  <div className={styles.donutLabels}>
                    <div className={styles.eurLabel}>EUR<br/>28.7%</div>
                    <div className={styles.gbpLabel}>GBP<br/>6.1%</div>
                    <div className={styles.usdLabel}>USD<br/>65.2%</div>
                  </div>
                </div>
              </div>
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
              {currencyDistribution.map((item) => (
                <div key={item.currency} className={styles.currencyAmountCard}>
                  <span className={styles.amountValue}>{item.amount}</span>
                  <span className={styles.amountPercent}>{item.percent}%</span>
                </div>
              ))}
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
              <div className={styles.insightList}>
                {insights.map((item) => (
                  <div
                    key={item.title}
                    className={`${styles.insight} ${
                      item.color === 'blue'
                        ? styles.insightBlue
                        : item.color === 'orange'
                        ? styles.insightOrange
                        : styles.insightGreen
                    }`}
                  >
                    <div className={styles.insightHeader}>
                      <span className={styles.insightTitle}>{item.title}</span>
                      <div className={styles.percentBadge}>
                        <span>{item.percent}%</span>
                        <div className={styles.progressSmall}>
                          <div style={{ width: `${item.percent}%` }}></div>
                        </div>
                      </div>
                    </div>
                    <p className={styles.insightText}>{item.text}</p>
                    {item.link && (
                      <a href="#" className={`${styles.insightLink} ${item.color === 'orange' ? styles.insightLinkOrange : ''}`}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="12" cy="12" r="10"/>
                          <path d="M12 16v-4M12 8h.01" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        {item.link}
                      </a>
                    )}
                    {item.hasButton && (
                      <button className={styles.setAlertBtn}>Set Alert</button>
                    )}
                  </div>
                ))}
              </div>
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
