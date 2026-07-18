'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import styles from './page.module.css';
import RecommendationPanel from '@/components/fx/RecommendationPanel';
import { AUTH_USER_UPDATED_EVENT, getUser, getUserDisplayName, type User } from '@/lib/api/auth';
import { fetchRecommendation } from '@/lib/api/recommendation';
import { type Recommendation } from '@/lib/types/recommendation';
import { fetchAllInvoiceRecords, formatCurrency, type InvoiceRecord } from '@/lib/invoices/editor';

type InvoiceSummary = {
  totalCount: number;
  openCount: number;
  overdueCount: number;
  dueTodayCount: number;
  dueSoonCount: number;
  currencyCount: number;
  largestOpenInvoice: InvoiceRecord | null;
  priorityInvoice: InvoiceRecord | null;
  settlementQueue: InvoiceRecord[];
};

type SettlementTone = 'critical' | 'watch' | 'steady';

const OPEN_INVOICE_STATUSES = new Set(['draft', 'sent', 'overdue', 'pending']);

const QUICK_ACTIONS = [
  {
    href: '/invoice-generator',
    label: 'Issue invoice',
    detail: 'Create the next receivable and keep the queue moving.',
  },
];

const EMPTY_INVOICE_SUMMARY: InvoiceSummary = {
  totalCount: 0,
  openCount: 0,
  overdueCount: 0,
  dueTodayCount: 0,
  dueSoonCount: 0,
  currencyCount: 0,
  largestOpenInvoice: null,
  priorityInvoice: null,
  settlementQueue: [],
};

function formatInvoiceDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getDaysUntilDue(value: string): number | null {
  const dueDate = new Date(value);
  if (Number.isNaN(dueDate.getTime())) {
    return null;
  }

  const today = new Date();
  const normalizedDue = new Date(dueDate);
  const normalizedToday = new Date(today);
  normalizedDue.setHours(0, 0, 0, 0);
  normalizedToday.setHours(0, 0, 0, 0);

  return Math.ceil((normalizedDue.getTime() - normalizedToday.getTime()) / (1000 * 60 * 60 * 24));
}

function getInvoicePriorityRank(invoice: InvoiceRecord): number {
  const daysUntilDue = getDaysUntilDue(invoice.dueDate);

  if (daysUntilDue === null) {
    return 4;
  }
  if (daysUntilDue < 0) {
    return 0;
  }
  if (daysUntilDue === 0) {
    return 1;
  }
  if (daysUntilDue <= 7) {
    return 2;
  }
  return 3;
}

function compareOpenInvoices(left: InvoiceRecord, right: InvoiceRecord): number {
  const leftRank = getInvoicePriorityRank(left);
  const rightRank = getInvoicePriorityRank(right);
  if (leftRank !== rightRank) {
    return leftRank - rightRank;
  }

  const leftDays = getDaysUntilDue(left.dueDate);
  const rightDays = getDaysUntilDue(right.dueDate);
  if (leftDays !== rightDays) {
    if (leftDays === null) {
      return 1;
    }
    if (rightDays === null) {
      return -1;
    }
    return leftDays - rightDays;
  }

  return right.amount - left.amount;
}

function getInvoiceSummary(invoices: InvoiceRecord[]): InvoiceSummary {
  const openInvoices = invoices
    .filter((invoice) => OPEN_INVOICE_STATUSES.has(invoice.status.toLowerCase()))
    .sort(compareOpenInvoices);

  const dueTodayCount = openInvoices.filter((invoice) => getDaysUntilDue(invoice.dueDate) === 0).length;
  const dueSoonCount = openInvoices.filter((invoice) => {
    const daysUntilDue = getDaysUntilDue(invoice.dueDate);
    return daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 7;
  }).length;

  const largestOpenInvoice = openInvoices.reduce<InvoiceRecord | null>((largest, invoice) => {
    if (!largest || invoice.amount > largest.amount) {
      return invoice;
    }
    return largest;
  }, null);

  return {
    totalCount: invoices.length,
    openCount: openInvoices.length,
    overdueCount: openInvoices.filter((invoice) => {
      const daysUntilDue = getDaysUntilDue(invoice.dueDate);
      return daysUntilDue !== null && daysUntilDue < 0;
    }).length,
    dueTodayCount,
    dueSoonCount,
    currencyCount: new Set(openInvoices.map((invoice) => invoice.currency.toUpperCase())).size,
    largestOpenInvoice,
    priorityInvoice: openInvoices[0] ?? null,
    settlementQueue: openInvoices.slice(0, 6),
  };
}

function getClientInitials(name: string): string {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return initials || 'FX';
}

