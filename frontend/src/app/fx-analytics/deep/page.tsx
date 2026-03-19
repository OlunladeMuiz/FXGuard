'use client';

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import { fetchRealFXRate, fetchRealFXRateOnDate } from '@/lib/api/fx';

const alerts = [
  { title: 'Rate Above 0.9280', status: 'Active', tone: 'green' },
  { title: 'Rate Below 0.9200', status: 'Active', tone: 'yellow' },
  { title: 'Volatility > 2%', status: 'Active', tone: 'blue' },
];

const indicators = [
  { name: 'RSI (14)', value: '62.4', status: 'Neutral' },
  { name: 'MACD', value: '+0.0012', status: 'Bullish' },
  { name: 'MA (20)', value: '0.9235', status: 'Above' },
  { name: 'Bollinger Bands', value: 'Mid-Range', status: 'Normal' },
];

const events = [
  {
    title: 'Fed Interest Rate Decision',
    time: 'Today, 14:00 EST',
    detail: 'Expected to maintain current rates. High volatility anticipated.',
    tone: 'red',
  },
  {
    title: 'ECB Economic Bulletin',
    time: 'Tomorrow, 09:00 CET',
    detail: 'Quarterly economic assessment from European Central Bank.',
    tone: 'yellow',
  },
  {
    title: 'US Employment Data',
    time: 'Mar 8, 08:30 EST',
    detail: 'Non-farm payrolls and unemployment rate release.',
    tone: 'blue',
  },
];

