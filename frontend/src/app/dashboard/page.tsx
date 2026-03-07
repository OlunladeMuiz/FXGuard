'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './page.module.css';
import { getUser, User } from '@/lib/api/auth';

interface FXRateData {
  pair: string;
  base: string;
  description: string;
  rate: string;
  change: string;
  changeType: 'positive' | 'negative';
}

interface StatData {
  label: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'warning';
  subtitle: string;
  icon: string;
}

const watchlist = [
  { pair: 'EUR/GBP', status: 'Watching', currentRate: '0.8574', targetRate: '0.8600', progress: 85 },
  { pair: 'USD/JPY', status: 'Target Hit', currentRate: '148.25', targetRate: '148.00', progress: 100 },
  { pair: 'GBP/CAD', status: 'Watching', currentRate: '1.7845', targetRate: '1.7500', progress: 42 },
];

const spreads = [
  { pair: 'EUR/USD', bid: '1.08465', ask: '1.08475', spread: '1.0 pips', status: 'Tight' },
  { pair: 'GBP/USD', bid: '1.26535', ask: '1.26555', spread: '2.0 pips', status: 'Normal' },
  { pair: 'USD/JPY', bid: '148.245', ask: '148.260', spread: '1.5 pips', status: 'Tight' },
  { pair: 'AUD/USD', bid: '0.65415', ask: '0.65435', spread: '2.0 pips', status: 'Normal' },
];

