import { useState } from 'react';

import styles from '@/app/settings/page.module.css';
import {
  IntegrationProvider,
  IntegrationRecord,
} from '@/types/settings';

interface IntegrationsSectionProps {
  integrations: IntegrationRecord[];
  loading: boolean;
  connectingProvider: IntegrationProvider | null;
  error: string | null;
  successMessage: string | null;
  hasConnectedProvider: boolean;
  connect: (payload: { provider: IntegrationProvider; credential: string }) => Promise<void>;
}

export function IntegrationsSection({
  integrations,
  loading,
  connectingProvider,
  error,
  successMessage,
  hasConnectedProvider,
  connect,
}: IntegrationsSectionProps) {
  const [expandedProvider, setExpandedProvider] = useState<IntegrationProvider | null>(null);
  const [credentials, setCredentials] = useState<Record<IntegrationProvider, string>>({
    paystack: '',
    flutterwave: '',
    interswitch: '',
  });

  const handleConnect = async (provider: IntegrationProvider) => {
    await connect({
      provider,
      credential: credentials[provider],
    });
    setExpandedProvider(null);
  };

  return (
    <section className={styles.card}>
      <div className={styles.sectionHeader}>
        <div>
          <span className={styles.sectionEyebrow}>Integrations</span>
          <h3>Payment execution rails</h3>
          <p>FXGuard relies on external providers to generate payment links, process transactions, and settle funds.</p>
        </div>
      </div>

      {successMessage && <div className={styles.successBanner}>{successMessage}</div>}
      {error && <div className={styles.errorBanner}>{error}</div>}

      {!hasConnectedProvider && (
        <div className={styles.warningBanner}>
          Connect at least one provider before generating payment links for invoices.
        </div>
      )}

      {loading ? (
        <div className={styles.emptyState}>Loading payment providers...</div>
      ) : (
        <div className={styles.integrationGrid}>
          {integrations.map((integration) => {
            const isExpanded = expandedProvider === integration.provider;
            const isConnecting = connectingProvider === integration.provider;

            return (
              <article key={integration.provider} className={styles.integrationCard}>
                <div className={styles.integrationHeader}>
                  <div>
                    <span className={styles.integrationProvider}>{integration.name}</span>
                    <p>{integration.description}</p>
                  </div>
                  <span
                    className={
                      integration.status === 'connected'
                        ? styles.statusSuccess
                        : styles.statusNeutral
                    }
                  >
                    {integration.status === 'connected' ? 'Connected' : 'Not Connected'}
                  </span>
                </div>

                <div className={styles.integrationMeta}>
                  <span>
                    {integration.connectedAt
                      ? `Connected ${new Date(integration.connectedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}`
                      : 'No live connection yet'}
                  </span>
                </div>

                {integration.status === 'connected' ? (
                  <button type="button" className={styles.secondaryButton} disabled>
                    Connected
                  </button>
                ) : (
                  <>
                    {isExpanded && (
                      <div className={styles.integrationConnectPanel}>
                        <label className={styles.formLabel}>API Key or OAuth Token</label>
                        <input
                          className={styles.formInput}
                          value={credentials[integration.provider]}
                          onChange={(event) => setCredentials((current) => ({
                            ...current,
                            [integration.provider]: event.target.value,
                          }))}
                          placeholder={`Enter ${integration.name} credential`}
                          disabled={isConnecting}
                        />
                      </div>
                    )}

                    <div className={styles.integrationActions}>
                      {!isExpanded ? (
                        <button
                          type="button"
                          className={styles.primaryButton}
                          onClick={() => setExpandedProvider(integration.provider)}
                        >
                          Connect
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            className={styles.primaryButton}
                            onClick={() => void handleConnect(integration.provider)}
                            disabled={isConnecting}
                          >
                            {isConnecting ? 'Connecting...' : `Connect ${integration.name}`}
                          </button>
                          <button
                            type="button"
                            className={styles.secondaryButton}
                            onClick={() => setExpandedProvider(null)}
                            disabled={isConnecting}
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
