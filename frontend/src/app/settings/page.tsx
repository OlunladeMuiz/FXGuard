'use client';

import { useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import styles from './page.module.css';
import { BankDetailsSection } from '@/components/settings/BankDetailsSection';
import { BusinessDetailsSection } from '@/components/settings/BusinessDetailsSection';
import { IntegrationsSection } from '@/components/settings/IntegrationsSection';
import { NotificationsSection } from '@/components/settings/NotificationsSection';
import { ProfileSecuritySection } from '@/components/settings/ProfileSecuritySection';
import { SETTINGS_NAV_ITEMS } from '@/components/settings/navigation';
import { SettingsSidebar } from '@/components/settings/SettingsSidebar';
import { clearAuthTokens } from '@/lib/api/auth';
import { useBankDetails } from '@/hooks/useBankDetails';
import { useBusinessDetails } from '@/hooks/useBusinessDetails';
import { useIntegrations } from '@/hooks/useIntegrations';
import { useNotifications } from '@/hooks/useNotifications';
import { useProfileSettings } from '@/hooks/useProfileSettings';
import { SettingsSection, SettingsSectionSchema } from '@/types/settings';

function parseSection(value: string | null): SettingsSection {
  const result = SettingsSectionSchema.safeParse(value);
  return result.success ? result.data : 'profile';
}

export default function SettingsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeSection = parseSection(searchParams.get('section'));
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const profile = useProfileSettings();
  const business = useBusinessDetails();
  const bank = useBankDetails();
  const integrations = useIntegrations();
  const notifications = useNotifications(profile.form.preferredCurrency);

  const handleSectionChange = (section: SettingsSection) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('section', section);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const activeLabel = useMemo(
    () => SETTINGS_NAV_ITEMS.find((item) => item.section === activeSection)?.label ?? 'Settings',
    [activeSection],
  );

  const connectedProvidersCount = integrations.integrations.filter(
    (integration) => integration.status === 'connected',
  ).length;

  const handleLogout = () => {
    setIsLoggingOut(true);
    clearAuthTokens();
    router.replace('/login');
  };

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'business':
        return (
          <BusinessDetailsSection
            businessDetails={business.businessDetails}
            form={business.form}
            loading={business.loading}
            saving={business.saving}
            error={business.error}
            successMessage={business.successMessage}
            setField={business.setField}
            save={business.save}
          />
        );
      case 'bank':
        return (
          <BankDetailsSection
            bankDetails={bank.bankDetails}
            lastSavedRecord={bank.lastSavedRecord}
            loading={bank.loading}
            saving={bank.saving}
            error={bank.error}
            successMessage={bank.successMessage}
            updateField={bank.updateField}
            save={bank.save}
          />
        );
      case 'notifications':
        return (
          <NotificationsSection
            notifications={notifications.notifications}
            loading={notifications.loading}
            error={notifications.error}
            refresh={notifications.refresh}
          />
        );
      case 'integrations':
        return (
          <IntegrationsSection
            integrations={integrations.integrations}
            loading={integrations.loading}
            connectingProvider={integrations.connectingProvider}
            error={integrations.error}
            successMessage={integrations.successMessage}
            hasConnectedProvider={integrations.hasConnectedProvider}
            connect={integrations.connect}
          />
        );
      case 'profile':
      default:
        return (
          <ProfileSecuritySection
            form={profile.form}
            loading={profile.loading}
            saving={profile.saving}
            error={profile.error}
            successMessage={profile.successMessage}
            setField={profile.setField}
            save={profile.save}
            isLoggingOut={isLoggingOut}
            onLogout={handleLogout}
          />
        );
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div>
            <span className={styles.headerEyebrow}>FXGuard Settings</span>
            <h1>Financial control center</h1>
            <p>
              Manage the identity, payout rails, payment providers, and FX intelligence that
              power cross-border execution for your business.
            </p>
          </div>
        </header>

        <section className={styles.overviewGrid}>
          <article className={styles.overviewCard}>
            <span className={styles.overviewLabel}>Active Section</span>
            <strong>{activeLabel}</strong>
            <p>Each settings block affects how FXGuard monitors and executes settlement decisions.</p>
          </article>
          <article className={styles.overviewCard}>
            <span className={styles.overviewLabel}>Default Currency</span>
            <strong>{profile.form.preferredCurrency}</strong>
            <p>This currency drives invoice settlement defaults and recommendation context.</p>
          </article>
          <article className={styles.overviewCard}>
            <span className={styles.overviewLabel}>Connected Providers</span>
            <strong>{connectedProvidersCount}/3</strong>
            <p>At least one connected provider is required before payment links can be executed.</p>
          </article>
          <article className={styles.overviewCard}>
            <span className={styles.overviewLabel}>Live Notifications</span>
            <strong>{notifications.notifications.length}</strong>
            <p>FXGuard blends live recommendation signals with system readiness alerts.</p>
          </article>
        </section>

        <div className={styles.layout}>
          <SettingsSidebar
            activeSection={activeSection}
            onSelect={handleSectionChange}
          />

          <main className={styles.main}>
            {renderActiveSection()}
          </main>
        </div>
      </div>
    </div>
  );
}