const invoices = [
  { status: 'Pending', client: 'Acme Corp', avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=32&h=32&fit=crop', currency: 'EUR', amount: '€12,450', dueDate: 'Dec 28, 2024' },
];

// Frankfurter API base URL
const FRANKFURTER_API = 'https://api.frankfurter.app';

export default function DashboardPage() {
  const [selectedPair, setSelectedPair] = useState('EUR/USD');
  const [selectedPeriod, setSelectedPeriod] = useState('This Month');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [user, setUser] = useState<User | null>(null);
  const [fxRates, setFxRates] = useState<FXRateData[]>([]);
  const [statsData, setStatsData] = useState<StatData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = getUser();
    setUser(userData);
  }, []);

  useEffect(() => {
    const fetchRealFXRates = async () => {
      try {
        // Fetch current rates
        const response = await fetch(`${FRANKFURTER_API}/latest?from=USD&to=EUR,GBP,CAD,AUD`);
        const data = await response.json();
        
        // Fetch yesterday's rates for change calculation
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 2);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        const histResponse = await fetch(`${FRANKFURTER_API}/${yesterdayStr}?from=USD&to=EUR,GBP,CAD,AUD`);
        const histData = await histResponse.json();
        
        // Calculate rates and changes for each pair
        const ratesArray: FXRateData[] = [];
        
        // EUR/USD (inverted since we want EUR as base)
        const eurRate = 1 / data.rates.EUR;
        const eurYesterday = 1 / histData.rates.EUR;
        const eurChange = ((eurRate - eurYesterday) / eurYesterday) * 100;
        ratesArray.push({
          pair: 'EUR/USD',
          base: 'EUR',
          description: 'Euro to US Dollar',
          rate: eurRate.toFixed(4),
          change: `${eurChange >= 0 ? '+' : ''}${eurChange.toFixed(2)}%`,
          changeType: eurChange >= 0 ? 'positive' : 'negative',
        });
        
        // GBP/USD
        const gbpRate = 1 / data.rates.GBP;
        const gbpYesterday = 1 / histData.rates.GBP;
        const gbpChange = ((gbpRate - gbpYesterday) / gbpYesterday) * 100;
        ratesArray.push({
          pair: 'GBP/USD',
          base: 'GBP',
          description: 'British Pound to USD',
          rate: gbpRate.toFixed(4),
          change: `${gbpChange >= 0 ? '+' : ''}${gbpChange.toFixed(2)}%`,
          changeType: gbpChange >= 0 ? 'positive' : 'negative',
        });
        
        // CAD/USD
        const cadRate = 1 / data.rates.CAD;
        const cadYesterday = 1 / histData.rates.CAD;
        const cadChange = ((cadRate - cadYesterday) / cadYesterday) * 100;
        ratesArray.push({
          pair: 'CAD/USD',
          base: 'CAD',
          description: 'Canadian Dollar to USD',
          rate: cadRate.toFixed(4),
          change: `${cadChange >= 0 ? '+' : ''}${cadChange.toFixed(2)}%`,
          changeType: cadChange >= 0 ? 'positive' : 'negative',
        });
        
        // AUD/USD
        const audRate = 1 / data.rates.AUD;
        const audYesterday = 1 / histData.rates.AUD;
        const audChange = ((audRate - audYesterday) / audYesterday) * 100;
        ratesArray.push({
          pair: 'AUD/USD',
          base: 'AUD',
          description: 'Australian Dollar to USD',
          rate: audRate.toFixed(4),
          change: `${audChange >= 0 ? '+' : ''}${audChange.toFixed(2)}%`,
          changeType: audChange >= 0 ? 'positive' : 'negative',
        });
        
        setFxRates(ratesArray);
        
        // Update stats with real EUR/USD rate
        const avgChange = eurChange;
        setStatsData([
          { label: 'Total Exposure', value: '$247,890', change: '+12.5%', changeType: 'positive', subtitle: 'Across 5 currencies', icon: 'exposure' },
          { label: 'Average FX Rate', value: eurRate.toFixed(4), change: `${avgChange >= 0 ? '+' : ''}${avgChange.toFixed(1)}%`, changeType: avgChange >= 0 ? 'positive' : 'negative', subtitle: 'EUR/USD (current)', icon: 'rate' },
          { label: 'FX Savings (MTD)', value: '$2,340', change: '+$890', changeType: 'positive', subtitle: 'From optimal timing', icon: 'savings' },
          { label: 'Pending Invoices', value: '3', change: '1 urgent', changeType: 'warning', subtitle: '$12,450 total value', icon: 'invoices' },
        ]);
        
      } catch (error) {
        console.error('Failed to fetch FX rates:', error);
        // Fallback to placeholder data
        setFxRates([
          { pair: 'EUR/USD', base: 'EUR', description: 'Euro to US Dollar', rate: '1.0847', change: '+0.12%', changeType: 'positive' },
          { pair: 'GBP/USD', base: 'GBP', description: 'British Pound to USD', rate: '1.2654', change: '-0.08%', changeType: 'negative' },
        ]);
        setStatsData([
          { label: 'Total Exposure', value: '$247,890', change: '+12.5%', changeType: 'positive', subtitle: 'Across 5 currencies', icon: 'exposure' },
          { label: 'Average FX Rate', value: '1.0847', change: '-0.8%', changeType: 'negative', subtitle: 'EUR/USD (7 days avg)', icon: 'rate' },
          { label: 'FX Savings (MTD)', value: '$2,340', change: '+$890', changeType: 'positive', subtitle: 'From optimal timing', icon: 'savings' },
          { label: 'Pending Invoices', value: '3', change: '1 urgent', changeType: 'warning', subtitle: '$12,450 total value', icon: 'invoices' },
        ]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRealFXRates();
  }, []);

  // Extract display name from email (part before @)
  const displayName = user?.email ? user.email.split('@')[0] : 'User';

  return (
    <div className={styles.dashboard}>
      {/* Welcome Header */}
      <div className={styles.welcome}>
        <h1>Welcome back, {displayName}</h1>
        <p>Here&apos;s what&apos;s happening with your international invoices and FX exposure today</p>
      </div>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        {statsData.map((stat) => (
          <div key={stat.label} className={styles.statCard}>
            <div className={styles.statHeader}>
              <div className={`${styles.statIcon} ${styles[stat.icon]}`}>
                {stat.icon === 'exposure' && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                  </svg>
                )}
                {stat.icon === 'rate' && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M23 6l-9.5 9.5-5-5L1 18"/>
                    <path d="M17 6h6v6"/>
                  </svg>
                )}
                {stat.icon === 'savings' && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                  </svg>
                )}
                {stat.icon === 'invoices' && (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/>
                    <polyline points="12 6 12 12 16 14"/>
                  </svg>
                )}
              </div>
              <span className={`${styles.statChange} ${styles[stat.changeType]}`}>{stat.change}</span>
            </div>
            <div className={styles.statLabel}>{stat.label}</div>
            <div className={styles.statValue}>{stat.value}</div>
            <div className={styles.statSubtitle}>{stat.subtitle}</div>
          </div>
        ))}
      </div>

      {/* Three Column Section */}
      <div className={styles.threeColGrid}>
        {/* Live FX Rates */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Live FX Rates</h2>
            <button className={styles.viewAllBtn}>View All</button>
          </div>
          <div className={styles.ratesList}>
            {fxRates.map((rate) => (
              <div key={rate.pair} className={styles.rateItem}>
                <div className={styles.rateLeft}>
                  <span className={`${styles.currencyBadge} ${styles[rate.base.toLowerCase()]}`}>{rate.base}</span>
                  <div>
                    <div className={styles.ratePair}>{rate.pair}</div>
                    <div className={styles.rateDesc}>{rate.description}</div>
                  </div>
                </div>
                <div className={styles.rateRight}>
                  <div className={styles.rateValue}>{rate.rate}</div>
                  <div className={`${styles.rateChange} ${styles[rate.changeType]}`}>{rate.change}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FX Watchlist */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>FX Watchlist</h2>
            <button className={styles.addBtn}>+ Add Pair</button>
          </div>
          <div className={styles.watchlistItems}>
            {watchlist.map((item) => (
              <div key={item.pair} className={styles.watchItem}>
                <div className={styles.watchHeader}>
                  <span className={styles.watchPair}>{item.pair}</span>
                  <span className={`${styles.watchStatus} ${item.status === 'Target Hit' ? styles.targetHit : styles.watching}`}>
                    {item.status}
                  </span>
                </div>
                <div className={styles.watchRates}>
                  <div className={styles.watchRateRow}>
                    <span className={styles.watchLabel}>Current Rate</span>
                    <span className={styles.watchValue}>{item.currentRate}</span>
                  </div>
                  <div className={styles.watchRateRow}>
                    <span className={styles.watchLabel}>Target Rate</span>
                    <span className={styles.watchTarget}>{item.targetRate}</span>
                  </div>
                </div>
                {item.status === 'Target Hit' ? (
                  <button className={styles.executeBtn}>Execute Trade</button>
                ) : (
                  <>
                    <div className={styles.progressBar}>
                      <div className={styles.progressFill} style={{ width: `${item.progress}%` }} />
                    </div>
                    <span className={styles.progressLabel}>{item.progress}% to target</span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* FX Spreads */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>FX Spreads</h2>
            <span className={styles.lastUpdated}>Last updated: 2m ago</span>
          </div>
          <div className={styles.spreadsList}>
            {spreads.map((spread) => (
              <div key={spread.pair} className={styles.spreadItem}>
                <div className={styles.spreadHeader}>
                  <span className={styles.spreadPair}>{spread.pair}</span>
                  <span className={`${styles.spreadStatus} ${spread.status === 'Tight' ? styles.tight : styles.normal}`}>
                    {spread.status}
                  </span>
                </div>
                <div className={styles.spreadValues}>
                  <div className={styles.spreadCol}>
                    <span className={styles.spreadLabel}>Bid</span>
                    <span className={styles.spreadValue}>{spread.bid}</span>
                  </div>
                  <div className={styles.spreadCol}>
                    <span className={styles.spreadLabel}>Ask</span>
                    <span className={styles.spreadValue}>{spread.ask}</span>
                  </div>
                </div>
                <div className={styles.spreadInfo}>Spread: <span className={styles.spreadHighlight}>{spread.spread}</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className={styles.chartsGrid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>FX Rate Trends (30 Days)</h2>
            <select 
              className={styles.select} 
              value={selectedPair}
              onChange={(e) => setSelectedPair(e.target.value)}
            >
              <option>EUR/USD</option>
              <option>GBP/USD</option>
              <option>USD/JPY</option>
            </select>
          </div>
          <div className={styles.chartPlaceholder}>
            <div className={styles.chartArea}>
              <svg viewBox="0 0 400 150" className={styles.chartSvg}>
                <path 
                  d="M 0 100 Q 50 80, 100 90 T 200 70 T 300 85 T 400 60" 
                  fill="none" 
                  stroke="var(--color-primary)" 
                  strokeWidth="2"
                />
                <path 
                  d="M 0 100 Q 50 80, 100 90 T 200 70 T 300 85 T 400 60 L 400 150 L 0 150 Z" 
                  fill="url(#gradient)" 
                  opacity="0.1"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="var(--color-primary)" />
                    <stop offset="100%" stopColor="transparent" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Currency Exposure</h2>
            <select 
              className={styles.select}
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
            >
              <option>This Month</option>
              <option>Last Month</option>
              <option>This Quarter</option>
            </select>
          </div>
          <div className={styles.chartPlaceholder}>
            <div className={styles.pieChartArea}>
              <div className={styles.pieChart}>
                <svg viewBox="0 0 100 100" className={styles.pieSvg}>
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#e2e8f0" strokeWidth="20" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#3b82f6" strokeWidth="20" strokeDasharray="100 151" strokeDashoffset="0" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#10b981" strokeWidth="20" strokeDasharray="60 191" strokeDashoffset="-100" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#f59e0b" strokeWidth="20" strokeDasharray="40 211" strokeDashoffset="-160" />
                </svg>
              </div>
              <div className={styles.pieLegend}>
                <div className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#3b82f6' }} /> EUR 40%</div>
                <div className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#10b981' }} /> GBP 24%</div>
                <div className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#f59e0b' }} /> USD 16%</div>
                <div className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#e2e8f0' }} /> Other 20%</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Invoices */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2>Recent Invoices</h2>
          <div className={styles.invoiceActions}>
            <select 
              className={styles.select}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option>All Status</option>
              <option>Pending</option>
              <option>Paid</option>
              <option>Overdue</option>
            </select>
            <Link href="/invoice-generator" className={styles.newInvoiceBtn}>+ New Invoice</Link>
          </div>
        </div>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Status</th>
                <th>Client</th>
                <th>Currency</th>
                <th>Amount</th>
                <th>Due Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv, idx) => (
                <tr key={idx}>
                  <td><span className={`${styles.statusBadge} ${styles[inv.status.toLowerCase()]}`}>{inv.status}</span></td>
                  <td>
                    <div className={styles.clientCell}>
                      <img src={inv.avatar} alt={inv.client} className={styles.clientAvatar} />
                      {inv.client}
                    </div>
                  </td>
                  <td>{inv.currency}</td>
                  <td>{inv.amount}</td>
                  <td>{inv.dueDate}</td>
                  <td>
                    <button className={styles.moreBtn}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="5" r="2" />
                        <circle cx="12" cy="12" r="2" />
                        <circle cx="12" cy="19" r="2" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