function getSettlementWindow(daysUntilDue: number | null): {
  label: string;
  note: string;
  tone: SettlementTone;
} {
  if (daysUntilDue === null) {
    return {
      label: 'Schedule pending',
      note: 'The due date could not be parsed, so this settlement should be reviewed manually.',
      tone: 'steady',
    };
  }

  if (daysUntilDue < 0) {
    return {
      label: `${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) === 1 ? '' : 's'} overdue`,
      note: 'This invoice has passed its due date and belongs at the front of the execution queue.',
      tone: 'critical',
    };
  }

  if (daysUntilDue === 0) {
    return {
      label: 'Due today',
      note: "This settlement sits inside today's conversion window and should be treated as active treasury work.",
      tone: 'critical',
    };
  }

  if (daysUntilDue <= 7) {
    return {
      label: `${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'} left`,
      note: 'This receivable is entering the live execution window, so timing decisions now have visible impact.',
      tone: 'watch',
    };
  }

  return {
    label: `${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'} left`,
    note: 'This settlement still has runway, but it should remain on the active treasury board.',
    tone: 'steady',
  };
}

function getCommandHeadline(invoiceSummary: InvoiceSummary): string {
  if (invoiceSummary.overdueCount > 0) {
    return 'Overdue settlements need attention.';
  }

  if (invoiceSummary.dueTodayCount > 0) {
    return "Today's window is live. Sequence the queue carefully.";
  }

  return 'All settlements are currently on track.';
}

