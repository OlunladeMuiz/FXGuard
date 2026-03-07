'use client';

import Link from 'next/link';
import { useState } from 'react';
import styles from './page.module.css';

const features = [
  {
    title: 'Powerful Annual Reporting',
    text: "We've taken the 'complicated' out of FX reporting. User-friendly workflows automate up to 90% of manual tasks.",
    icon: 'chart',
  },
  {
    title: 'Quick Banking Transfer',
    text: 'Send money internationally in seconds. Our smart routing system finds the fastest and cheapest path.',
    icon: 'transfer',
  },
  {
    title: 'Growth Revenue',
    text: 'Track your FX gains and savings in real-time. Visualize how smart timing impacts your bottom line.',
    icon: 'growth',
  },
];

const faqs = [
  {
    q: 'What services does InvestIQ offer?',
    a: 'InvestIQ helps businesses generate invoices, optimize FX rates, and manage currency risk with real-time insights.',
    open: false,
  },
  {
    q: 'How do I open an account with InvestIQ?',
    a: 'Opening an account is simple. Click on the "Get Started" button on our homepage, fill out the required information, and submit the form. One of our representatives will contact you to complete the compliance process.',
    open: true,
  },
  {
    q: 'How do I reset my password?',
    a: 'Use the Forgot Password link on the login page to receive a reset email.',
    open: false,
  },
  {
    q: 'How can I check the performance of my investments?',
    a: 'Log into your dashboard and navigate to the Analytics section for detailed performance reports.',
    open: false,
  },
  {
    q: 'How do you protect my personal information?',
    a: 'We use bank-grade encryption, multi-factor authentication, and comply with international data protection standards.',
    open: false,
  },
];

const invoices = [
  {
    client: 'TechCorp GmbH',
    date: 'Oct 24, 2023',
    amount: '€12,450.00',
    status: 'Pending',
  },
  {
    client: 'Design Studio Ltd',
    date: 'Oct 22, 2023',
    amount: '£8,200.00',
    status: 'Paid',
  },
];

