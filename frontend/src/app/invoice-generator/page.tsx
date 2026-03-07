'use client';

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import { fetchRealFXRate } from '@/lib/api/fx';

export default function InvoiceGeneratorPage() {
  const [fxRate, setFxRate] = useState<number | null>(null);
  const [rateChange, setRateChange] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFXData = async () => {
      try {
        // Fetch current rate
        const { rate } = await fetchRealFXRate('USD', 'EUR');
        setFxRate(rate);

        // Calculate 24h change by getting yesterday's rate
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 2);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        const histResponse = await fetch(
          `https://api.frankfurter.app/${yesterdayStr}?from=USD&to=EUR`
        );
        const histData = await histResponse.json();
        const yesterdayRate = histData.rates?.EUR || rate;
        
        const change = ((rate - yesterdayRate) / yesterdayRate) * 100;
        setRateChange(Math.round(change * 100) / 100);
      } catch (error) {
        console.error('Failed to fetch FX rate:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFXData();
  }, []);

  const displayRate = fxRate ? fxRate.toFixed(4) : '---';
  const displayChange = rateChange !== null 
    ? `${rateChange >= 0 ? '+' : ''}${rateChange.toFixed(2)}%` 
    : '---';

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>Create New Invoice</h1>
          <p>Generate professional international invoices with optimized FX rates</p>
        </header>

        <div className={styles.layout}>
          <div className={styles.formColumn}>
            <section className={styles.card}>
              <h3>Client Details</h3>
              <div className={styles.gridTwo}>
                <div>
                  <label className={styles.label}>Client Name</label>
                  <input className={styles.input} placeholder="Enter client name" />
                </div>
                <div>
                  <label className={styles.label}>Address</label>
                  <textarea className={styles.addressInput} placeholder="Street address, City, State/Province" />
                </div>
                <div>
                  <label className={styles.label}>Company</label>
                  <input className={styles.input} placeholder="Company name" />
                </div>
                <div>
                  <label className={styles.label}>Country</label>
                  <select className={styles.select}>
                    <option>Select country</option>
                  </select>
                </div>
                <div>
                  <label className={styles.label}>Email Address</label>
                  <input className={styles.input} placeholder="client@company.com" />
                </div>
              </div>
            </section>

            <section className={styles.card}>
              <h3>Invoice Details</h3>
              <div className={styles.gridFour}>
                <div>
                  <label className={styles.label}>Invoice Number</label>
                  <input className={styles.input} defaultValue="INV-2024-001" />
                </div>
                <div>
                  <label className={styles.label}>Issue Date</label>
                  <input type="date" className={styles.input} defaultValue="2024-03-04" />
                </div>
                <div>
                  <label className={styles.label}>Due Date</label>
                  <input type="date" className={styles.input} placeholder="mm/dd/yyyy" />
                </div>
                <div>
                  <label className={styles.label}>Payment Terms</label>
                  <select className={styles.select}>
                    <option>Net 30</option>
                  </select>
                </div>
              </div>
            </section>

            <section className={styles.card}>
              <h3>Currency Settings</h3>
              <div className={styles.gridTwo}>
                <div>
                  <label className={styles.label}>Invoice Currency</label>
                  <select className={styles.select}>
                    <option>USD - US Dollar</option>
                  </select>
                  <span className={styles.helper}>Current rate: 1 USD = {loading ? '...' : displayRate} EUR</span>
                </div>
                <div>
                  <label className={styles.label}>Settlement Currency (Optional)</label>
                  <select className={styles.select}>
                    <option>Same as invoice currency</option>
                  </select>
                  <span className={styles.helper}>For FX optimization tracking</span>
                </div>
              </div>
            </section>

            <section className={styles.card}>
              <div className={styles.sectionHeader}>
                <h3>Line Items</h3>
                <button className={styles.addButton}>+ Add Item</button>
              </div>
              <div className={styles.lineHeader}>
                <span>Description</span>
                <span>Qty</span>
                <span>Rate</span>
                <span>Amount</span>
                <span>Action</span>
              </div>
              {[1, 2].map((i) => (
                <div key={i} className={styles.lineRow}>
                  <input className={styles.input} placeholder="Item description" />
                  <input className={styles.input} defaultValue="1" />
                  <input className={styles.input} placeholder="0.00" />
                  <strong>$0.00</strong>
                  <button className={styles.trash}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              ))}
            </section>

            <section className={styles.cardSplit}>
              <div>
                <h3>Tax & Discount</h3>
                <div className={styles.gridTwo}>
                  <div>
                    <label className={styles.label}>Discount</label>
                    <div className={styles.inlineInput}>
                      <input className={styles.input} defaultValue="0" />
                      <select className={styles.select}>
                        <option>%</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={styles.label}>Tax Rate</label>
                    <div className={styles.taxInput}>
                      <input className={styles.input} defaultValue="0" />
                      <span>%</span>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <h3>Invoice Total</h3>
                <div className={styles.totalBox}>
                  <div><span>Subtotal</span><strong>$0.00</strong></div>
                  <div><span>Discount</span><strong>-$0.00</strong></div>
                  <div><span>Tax</span><strong>$0.00</strong></div>
                  <div className={styles.totalRow}><span>Total</span><strong>$0.00</strong></div>
                </div>
              </div>
            </section>

            <section className={styles.card}>
              <h3>Notes & Payment Instructions</h3>
              <textarea className={styles.textarea} placeholder="Add any additional notes, payment instructions, or terms..." />
            </section>

            <div className={styles.actions}>
              <button className={styles.secondary}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                  <polyline points="17 21 17 13 7 13 7 21"></polyline>
                  <polyline points="7 3 7 8 15 8"></polyline>
                </svg>
                Save as Draft
              </button>
              <button className={styles.success}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
                Send Invoice
              </button>
              <button className={styles.primary}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Download PDF
              </button>
            </div>
          </div>

          <aside className={styles.previewColumn}>
            <section className={styles.card}>
              <div className={styles.previewHeader}>
                <h3>Live Preview</h3>
                <button className={styles.link}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
                  </svg>
                  Full Screen
                </button>
              </div>
              <div className={styles.previewBox}>
                <div className={styles.previewTop}>
                  <div className={styles.previewBrand}>
                    <span className={styles.previewLogo}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 18V6" />
                        <path d="M20 18V6" />
                        <path d="M7 13l3-3 4 4 3-3" />
                      </svg>
                    </span>
                    <span>FXGuard</span>
                  </div>
                  <div className={styles.previewInvoiceLabel}>
                    <strong>INVOICE</strong>
                    <span>INV-2024-001</span>
                  </div>
                </div>
                <div className={styles.previewAddresses}>
                  <div>
                    <span className={styles.addressLabel}>FROM</span>
                    <strong>Your Business Name</strong>
                    <span>123 Business Street</span>
                    <span>City, State 12345</span>
                    <span>Country</span>
                  </div>
                  <div>
                    <span className={styles.addressLabel}>TO</span>
                    <strong>Client Name</strong>
                    <span>Company Name</span>
                    <span>Client Address</span>
                  </div>
                </div>
                <div className={styles.previewDates}>
                  <div>
                    <span>Issue Date</span>
                    <strong>March 4, 2024</strong>
                  </div>
                  <div>
                    <span>Due Date</span>
                    <strong>April 3, 2024</strong>
                  </div>
                </div>
                <div className={styles.previewTable}>
                  <div className={styles.previewTableHeader}>
                    <span>Description</span>
                    <span>Amount</span>
                  </div>
                  <div className={styles.previewTableRow}>
                    <span>Service/Product 1</span>
                    <span>$0.00</span>
                  </div>
                  <div className={styles.previewTableRow}>
                    <span>Service/Product 2</span>
                    <span>$0.00</span>
                  </div>
                </div>
                <div className={styles.previewTotals}>
                  <div><span>Subtotal</span><span>$0.00</span></div>
                  <div><span>Tax</span><span>$0.00</span></div>
                  <div className={styles.previewTotal}><span>Total</span><strong>$0.00</strong></div>
                </div>
                <div className={styles.previewPayment}>
                  <strong>Payment Instructions</strong>
                  <span>Payment terms and instructions will appear here.</span>
                </div>
              </div>
            </section>

            <section className={styles.card}>
              <div className={styles.fxHeader}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2">
                  <path d="M3 3v18h18" />
                  <path d="m19 9-5 5-4-4-3 3" />
                </svg>
                <h3>FX Rate Info</h3>
              </div>
              <div className={styles.fxInfo}>
                <div>
                  <span>Current Rate (USD/EUR)</span>
                  <strong>{loading ? '...' : displayRate}</strong>
                </div>
                <div>
                  <span>Rate Trend (24h)</span>
                  <strong className={rateChange !== null && rateChange >= 0 ? styles.green : styles.red}>
                    {loading ? '...' : displayChange}
                  </strong>
                </div>
                <div>
                  <span>Optimal Window</span>
                  <strong>Next 3-5 days</strong>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