export default function FxDeepAnalysis() {
  const [fxRate, setFxRate] = useState<number | null>(null);
  const [rateChange, setRateChange] = useState<{ value: number; percent: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFXData = async () => {
      try {
        const { rate } = await fetchRealFXRate('USD', 'EUR');
        setFxRate(rate);

        // Calculate 24h change
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 2);
        const yesterdayStr = yesterday.toISOString().slice(0, 10);
        const { rate: yesterdayRateValue } = await fetchRealFXRateOnDate('USD', 'EUR', yesterdayStr);
        const yesterdayRate = yesterdayRateValue || rate;
        
        const changeValue = rate - yesterdayRate;
        const changePercent = ((rate - yesterdayRate) / yesterdayRate) * 100;
        setRateChange({ value: changeValue, percent: changePercent });
      } catch (error) {
        console.error('Failed to fetch FX rate:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFXData();
  }, []);

  const displayRate = fxRate ? fxRate.toFixed(4) : '---';
  const convertedAmount = fxRate ? (10000 * fxRate).toFixed(2) : '---';
  const netReceive = fxRate ? ((10000 * fxRate) - 50).toFixed(2) : '---';
  const changeDisplay = rateChange 
    ? `${rateChange.value >= 0 ? '+' : ''}${rateChange.value.toFixed(4)} (${rateChange.percent >= 0 ? '+' : ''}${rateChange.percent.toFixed(2)}%)`
    : '---';

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>USD/EUR Deep Analysis</h1>
          <p>Advanced charting, indicators, and real-time analysis for USD/EUR currency pair</p>
        </header>

        <div className={styles.summaryRow}>
          <div className={styles.summaryCard}>
            <div className={styles.pair}>USD/EUR</div>
            <div className={styles.rate}>{loading ? '...' : displayRate}</div>
            <div className={styles.delta}>{loading ? '...' : changeDisplay}</div>
          </div>
          <div className={styles.summaryActions}>
            <button className={styles.primary}>Set Alert</button>
            <button className={styles.secondary}>Watchlist</button>
          </div>
        </div>

        <div className={styles.layout}>
          <div className={styles.main}>
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <h3>Advanced Chart</h3>
                <div className={styles.segment}>
                  <button>1H</button>
                  <button>4H</button>
                  <button className={styles.active}>1D</button>
                  <button>1W</button>
                  <button>1M</button>
                </div>
                <div className={styles.controls}>
                  <select>
                    <option>Candlestick</option>
                  </select>
                  <button>Indicators</button>
                  <button>Annotate</button>
                </div>
              </div>
              <div className={styles.chartArea} />
            </section>

            <section className={styles.gridTwo}>
              <div className={styles.card}>
                <h3>Technical Indicators</h3>
                <div className={styles.indicatorList}>
                  {indicators.map((item) => (
                    <div key={item.name}>
                      <strong>{item.name}</strong>
                      <span>{item.value}</span>
                      <small>{item.status}</small>
                    </div>
                  ))}
                </div>
              </div>
              <div className={styles.card}>
                <h3>Key Levels</h3>
                <div className={styles.levels}>
                  <div>
                    <h4>Resistance Levels</h4>
                    <p>R3 {fxRate ? (fxRate * 1.007).toFixed(4) : '---'}</p>
                    <p>R2 {fxRate ? (fxRate * 1.004).toFixed(4) : '---'}</p>
                    <p>R1 {fxRate ? (fxRate * 1.002).toFixed(4) : '---'}</p>
                  </div>
                  <div>
                    <h4>Current</h4>
                    <p>{displayRate}</p>
                  </div>
                  <div>
                    <h4>Support Levels</h4>
                    <p>S1 {fxRate ? (fxRate * 0.998).toFixed(4) : '---'}</p>
                    <p>S2 {fxRate ? (fxRate * 0.995).toFixed(4) : '---'}</p>
                    <p>S3 {fxRate ? (fxRate * 0.991).toFixed(4) : '---'}</p>
                  </div>
                </div>
              </div>
            </section>

            <section className={styles.card}>
              <h3>Key Events Timeline</h3>
              <div className={styles.eventList}>
                {events.map((event) => (
                  <div key={event.title} className={`${styles.event} ${styles[event.tone]}`}>
                    <strong>{event.title}</strong>
                    <span>{event.detail}</span>
                    <small>{event.time}</small>
                  </div>
                ))}
              </div>
            </section>

            <section className={styles.card}>
              <h3>Conversion Simulator</h3>
              <div className={styles.simGrid}>
                <div className={styles.simInputs}>
                  <label>Amount to Convert</label>
                  <div className={styles.inlineInput}>
                    <input defaultValue="10000" />
                    <select>
                      <option>USD</option>
                    </select>
                  </div>
                  <label>Converted Amount</label>
                  <div className={styles.inlineInput}>
                    <input value={convertedAmount} readOnly />
                    <select>
                      <option>EUR</option>
                    </select>
                  </div>
                </div>
                <div className={styles.simDetails}>
                  <h4>Conversion Details</h4>
                  <div>
                    <span>Exchange Rate</span>
                    <strong>{displayRate}</strong>
                  </div>
                  <div>
                    <span>Fee (0.5%)</span>
                    <strong>$50.00</strong>
                  </div>
                  <div>
                    <span>You Receive</span>
                    <strong>EUR {netReceive}</strong>
                  </div>
                  <button className={styles.primary}>Execute Conversion</button>
                </div>
              </div>
            </section>
          </div>

          <aside className={styles.sidebar}>
            <div className={styles.card}>
              <div className={styles.sidebarHeader}>
                <h3>Saved Alerts</h3>
                <button className={styles.link}>+ Add Alert</button>
              </div>
              <div className={styles.alertList}>
                {alerts.map((alert) => (
                  <div key={alert.title} className={`${styles.alert} ${styles[alert.tone]}`}>
                    <strong>{alert.title}</strong>
                    <span>{alert.status}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.card}>
              <h3>Market Sentiment</h3>
              <div className={styles.sentimentCircle}>68%</div>
              <p className={styles.sentimentLabel}>Bullish Sentiment</p>
              <div className={styles.sentimentBars}>
                <div>
                  <span>Long Positions</span>
                  <div className={styles.bar}><span style={{ width: '68%' }} /></div>
                  <strong>68%</strong>
                </div>
                <div>
                  <span>Short Positions</span>
                  <div className={styles.bar}><span style={{ width: '32%' }} /></div>
                  <strong>32%</strong>
                </div>
              </div>
            </div>

            <div className={styles.card}>
              <h3>Related Pairs</h3>
              <div className={styles.related}>
                <div>
                  <strong>EUR/GBP</strong>
                  <span>0.8542</span>
                </div>
                <div>
                  <strong>GBP/USD</strong>
                  <span>-0.08%</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