export default function Home() {
  const [faqState, setFaqState] = useState(faqs.map(f => f.open));
  const [sendAmount, setSendAmount] = useState('50,000');
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('EUR');
  const [calcAmount, setCalcAmount] = useState('10000');
  const [calcFrom, setCalcFrom] = useState('USD');
  const [calcTo, setCalcTo] = useState('EUR');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleFaq = (index: number) => {
    setFaqState(prev => prev.map((open, i) => (i === index ? !open : open)));
  };

  return (
    <div className={styles.page}>
      {/* Navigation */}
      <header className={styles.navbar}>
        <div className={styles.navContainer}>
          <div className={styles.navBrand}>
            <div className={styles.logoIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M13 3L4 14h7l-2 7 9-11h-7l2-7z" fill="white"/>
              </svg>
            </div>
            <span className={styles.logoText}>FXGuard</span>
          </div>
          <nav className={styles.navLinks}>
            <a href="#products">Products</a>
            <a href="#solutions">Solutions</a>
            <a href="#pricing">Pricing</a>
            <a href="#resources">Resources</a>
          </nav>
          <div className={styles.navActions}>
            <Link href="/login" className={styles.loginLink}>Log in</Link>
            <Link href="/signup" className={styles.getStartedBtn}>Get Started</Link>
          </div>
          <button 
            className={styles.mobileMenuBtn}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12h18M3 6h18M3 18h18"/>
              </svg>
            )}
          </button>
        </div>
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className={styles.mobileMenu}>
            <nav className={styles.mobileNavLinks}>
              <a href="#products" onClick={() => setMobileMenuOpen(false)}>Products</a>
              <a href="#solutions" onClick={() => setMobileMenuOpen(false)}>Solutions</a>
              <a href="#pricing" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
              <a href="#resources" onClick={() => setMobileMenuOpen(false)}>Resources</a>
            </nav>
            <div className={styles.mobileNavActions}>
              <Link href="/login" className={styles.mobileLoginLink}>Log in</Link>
              <Link href="/signup" className={styles.mobileGetStartedBtn}>Get Started</Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroBackground}>
          <div className={styles.gridPattern}></div>
        </div>
        <div className={styles.heroContent}>
          <span className={styles.pill}>
            <span className={styles.pillDot}></span>
            New: AI-Powered FX Risk Analysis
          </span>
          <h1 className={styles.heroTitle}>
            Global Invoicing &<br />
            <span className={styles.heroHighlight}>Smart FX Optimization</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Generate international invoices, get real-time currency conversion
            suggestions, and protect your margins with our volatility alerts.
          </p>
          <div className={styles.heroActions}>
            <Link href="/signup" className={styles.primaryButton}>
              Start Saving Now
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </Link>
            <button className={styles.secondaryButton}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5,3 19,12 5,21"/>
              </svg>
              View Demo
            </button>
          </div>
        </div>

        {/* Dashboard Mockup */}
        <div className={styles.mockupContainer}>
          <div className={styles.browserFrame}>
            <div className={styles.browserDots}>
              <span className={styles.dotRed}></span>
              <span className={styles.dotYellow}></span>
              <span className={styles.dotGreen}></span>
            </div>
            <div className={styles.browserUrl}>
              <span>fxguard.app/dashboard</span>
            </div>
          </div>
          <div className={styles.mockupContent}>
            <div className={styles.mockupMain}>
              {/* FX Rate Forecast Card */}
              <div className={styles.forecastCard}>
                <div className={styles.forecastHeader}>
                  <div>
                    <h3>FX Rate Forecast (USD/EUR)</h3>
                    <p className={styles.forecastSubtitle}>AI prediction for next 7 days</p>
                  </div>
                  <span className={styles.buySignal}>Buy Signal</span>
                </div>
                <div className={styles.chartContainer}>
                  <svg className={styles.chart} viewBox="0 0 400 150" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.1"/>
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0"/>
                      </linearGradient>
                    </defs>
                    <path
                      d="M0 120 Q 50 100, 100 80 T 200 60 T 300 40 T 400 30"
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2"
                    />
                    <path
                      d="M0 120 Q 50 100, 100 80 T 200 60 T 300 40 T 400 30 V 150 H 0 Z"
                      fill="url(#chartGradient)"
                    />
                  </svg>
                  <div className={styles.chartLabels}>
                    <span>1</span>
                    <span>0.8</span>
                    <span>0.6</span>
                    <span>0.4</span>
                    <span>0.2</span>
                    <span>0</span>
                  </div>
                  <div className={styles.chartXLabels}>
                    <span>Mon</span>
                    <span>Tue</span>
                    <span>Wed</span>
                    <span>Thu</span>
                    <span>Fri</span>
                    <span>Sat</span>
                    <span>Sun</span>
                  </div>
                </div>
              </div>

              {/* Recent Invoices Table */}
              <div className={styles.invoicesCard}>
                <h3>Recent International Invoices</h3>
                <table className={styles.invoiceTable}>
                  <thead>
                    <tr>
                      <th>CLIENT</th>
                      <th>DATE</th>
                      <th>AMOUNT</th>
                      <th>STATUS</th>
                      <th>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv, idx) => (
                      <tr key={idx}>
                        <td>{inv.client}</td>
                        <td>{inv.date}</td>
                        <td>{inv.amount}</td>
                        <td>
                          <span className={inv.status === 'Paid' ? styles.statusPaid : styles.statusPending}>
                            {inv.status}
                          </span>
                        </td>
                        <td><a href="#" className={styles.viewLink}>View</a></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sidebar */}
            <div className={styles.mockupSidebar}>
              {/* Volatility Alert */}
              <div className={styles.alertCard}>
                <div className={styles.alertHeader}>
                  <div className={styles.alertIcon}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                      <path d="M12 22c1.1 0 2-.9 2-2h-4a2 2 0 002 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
                    </svg>
                  </div>
                  <span className={styles.alertBadge}>Just Now</span>
                </div>
                <h4 className={styles.alertTitle}>High Volatility Alert</h4>
                <p className={styles.alertText}>
                  USD/JPY has moved 1.2% in the last hour. Consider hedging your upcoming Japan invoice.
                </p>
                <button className={styles.alertButton}>Review Options</button>
              </div>

              {/* Quick Savings Calculator */}
              <div className={styles.calcCard}>
                <h4>Quick Savings Calc</h4>
                <div className={styles.calcField}>
                  <label>Invoice Amount</label>
                  <div className={styles.calcInput}>
                    <span className={styles.currencySymbol}>$</span>
                    <input
                      type="text"
                      value={calcAmount}
                      onChange={(e) => setCalcAmount(e.target.value)}
                    />
                  </div>
                </div>
                <div className={styles.calcCurrencies}>
                  <div className={styles.calcCurrency}>
                    <label>From</label>
                    <select value={calcFrom} onChange={(e) => setCalcFrom(e.target.value)}>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                  <div className={styles.calcCurrency}>
                    <label>To</label>
                    <select value={calcTo} onChange={(e) => setCalcTo(e.target.value)}>
                      <option value="EUR">EUR</option>
                      <option value="USD">USD</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                </div>
                <div className={styles.calcResults}>
                  <div className={styles.calcRow}>
                    <span>Bank Cost:</span>
                    <span className={styles.bankCost}>$350</span>
                  </div>
                  <div className={styles.calcRow}>
                    <span className={styles.investiqLabel}>InvestIQ Cost:</span>
                    <span className={styles.investiqCost}>$45</span>
                  </div>
                </div>
                <div className={styles.savingsBadge}>
                  You save $305 on this transfer!
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted By Section */}
      <section className={styles.trustedSection}>
        <p className={styles.trustedTitle}>Built for modern SMEs who operate globally</p>
        <div className={styles.trustedLogos}>
          <div className={styles.logoItem}>
            <span>E-commerce Sellers</span>
          </div>
          <div className={styles.logoItem}>
            <span>Import and Export businesses</span>
          </div>
          <div className={styles.logoItem}>
            <span>Remote freelancers</span>
          </div>
          <div className={styles.logoItem}>
            <span>Growing SMEs</span>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className={styles.featureSection} id="features">
        <h2 className={styles.featureTitle}>Manage and pay your people in<br />just a few clicks</h2>
        <p className={styles.featureSubtitle}>
          Leave spreadsheets and tedious calculations in the past. Say &apos;yes&apos; to cloud-based payroll
          and FX software that automates international payments.
        </p>
        <div className={styles.featureGrid}>
          {features.map((item) => (
            <div key={item.title} className={styles.featureCard}>
              <div className={styles.featureChart}>
                <div className={styles.featureDateLabel}>Sept 23, 2024</div>
                <div className={styles.featureAmount}>
                  {item.title === 'Powerful Annual Reporting' && '$12,450'}
                  {item.title === 'Quick Banking Transfer' && '$308,100.00'}
                  {item.title === 'Growth Revenue' && '$100,87 USD'}
                </div>
                {item.title === 'Quick Banking Transfer' && (
                  <div className={styles.transferUser}>
                    <span className={styles.userAvatar}>)&quot;&gt;</span>
                    <span>Gabriella Gibson</span>
                  </div>
                )}
                <div className={styles.miniChart}>
                  <div className={styles.miniBar}></div>
                  <div className={styles.miniBar}></div>
                  <div className={styles.miniBarTall}></div>
                  {item.title === 'Growth Revenue' && <div className={styles.miniBar}></div>}
                </div>
              </div>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FX Volatility Section */}
      <section className={styles.volatilitySection}>
        <div className={styles.volatilityContent}>
          <h2>Smart FX Volatility Graph &<br />Alerts</h2>
          <p className={styles.volatilityDesc}>
            Don&apos;t let currency fluctuations eat your profits. Our AI monitors
            140+ currencies 24/7 to alert you of the perfect moment to transfer.
          </p>
          <div className={styles.volatilityFeatures}>
            <div className={styles.volatilityFeature}>
              <div className={styles.featureIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                  <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>
                </svg>
              </div>
              <div>
                <h4>Volatility Prediction</h4>
                <p>Our algorithms predict volatility spikes with 85% accuracy up to 48 hours in advance.</p>
              </div>
            </div>
            <div className={styles.volatilityFeature}>
              <div className={styles.featureIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
              </div>
              <div>
                <h4>Custom Rate Alerts</h4>
                <p>Set your target rate and get notified via SMS, Email, or Slack instantly when it hits.</p>
              </div>
            </div>
            <div className={styles.volatilityFeature}>
              <div className={styles.featureIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                  <line x1="8" y1="21" x2="16" y2="21"/>
                  <line x1="12" y1="17" x2="12" y2="21"/>
                </svg>
              </div>
              <div>
                <h4>Auto-Invoicing</h4>
                <p>Generate invoices in local currency that auto-adjust based on live rates to protect your margin.</p>
              </div>
            </div>
          </div>
          <button className={styles.exploreButton}>Explore FX Tools</button>
        </div>
        <div className={styles.volatilityChart}>
          <div className={styles.savingsFloat}>
            <div className={styles.savingsFloatIcon}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
                <polyline points="23,6 13.5,15.5 8.5,10.5 1,18"/>
                <polyline points="17,6 23,6 23,12"/>
              </svg>
            </div>
            <div>
              <span className={styles.savingsLabel}>Savings this month</span>
              <span className={styles.savingsAmount}>$4,250.00</span>
            </div>
          </div>
          <div className={styles.rateCard}>
            <div className={styles.rateHeader}>
              <span className={styles.ratePair}>GBP / USD</span>
            </div>
            <div className={styles.rateValue}>
              <span className={styles.rateNumber}>1.2450</span>
              <span className={styles.rateChange}>+0.45%</span>
            </div>
            <div className={styles.rateGraph}>
              <svg viewBox="0 0 300 100" preserveAspectRatio="none">
                <path
                  d="M0 80 Q 30 70, 60 75 T 100 55 T 140 45 T 180 35 T 220 30 T 260 25 T 300 35"
                  fill="none"
                  stroke="#16a34a"
                  strokeWidth="2"
                />
              </svg>
              <div className={styles.graphYAxis}>
                <span>1.26</span>
                <span>1.255</span>
                <span>1.25</span>
                <span>1.245</span>
                <span>1.24</span>
              </div>
              <div className={styles.graphXAxis}>
                <span>0</span>
                <span>5</span>
                <span>10</span>
                <span>15</span>
              </div>
              <div className={styles.timeLabel}>Time (Hours)</div>
            </div>
            <div className={styles.alertsSection}>
              <h5>Active Alerts</h5>
              <div className={styles.alertItem}>
                <span className={styles.alertDotBlue}></span>
                <span>GBP/USD &gt; 1.2500</span>
                <div className={styles.toggleOn}></div>
              </div>
              <div className={styles.alertItem}>
                <span className={styles.alertDotGray}></span>
                <span>EUR/USD &lt; 1.0500</span>
                <div className={styles.toggleOff}></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Calculator Section */}
      <section className={styles.pricingSection} id="pricing">
        <p className={styles.pricingLabel}>TRANSPARENT PRICING</p>
        <h2 className={styles.pricingTitle}>See how much you could save</h2>
        <div className={styles.pricingCard}>
          <div className={styles.pricingInputs}>
            <div className={styles.inputGroup}>
              <label>I want to send</label>
              <div className={styles.amountInput}>
                <span className={styles.currencyPrefix}>$</span>
                <input
                  type="text"
                  value={sendAmount}
                  onChange={(e) => setSendAmount(e.target.value)}
                />
                <select value={fromCurrency} onChange={(e) => setFromCurrency(e.target.value)}>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
            </div>
            <div className={styles.inputGroup}>
              <label>Recipient gets</label>
              <div className={styles.amountInput}>
                <span className={styles.currencyPrefix}>€</span>
                <input type="text" value="46,250.00" readOnly />
                <select value={toCurrency} onChange={(e) => setToCurrency(e.target.value)}>
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
            </div>
            <div className={styles.rateInfo}>
              <div className={styles.rateRow}>
                <span>Current Rate</span>
                <span className={styles.rateBlue}>1USD = 0.9250 EUR</span>
              </div>
              <div className={styles.rateRow}>
                <span>Fee</span>
                <span className={styles.rateBlue}>$25.00 (Flat fee)</span>
              </div>
            </div>
          </div>
          <div className={styles.comparisonBox}>
            <h4>Comparison</h4>
            <div className={styles.comparisonBar}>
              <div className={styles.barLabel}>INVESTIQ</div>
              <div className={styles.barFill}></div>
              <span className={styles.barAmount}>€46,225</span>
            </div>
            <div className={styles.comparisonBar}>
              <div className={styles.barLabelBank}>MAJOR BANK</div>
              <div className={styles.barFillBank}></div>
              <span className={styles.barAmount}>€45,100</span>
            </div>
            <div className={styles.savingsResult}>
              <p>You save approximately</p>
              <h3>€1,125.00</h3>
              <span>Compared to average bank rates</span>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className={styles.faqSection} id="resources">
        <h2>Frequently asked questions</h2>
        <p className={styles.faqSubtitle}>
          Visit our<br />
          <a href="#" className={styles.helpLink}>Help Center</a>
          <br />for more information.
        </p>
        <div className={styles.faqList}>
          {faqs.map((item, index) => (
            <div key={item.q} className={styles.faqItem}>
              <button
                className={styles.faqQuestion}
                onClick={() => toggleFaq(index)}
                aria-expanded={faqState[index]}
              >
                <span>{item.q}</span>
                <span className={styles.faqIcon}>{faqState[index] ? '−' : '+'}</span>
              </button>
              {faqState[index] && (
                <div className={styles.faqAnswer}>
                  <p>{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaIcon}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
            <path d="M3 3v18h18V3H3zm16 16H5V5h14v14zM7 7h2v2H7V7zm0 4h2v2H7v-2zm0 4h2v2H7v-2zm4-8h6v2h-6V7zm0 4h6v2h-6v-2zm0 4h6v2h-6v-2z"/>
          </svg>
        </div>
        <h2>FXGuard has helped over 1.5M<br />SMEs grow</h2>
        <p>
          Make your payroll data more visible and accessible. Choose from hundreds of
          dimensions to build custom reports that source all the financial & HR data you need.
        </p>
        <Link href="/signup" className={styles.ctaButton}>Book a Demo</Link>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerMain}>
          <div className={styles.footerBrand}>
            <div className={styles.footerLogo}>
              <div className={styles.logoIcon}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M13 3L4 14h7l-2 7 9-11h-7l2-7z" fill="white"/>
                </svg>
              </div>
              <span>InvestIQ</span>
            </div>
            <p>Empowering SMEs with enterprise-grade FX tools and automated invoicing solutions.</p>
            <div className={styles.socialLinks}>
              <a href="#" aria-label="Twitter">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/>
                </svg>
              </a>
              <a href="#" aria-label="LinkedIn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
                  <rect x="2" y="9" width="4" height="12"/>
                  <circle cx="4" cy="4" r="2"/>
                </svg>
              </a>
              <a href="#" aria-label="GitHub">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
                </svg>
              </a>
            </div>
          </div>
          <div className={styles.footerLinks}>
            <div className={styles.footerColumn}>
              <h5>Product</h5>
              <a href="#">Features</a>
              <a href="#">Pricing</a>
              <a href="#">API</a>
              <a href="#">Integrations</a>
            </div>
            <div className={styles.footerColumn}>
              <h5>Resources</h5>
              <a href="#">Documentation</a>
              <a href="#">Guides</a>
              <a href="#">Support Center</a>
              <a href="#">Partners</a>
            </div>
            <div className={styles.footerColumn}>
              <h5>Company</h5>
              <a href="#">About</a>
              <a href="#">Blog</a>
              <a href="#">Careers</a>
              <a href="#">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
