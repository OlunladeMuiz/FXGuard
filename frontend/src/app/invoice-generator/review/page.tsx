'use client';

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import { fetchRealFXRate, fetchRealFXHistory } from '@/lib/api/fx';

export default function InvoiceReviewPage() {
  const [fxRate, setFxRate] = useState<number | null>(null);
  const [rateChange24h, setRateChange24h] = useState<number | null>(null);
  const [rateChange7d, setRateChange7d] = useState<number | null>(null);
  const [volatility, setVolatility] = useState<string>('Loading...');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFXData = async () => {
      try {
        // Fetch current rate
        const { rate } = await fetchRealFXRate('USD', 'EUR');
        setFxRate(rate);

        // Fetch 7 day history for trend and volatility
        const history = await fetchRealFXHistory('USD', 'EUR', '7d');
        
        // 24h change
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 2);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        const histResponse = await fetch(
          `https://api.frankfurter.app/${yesterdayStr}?from=USD&to=EUR`
        );
        const histData = await histResponse.json();
        const yesterdayRate = histData.rates?.EUR || rate;
        const change24h = ((rate - yesterdayRate) / yesterdayRate) * 100;
        setRateChange24h(Math.round(change24h * 100) / 100);
        
        // 7 day change from history data
        if (history.data.length > 0) {
          const firstRate = history.data[0].rate;
          const lastRate = history.data[history.data.length - 1].rate;
          const change7d = ((lastRate - firstRate) / firstRate) * 100;
          setRateChange7d(Math.round(change7d * 100) / 100);
          
          // Calculate volatility
          const vol = history.statistics?.volatility || 0;
          if (vol < 0.5) setVolatility('Low');
          else if (vol < 1.5) setVolatility('Medium');
          else setVolatility('High');
        }
      } catch (error) {
        console.error('Failed to fetch FX data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFXData();
  }, []);

  const displayRate = fxRate ? fxRate.toFixed(4) : '---';
  const display24h = rateChange24h !== null 
    ? `${rateChange24h >= 0 ? '+' : ''}${rateChange24h.toFixed(2)}% (24h)` 
    : '---';
  const display7d = rateChange7d !== null 
    ? `${rateChange7d >= 0 ? '+' : ''}${rateChange7d.toFixed(2)}%` 
    : '---';

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.breadcrumb}>Back to Editor | Invoice INV-2024-001</div>
        <header className={styles.header}>
          <h1>Review & Send Invoice</h1>
          <p>Review your invoice details, configure delivery settings, and send to client</p>
        </header>

        <div className={styles.layout}>
          <div className={styles.main}>
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <h3>Invoice Preview</h3>
                <div>
                  <button className={styles.link}>Edit</button>
                  <button className={styles.link}>Full Screen</button>
                </div>
              </div>
              <div className={styles.preview}>
                <div className={styles.previewHeader}>
                  <div>
                    <strong>FXGuard</strong>
                    <p>International Invoice Solutions</p>
                  </div>
                  <div>
                    <h4>INVOICE</h4>
                    <span>#INV-2024-001</span>
                    <span className={styles.badge}>Ready to Send</span>
                  </div>
                </div>
                <div className={styles.previewBody}>
                  <div>
                    <h5>Bill From</h5>
                    <p>TechFlow Solutions Ltd.</p>
                    <p>123 Innovation Street</p>
                    <p>London, UK</p>
                  </div>
                  <div>
                    <h5>Bill To</h5>
                    <p>Global Enterprises Inc.</p>
                    <p>456 Business Avenue</p>
                    <p>New York, NY</p>
                  </div>
                </div>
                <div className={styles.previewTable}>
                  <div>Software Development Services</div>
                  <div>40</div>
                  <div>$125.00</div>
                  <div>$5,000.00</div>
                  <div>UI/UX Design</div>
                  <div>20</div>
                  <div>$100.00</div>
                  <div>$2,000.00</div>
                </div>
                <div className={styles.previewTotals}>
                  <div><span>Subtotal</span><strong>$7,000.00</strong></div>
                  <div><span>Discount (5%)</span><strong>-$350.00</strong></div>
                  <div><span>Tax (20%)</span><strong>$1,330.00</strong></div>
                  <div className={styles.total}><span>Total (USD)</span><strong>$7,980.00</strong></div>
                </div>
              </div>
            </section>

            <section className={styles.card}>
              <h3>FX Rate Details</h3>
              <div className={styles.fxDetails}>
                <div>
                  <span>Current Rate (USD/EUR)</span>
                  <strong>{loading ? '...' : displayRate}</strong>
                  <small>{loading ? '...' : display24h}</small>
                </div>
                <div>
                  <span>Rate Trend (7d)</span>
                  <strong className={rateChange7d !== null && rateChange7d >= 0 ? styles.green : styles.red}>
                    {loading ? '...' : display7d}
                  </strong>
                </div>
                <div>
                  <span>Volatility</span>
                  <strong className={volatility === 'High' ? styles.warning : volatility === 'Medium' ? styles.warning : styles.green}>
                    {loading ? '...' : volatility}
                  </strong>
                </div>
                <div>
                  <span>Optimal Window</span>
                  <strong>Next 3-5 days</strong>
                </div>
              </div>
              <div className={styles.radioGroup}>
                <label><input type="radio" defaultChecked /> Use Spot Rate</label>
                <label><input type="radio" /> Lock Current Rate</label>
              </div>
            </section>

            <section className={styles.card}>
              <h3>Audit Trail</h3>
              <div className={styles.audit}>
                <div>Invoice Created - March 4, 2024 at 2:30 PM</div>
                <div>Ready for Review - March 4, 2024 at 2:35 PM</div>
              </div>
            </section>
          </div>

          <aside className={styles.sidebar}>
            <section className={styles.card}>
              <h3>Email Settings</h3>
              <div className={styles.formGroup}>
                <label>Recipient</label>
                <input defaultValue="sarah.johnson@globalent.com" />
              </div>
              <div className={styles.formGroup}>
                <label>Subject</label>
                <input defaultValue="Invoice INV-2024-001 from TechFlow Solutions" />
              </div>
              <div className={styles.formGroup}>
                <label>Message</label>
                <textarea defaultValue="Dear Sarah,\n\nPlease find attached invoice INV-2024-001 for the software development services provided.\n\nPayment is due within 30 days." />
              </div>
            </section>

            <section className={styles.card}>
              <h3>Attachments</h3>
              <div className={styles.attachment}>INV-2024-001.pdf</div>
              <button className={styles.dashed}>+ Add Additional Files</button>
            </section>

            <section className={styles.card}>
              <h3>Compliance Notes</h3>
              <div className={styles.noteGreen}>VAT Compliance - All required VAT information included</div>
              <div className={styles.noteBlue}>Cross-border Transaction - USD to EUR conversion documented</div>
              <div className={styles.noteYellow}>Payment Terms - Ensure client understands currency exposure</div>
            </section>

            <section className={styles.card}>
              <div className={styles.checkboxGroup}>
                <label><input type="checkbox" /> Save as draft before sending</label>
                <label><input type="checkbox" defaultChecked /> Send copy to myself</label>
                <label><input type="checkbox" defaultChecked /> Track email delivery</label>
              </div>
              <button className={styles.primary}>Send Invoice</button>
              <button className={styles.secondary}>Download PDF Only</button>
              <button className={styles.tertiary}>Save as Draft</button>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