function getCommandNarrative(invoiceSummary: InvoiceSummary): string {
  const queueSummary = `${invoiceSummary.openCount} open settlement${invoiceSummary.openCount === 1 ? '' : 's'} across ${invoiceSummary.currencyCount} currency lane${invoiceSummary.currencyCount === 1 ? '' : 's'}.`;
  const windowSummary = invoiceSummary.dueSoonCount > 0
    ? ` ${invoiceSummary.dueSoonCount} already sit inside the active window.`
    : '';

  return `${queueSummary}${windowSummary}`;
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [invoiceSummary, setInvoiceSummary] = useState<InvoiceSummary>(EMPTY_INVOICE_SUMMARY);
  const [invoiceLoading, setInvoiceLoading] = useState(true);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [recommendationError, setRecommendationError] = useState<string | null>(null);

  useEffect(() => {
    const syncUser = (event?: Event) => {
      const updatedUser =
        event instanceof CustomEvent ? (event.detail as User | null | undefined) : undefined;
      setUser(updatedUser ?? getUser());
    };

    syncUser();
    window.addEventListener(AUTH_USER_UPDATED_EVENT, syncUser);
    window.addEventListener('storage', syncUser);

    return () => {
      window.removeEventListener(AUTH_USER_UPDATED_EVENT, syncUser);
      window.removeEventListener('storage', syncUser);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadInvoices = async () => {
      setInvoiceLoading(true);
      setInvoiceError(null);

      try {
        const invoices = await fetchAllInvoiceRecords();
        if (!cancelled) {
          setInvoiceSummary(getInvoiceSummary(invoices));
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load treasury invoice queue:', error);
          setInvoiceSummary(EMPTY_INVOICE_SUMMARY);
          setInvoiceError('The settlement queue could not be loaded.');
        }
      } finally {
        if (!cancelled) {
          setInvoiceLoading(false);
        }
      }
    };

    void loadInvoices();

    return () => {
      cancelled = true;
    };
  }, []);

  const displayName = getUserDisplayName(user);
  const priorityInvoice = invoiceSummary.priorityInvoice;
  const priorityWindow = priorityInvoice
    ? getSettlementWindow(getDaysUntilDue(priorityInvoice.dueDate))
    : null;
  const queueRows = invoiceSummary.settlementQueue.filter((invoice) => invoice.id !== priorityInvoice?.id);
  const preferredSettlementCurrency = user?.preferred_currency?.trim().toUpperCase() || 'NGN';
  const commandHeadline = getCommandHeadline(invoiceSummary);
  const commandNarrative = getCommandNarrative(invoiceSummary);

  useEffect(() => {
    if (!priorityInvoice || !priorityInvoice.currency || !priorityInvoice.amount) {
      setRecommendation(null);
      setRecommendationLoading(false);
      setRecommendationError(null);
      return;
    }

    let cancelled = false;

    const loadRecommendation = async () => {
      setRecommendationLoading(true);
      setRecommendationError(null);

      try {
        const nextRecommendation = await fetchRecommendation(
          priorityInvoice.currency,
          preferredSettlementCurrency,
          priorityInvoice.amount,
        );

        if (!cancelled) {
          setRecommendation(nextRecommendation);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load dashboard recommendation:', error);
          setRecommendation(null);
          setRecommendationError('Recommendation guidance is unavailable right now.');
        }
      } finally {
        if (!cancelled) {
          setRecommendationLoading(false);
        }
      }
    };

    void loadRecommendation();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferredSettlementCurrency, priorityInvoice?.amount, priorityInvoice?.currency, priorityInvoice?.id]);

  return (
    <div className={styles.page}>
      <RecommendationPanel
        recommendation={recommendation}
        loading={recommendationLoading}
        error={recommendationError ? new Error(recommendationError) : null}
        primaryActionHref={priorityInvoice ? `/invoice-generator/review?id=${priorityInvoice.id}` : '/invoice-generator'}
        primaryActionLabel={priorityInvoice ? 'Open settlement review' : 'Create an invoice'}
        compact={false}
      />

      <section className={styles.commandHeader}>
        <div className={styles.commandStory}>
          <span className={styles.commandTag}>Treasury Terminal</span>
          <h1 className={styles.commandHeadline}>Welcome back, {displayName}. {commandHeadline}</h1>
          <p className={styles.commandNarrative}>{commandNarrative}</p>

          <div className={styles.commandActions}>
            <Link href="#settlement-deck" className={styles.primaryAction}>
              Review queue
            </Link>
          </div>

          <div className={styles.deskMetrics}>
            <article className={styles.metricCell}>
              <span className={styles.metricLabel}>Open queue</span>
              <strong className={styles.metricValue}>{invoiceLoading ? '...' : invoiceSummary.openCount}</strong>
              <p className={styles.metricHint}>
                {invoiceLoading
                  ? 'Loading settlement lanes...'
                  : `${invoiceSummary.currencyCount} active currency lane${invoiceSummary.currencyCount === 1 ? '' : 's'}`}
              </p>
            </article>

            <article className={styles.metricCell}>
              <span className={styles.metricLabel}>Active window</span>
              <strong className={styles.metricValue}>
                {invoiceLoading ? '...' : invoiceSummary.dueTodayCount + invoiceSummary.overdueCount}
              </strong>
              <p className={styles.metricHint}>
                {invoiceLoading
                  ? 'Evaluating due windows...'
                  : `${invoiceSummary.dueTodayCount} due today, ${invoiceSummary.overdueCount} overdue`}
              </p>
            </article>

            <article className={styles.metricCell}>
              <span className={styles.metricLabel}>Largest exposure</span>
              <strong className={styles.metricValue}>
                {invoiceSummary.largestOpenInvoice
                  ? formatCurrency(invoiceSummary.largestOpenInvoice.amount, invoiceSummary.largestOpenInvoice.currency)
                  : '---'}
              </strong>
              <p className={styles.metricHint}>
                {invoiceSummary.largestOpenInvoice
                  ? `${invoiceSummary.largestOpenInvoice.clientName}${invoiceSummary.largestOpenInvoice.isSeeded ? ' [Seeded]' : ''}`
                  : 'No open receivable yet'}
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className={styles.workbench}>
        <section id="settlement-deck" className={styles.settlementDeck}>
          <div className={styles.sectionHeader}>
            <div>
              <span className={styles.sectionTag}>Priority Ledger</span>
              <h2 className={styles.sectionTitle}>Open settlements</h2>
              <p className={styles.sectionDescription}>
                Ranked by urgency, due date, and exposure so the next move stays obvious.
              </p>
            </div>

            <div className={styles.sectionAside}>
              <span>Current focus</span>
              <strong>{priorityWindow?.label ?? 'Nothing urgent'}</strong>
            </div>
          </div>

          {invoiceLoading ? (
            <div className={styles.emptyState}>Loading the settlement desk...</div>
          ) : invoiceSummary.settlementQueue.length === 0 ? (
            <div className={styles.emptyState}>{invoiceError ?? 'Open receivables will surface here once invoices are issued.'}</div>
          ) : (
            <div className={styles.settlementGrid}>
              {priorityInvoice && priorityWindow && (
                <article className={styles.primaryBrief}>
                  <div className={styles.briefTop}>
                    <span className={styles.briefTag}>Primary settlement brief</span>
                    <span className={`${styles.briefUrgency} ${styles[priorityWindow.tone]}`}>
                      {priorityWindow.label}
                    </span>
                  </div>

                  <div className={styles.briefAmount}>
                    {formatCurrency(priorityInvoice.amount, priorityInvoice.currency)}
                  </div>

                  <div className={styles.briefIdentity}>
                    <span className={styles.briefAvatar}>{getClientInitials(priorityInvoice.clientName)}</span>
                    <div className={styles.briefIdentityCopy}>
                      <strong>{priorityInvoice.clientName} {priorityInvoice.isSeeded && <span style={{ color: '#d97706', fontSize: '0.85em', fontWeight: 'normal' }}>[Seeded]</span>}</strong>
                      <p>{priorityInvoice.invoiceNumber}</p>
                    </div>
                  </div>

                  <p className={styles.briefNote}>{priorityWindow.note}</p>

                  <div className={styles.briefGrid}>
                    <div className={styles.briefStat}>
                      <span className={styles.briefStatLabel}>Issue date</span>
                      <strong className={styles.briefStatValue}>{formatInvoiceDate(priorityInvoice.issueDate)}</strong>
                    </div>

                    <div className={styles.briefStat}>
                      <span className={styles.briefStatLabel}>Due date</span>
                      <strong className={styles.briefStatValue}>{formatInvoiceDate(priorityInvoice.dueDate)}</strong>
                    </div>

                    <div className={styles.briefStat}>
                      <span className={styles.briefStatLabel}>Status</span>
                      <strong className={styles.briefStatValue}>{priorityInvoice.status}</strong>
                    </div>

                    <div className={styles.briefStat}>
                      <span className={styles.briefStatLabel}>Settlement lane</span>
                      <strong className={styles.briefStatValue}>{priorityInvoice.currency}</strong>
                    </div>
                  </div>

                  {invoiceSummary.largestOpenInvoice && invoiceSummary.largestOpenInvoice.id !== priorityInvoice.id && (
                    <p className={styles.briefSubline}>
                      Largest exposure elsewhere: {formatCurrency(invoiceSummary.largestOpenInvoice.amount, invoiceSummary.largestOpenInvoice.currency)} for {invoiceSummary.largestOpenInvoice.clientName}.
                    </p>
                  )}
                </article>
              )}

              <div className={styles.queuePanel}>
                <div className={styles.queueHeader}>
                  <div>
                    <span className={styles.queueTag}>Priority queue</span>
                    <h3 className={styles.queueTitle}>Ranked by urgency</h3>
                  </div>
                  <span className={styles.queueMeta}>{invoiceSummary.openCount} open</span>
                </div>

                <div className={styles.queueList}>
                  {queueRows.length === 0 ? (
                    <div className={styles.emptyState}>Only one settlement is active right now.</div>
                  ) : (
                    queueRows.map((invoice) => {
                      const settlementWindow = getSettlementWindow(getDaysUntilDue(invoice.dueDate));

                      return (
                        <article key={invoice.id} className={styles.queueRow}>
                          <div className={styles.queueIdentity}>
                            <span className={styles.queueAvatar}>{getClientInitials(invoice.clientName)}</span>
                            <div className={styles.queueCopy}>
                              <div className={styles.queueNameRow}>
                                <strong>{invoice.clientName} {invoice.isSeeded && <span style={{ color: '#d97706', fontSize: '0.85em', fontWeight: 'normal' }}>[Seeded]</span>}</strong>
                                {invoice.id === invoiceSummary.largestOpenInvoice?.id && (
                                  <span className={styles.queueFlag}>Largest</span>
                                )}
                              </div>
                              <p>{invoice.invoiceNumber}</p>
                            </div>
                          </div>

                          <div className={styles.queueAmount}>
                            <span className={styles.queueAmountLabel}>Amount</span>
                            <strong className={styles.queueAmountValue}>
                              {formatCurrency(invoice.amount, invoice.currency)}
                            </strong>
                          </div>

                          <div className={styles.queueSchedule}>
                            <span className={styles.queueScheduleLabel}>Window</span>
                            <strong className={`${styles.queueDueValue} ${styles[settlementWindow.tone]}`}>
                              {settlementWindow.label}
                            </strong>
                            <small>{formatInvoiceDate(invoice.dueDate)}</small>
                          </div>

                          <span className={`${styles.queueStatus} ${styles[invoice.status.toLowerCase()] ?? styles.pending}`}>
                            {invoice.status}
                          </span>
                        </article>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      </section>

      <section className={styles.systemDeck}>
        <section className={styles.railPanel}>
          <div className={styles.railHeader}>
            <div>
              <span className={styles.railTag}>Action Deck</span>
              <h3 className={styles.railTitle}>Fast moves</h3>
            </div>
            <p className={styles.railSubtitle}>Shortcuts</p>
          </div>

          <div className={styles.commandList}>
            {QUICK_ACTIONS.map((action) => (
              <Link key={action.href} href={action.href} className={styles.commandCard}>
                <div>
                  <strong className={styles.commandCardTitle}>{action.label}</strong>
                  <p className={styles.commandCardDetail}>{action.detail}</p>
                </div>
                <span className={styles.commandCardArrow}>Open</span>
              </Link>
            ))}
          </div>
        </section>
      </section>
    </div>
  );
}
