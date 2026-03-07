import styles from './page.module.css';

export default function CurrencySettingsPage() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.brand}>FXGuard</div>
          <h1>Currency Settings</h1>
          <p>Configure your currency preferences and FX optimization settings</p>
          <div className={styles.stepper}>
            <span className={styles.stepDone}>1</span>
            <span className={styles.stepLine} />
            <span className={styles.stepActive}>2</span>
          </div>
        </header>

        <div className={styles.card}>
          <section>
            <h3>Base Currency</h3>
            <label className={styles.label}>Primary Business Currency *</label>
            <select className={styles.select}>
              <option>Select your base currency</option>
            </select>
            <p className={styles.helper}>This will be your default accounting and reporting currency</p>
          </section>

          <section>
            <h3>Invoice Currencies</h3>
            <div className={styles.currencyGrid}>
              {['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'].map((code) => (
                <label key={code} className={styles.currencyTile}>
                  <input type="checkbox" className={styles.input} />
                  <span>{code}</span>
                  <small>{code}</small>
                </label>
              ))}
            </div>
          </section>

          <section>
            <h3>Settlement Currencies</h3>
            <label className={styles.label}>Preferred Settlement Currencies *</label>
            <input className={styles.input} placeholder="Primary settlement currency" />
            <input className={styles.input} placeholder="Secondary settlement currency (optional)" />
          </section>

          <section>
            <h3>FX Alert Thresholds</h3>
            <div className={styles.gridTwo}>
              <div>
                <label className={styles.label}>Volatility Alert Threshold</label>
                <input className={styles.input} defaultValue="2.0" />
              </div>
              <div>
                <label className={styles.label}>Favorable Rate Alert</label>
                <input className={styles.input} defaultValue="1.5" />
              </div>
            </div>
          </section>

          <section>
            <h3>Rounding Rules</h3>
            <div className={styles.gridTwo}>
              <div>
                <label className={styles.label}>Amount Rounding</label>
                <input className={styles.input} defaultValue="2 decimal places (0.01)" />
              </div>
              <div>
                <label className={styles.label}>Exchange Rate Precision</label>
                <input className={styles.input} defaultValue="4 decimal places (0.0001)" />
              </div>
            </div>
          </section>

          <section className={styles.integration}>
            <div>
              <h3>Accounting Integration</h3>
              <p>Import existing currency settings and transaction history</p>
            </div>
            <button className={styles.primary}>Import</button>
          </section>
        </div>
      </div>
    </div>
  );
}
