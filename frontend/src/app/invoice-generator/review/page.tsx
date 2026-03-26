'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './page.module.css';
import { fetchRealFXRate, fetchRealFXRateOnDate } from '@/lib/api/fx';
import { fetchRecommendation } from '@/lib/api/recommendation';
import { getPreferredCurrency, getUser, User } from '@/lib/api/auth';
import client from '@/lib/api/client';
import { formatApiError } from '@/lib/api/errors';
import { hasConnectedIntegration } from '@/lib/api/integrations';
import { Recommendation, getActionDisplayText } from '@/lib/types/recommendation';
import {
  BackendInvoiceRecord,
  InvoiceEditorState,
  InvoiceRecord,
  buildInvoiceEmailMessage,
  buildInvoiceEmailSubject,
  buildInvoicePrintHtml,
  calculateInvoiceTotals,
  fetchInvoiceRecord,
  formatCurrency,
  formatDisplayDate,
  mapBackendInvoice,
  mapInvoiceRecordToDraft,
  saveInvoiceDraft,
  updateInvoiceRecord,
} from '@/lib/invoices/editor';

function formatDateTime(value: string): string {
  if (!value) {
    return 'Not available';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function mergeRecordWithDraft(record: InvoiceRecord, preferredCurrency: string): InvoiceEditorState {
  const nextDraft = mapInvoiceRecordToDraft(record);
  nextDraft.settlementCurrency = preferredCurrency;
  return nextDraft;
}

function getRecommendationTitle(recommendation: Recommendation): string {
  if (recommendation.status === 'provisional_data') {
    return `${getActionDisplayText(recommendation.action)} (Intraday Signal)`;
  }
  if (recommendation.status === 'insufficient_data') {
    return 'Collecting Local History';
  }
  if (recommendation.status === 'limited_data') {
    return `${getActionDisplayText(recommendation.action)} (Early Signal)`;
  }
  return getActionDisplayText(recommendation.action);
}

function getRecommendationSupportText(recommendation: Recommendation): string {
  if (recommendation.historyQuality === 'full') {
    return `${recommendation.realDataPoints} stored market closes support this view.`;
  }

  if (recommendation.historyQuality === 'candle_fallback') {
    return `Using stored intraday candles as a provisional fallback because only ${recommendation.dataPoints} stored daily close${recommendation.dataPoints === 1 ? ' is' : 's are'} available locally.`;
  }

  return `History quality: ${recommendation.historyQuality.replace('_', ' ')} (${recommendation.realDataPoints} real, ${recommendation.syntheticDataPoints} seeded).`;
}

export default function InvoiceReviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const invoiceId = searchParams.get('id');

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [invoice, setInvoice] = useState<InvoiceRecord | null>(null);
  const [draft, setDraft] = useState<InvoiceEditorState | null>(null);
  const [fxRate, setFxRate] = useState<number | null>(null);
  const [rateChange24h, setRateChange24h] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [generatingLink, setGeneratingLink] = useState(false);
  const [linkError, setLinkError] = useState('');
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [recommendationLoading, setRecommendationLoading] = useState(false);
  const [recommendationError, setRecommendationError] = useState('');
  const [submittingAction, setSubmittingAction] = useState<'draft' | 'sent' | null>(null);
  const [hasConnectedPaymentProvider, setHasConnectedPaymentProvider] = useState(false);
  const [providerStatusLoading, setProviderStatusLoading] = useState(true);
  const [copyLinkStatus, setCopyLinkStatus] = useState<'idle' | 'copied'>('idle');

  useEffect(() => {
    let isActive = true;

    const loadReview = async () => {
      const currentUserValue = getUser();
      const preferredCurrency = getPreferredCurrency(currentUserValue);
      setCurrentUser(currentUserValue);

      if (!invoiceId) {
        if (isActive) {
          setError('No invoice was selected for review.');
          setLoading(false);
        }
        return;
      }

      try {
        const record = await fetchInvoiceRecord(invoiceId);
        const nextDraft = mergeRecordWithDraft(record, preferredCurrency);

        if (!isActive) {
          return;
        }

        setInvoice(record);
        setDraft(nextDraft);
        saveInvoiceDraft(nextDraft);
      } catch (loadError: unknown) {
        if (isActive) {
          setError(formatApiError(loadError, 'Unable to load this invoice review.'));
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    void loadReview();

    return () => {
      isActive = false;
    };
  }, [invoiceId]);

  useEffect(() => {
    let isActive = true;

    const loadIntegrationStatus = async () => {
      try {
        const result = await hasConnectedIntegration();
        if (isActive) {
          setHasConnectedPaymentProvider(result);
        }
      } catch {
        if (isActive) {
          setHasConnectedPaymentProvider(false);
        }
      } finally {
        if (isActive) {
          setProviderStatusLoading(false);
        }
      }
    };

    void loadIntegrationStatus();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!draft?.invoiceCurrency || !draft.settlementCurrency) {
      setFxRate(null);
      setRateChange24h(null);
      return;
    }

    if (draft.invoiceCurrency === draft.settlementCurrency) {
      setFxRate(1);
      setRateChange24h(0);
      return;
    }

    let isActive = true;

    const loadFXData = async () => {
      try {
        const { rate } = await fetchRealFXRate(draft.invoiceCurrency, draft.settlementCurrency);
        if (!isActive) {
          return;
        }

        setFxRate(rate);

        // Compare against a stored point from two days ago so the local history
        // still supports a stable short-term change view while it backfills.
        const previousDay = new Date();
        previousDay.setDate(previousDay.getDate() - 2);
        const previousDayStr = previousDay.toISOString().slice(0, 10);
        const { rate: previousRateValue } = await fetchRealFXRateOnDate(
          draft.invoiceCurrency,
          draft.settlementCurrency,
          previousDayStr,
        );
        const previousRate = previousRateValue || rate;
        const change = ((rate - previousRate) / previousRate) * 100;

        if (isActive) {
          setRateChange24h(Math.round(change * 100) / 100);
        }
      } catch {
        if (isActive) {
          setFxRate(null);
          setRateChange24h(null);
        }
      }
    };

    void loadFXData();

    return () => {
      isActive = false;
    };
  }, [draft?.invoiceCurrency, draft?.settlementCurrency]);

  const totals = useMemo(
    () => (draft ? calculateInvoiceTotals(draft) : null),
    [draft],
  );

  const emailSubject = useMemo(
    () => (invoice ? buildInvoiceEmailSubject(invoice) : ''),
    [invoice],
  );

  const emailMessage = useMemo(
    () => (invoice ? buildInvoiceEmailMessage(invoice) : ''),
    [invoice],
  );

  const businessName = currentUser?.company_name?.trim() || 'Your Business Name';
  const preferredSettlementCurrency = getPreferredCurrency(currentUser);
  const invoiceCurrency = draft?.invoiceCurrency ?? '';
  const settlementCurrency = draft?.settlementCurrency ?? '';
  const invoiceTotal = totals?.total ?? 0;

  useEffect(() => {
    if (!invoiceCurrency || !settlementCurrency || invoiceTotal <= 0) {
      setRecommendation(null);
      setRecommendationLoading(false);
      setRecommendationError('');
      return;
    }

    let isActive = true;

    const loadRecommendation = async () => {
      setRecommendationLoading(true);
      setRecommendationError('');

      try {
        const nextRecommendation = await fetchRecommendation(
          invoiceCurrency,
          settlementCurrency,
          invoiceTotal,
        );

        if (isActive) {
          setRecommendation(nextRecommendation);
        }
      } catch (recommendationLoadError) {
        if (isActive) {
          console.error('Failed to fetch invoice recommendation:', recommendationLoadError);
          setRecommendation(null);
          setRecommendationError(
            formatApiError(recommendationLoadError, 'AI recommendation is unavailable right now.'),
          );
        }
      } finally {
        if (isActive) {
          setRecommendationLoading(false);
        }
      }
    };

    void loadRecommendation();

    return () => {
      isActive = false;
    };
  }, [invoiceCurrency, invoiceTotal, settlementCurrency]);

  useEffect(() => {
    if (copyLinkStatus !== 'copied') {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCopyLinkStatus('idle');
    }, 2200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [copyLinkStatus]);

  const persistInvoiceStatus = async (status: 'draft' | 'sent') => {
    if (!invoice || !draft) {
      return;
    }

    if (status === 'sent' && invoice.status === 'sent') {
      setError('');
      setSuccess('This invoice has already been sent.');
      return;
    }

    setSubmittingAction(status);
    setError('');
    setSuccess('');

    try {
      const updatedRecord = await updateInvoiceRecord(invoice.id, draft, status);
      const nextDraft = mergeRecordWithDraft(updatedRecord, preferredSettlementCurrency);

      setInvoice(updatedRecord);
      setDraft(nextDraft);
      saveInvoiceDraft(nextDraft);
      setSuccess(status === 'draft' ? 'Invoice saved as draft.' : 'Invoice sent successfully.');
    } catch (submitError: unknown) {
      setError(formatApiError(submitError, 'Unable to update this invoice.'));
    } finally {
      setSubmittingAction(null);
    }
  };

  const handleEdit = () => {
    if (draft) {
      saveInvoiceDraft(draft);
    }
    router.push('/invoice-generator');
  };

  const handleDownloadPdf = () => {
    if (!draft) {
      return;
    }

    const printableWindow = window.open('', '_blank', 'noopener,noreferrer');
    if (!printableWindow) {
      setError('Unable to open the print window. Please allow popups and try again.');
      return;
    }

    printableWindow.document.write(buildInvoicePrintHtml(draft, businessName, currentUser?.email || ''));
    printableWindow.document.close();
    printableWindow.focus();
    printableWindow.print();
  };

  const handleGeneratePaymentLink = async () => {
    if (!invoice) return;
    if (!hasConnectedPaymentProvider) {
      setLinkError('Connect Paystack, Flutterwave, or Interswitch in Settings before generating a payment link.');
      return;
    }
    setGeneratingLink(true);
    setLinkError('');
    setError('');

    try {
      const response = await client.post<BackendInvoiceRecord>(
        `/invoices/${invoice.id}/payment-link`
      );
      const updatedRecord = mapBackendInvoice(response.data);
      const nextDraft = mergeRecordWithDraft(updatedRecord, preferredSettlementCurrency);
      setInvoice(updatedRecord);
      setDraft(nextDraft);
      saveInvoiceDraft(nextDraft);
      setCopyLinkStatus('idle');
      setSuccess('Payment link generated successfully.');
    } catch (linkErr: unknown) {
      setLinkError(formatApiError(linkErr, 'Failed to generate payment link. Please try again.'));
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleCopyPaymentLink = async () => {
    if (!invoice?.paymentLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(invoice.paymentLink);
      setCopyLinkStatus('copied');
      setLinkError('');
    } catch {
      setCopyLinkStatus('idle');
      setLinkError('Unable to copy the payment link right now. Please copy it manually.');
    }
  };

  const settlementEstimate = totals && fxRate !== null
    ? formatCurrency(totals.total * fxRate, draft?.settlementCurrency || invoice?.currency || 'USD')
    : '---';
  const rateLabel = fxRate !== null ? fxRate.toFixed(4) : '---';
  const rateChangeLabel = rateChange24h !== null
    ? `${rateChange24h >= 0 ? '+' : ''}${rateChange24h.toFixed(2)}%`
    : '---';
  const statusLabel = invoice?.status ? invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1) : 'Draft';

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.breadcrumb}>
          <button type="button" className={styles.breadcrumbLink} onClick={handleEdit}>
            Back to Editor
          </button>
          <span>/</span>
          <span>{invoice?.invoiceNumber || 'Invoice Review'}</span>
        </div>

        <header className={styles.header}>
          <h1>Review Invoice</h1>
          <p>Review invoice details, confirm delivery, and manage the saved invoice state.</p>
        </header>

        {(error || success) && (
          <div className={`${styles.message} ${error ? styles.errorMessage : styles.successMessage}`}>
            {error || success}
          </div>
        )}

        {loading ? (
          <section className={styles.card}>
            <p>Loading invoice review...</p>
          </section>
        ) : !invoice || !draft || !totals ? (
          <section className={styles.card}>
            <p>Invoice review is not available.</p>
          </section>
        ) : (
          <div className={styles.layout}>
            <div className={styles.main}>
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h3>Invoice Preview</h3>
                  <div className={styles.cardActions}>
                    <button type="button" className={styles.linkButton} onClick={handleEdit}>
                      Edit
                    </button>
                    <button type="button" className={styles.linkButton} onClick={handleDownloadPdf}>
                      Print / PDF
                    </button>
                  </div>
                </div>

                <div className={styles.preview}>
                  <div className={styles.previewHeader}>
                    <div>
                      <strong>{businessName}</strong>
                      <p>{currentUser?.email || 'your@email.com'}</p>
                    </div>
                    <div className={styles.previewHeaderRight}>
                      <h4>INVOICE</h4>
                      <span>#{invoice.invoiceNumber}</span>
                      <span className={invoice.status === 'sent' ? styles.badgeSent : styles.badgeDraft}>
                        {statusLabel}
                      </span>
                    </div>
                  </div>

                  <div className={styles.previewBody}>
                    <div>
                      <h5>Bill From</h5>
                      <p>{businessName}</p>
                      <p>{currentUser?.email || 'your@email.com'}</p>
                      <p>{invoice.address || 'Business address'}</p>
                      <p>{invoice.country || 'Country'}</p>
                    </div>
                    <div>
                      <h5>Bill To</h5>
                      <p>{invoice.clientName}</p>
                      <p>{invoice.clientCompany || 'Client company'}</p>
                      <p>{invoice.clientEmail}</p>
                      <p>{invoice.address || 'Client address'}</p>
                    </div>
                  </div>

                  <div className={styles.metaGrid}>
                    <div>
                      <span>Issue Date</span>
                      <strong>{formatDisplayDate(invoice.issueDate)}</strong>
                    </div>
                    <div>
                      <span>Due Date</span>
                      <strong>{formatDisplayDate(invoice.dueDate)}</strong>
                    </div>
                    <div>
                      <span>Terms</span>
                      <strong>{draft.paymentTerms}</strong>
                    </div>
                    <div>
                      <span>Currency</span>
                      <strong>{invoice.currency}</strong>
                    </div>
                  </div>

                  <div className={styles.previewTable}>
                    <div className={styles.previewTableHead}>Description</div>
                    <div className={styles.previewTableHead}>Qty</div>
                    <div className={styles.previewTableHead}>Rate</div>
                    <div className={styles.previewTableHead}>Amount</div>
                    {invoice.items.map((item) => (
                      <div key={item.id} className={styles.previewRow}>
                        <span>{item.description}</span>
                        <span>{item.quantity}</span>
                        <span>{formatCurrency(item.unitPrice, invoice.currency)}</span>
                        <span>{formatCurrency(item.quantity * item.unitPrice, invoice.currency)}</span>
                      </div>
                    ))}
                  </div>

                  <div className={styles.previewTotals}>
                    <div><span>Subtotal</span><strong>{formatCurrency(totals.subtotal, invoice.currency)}</strong></div>
                    <div><span>Discount</span><strong>-{formatCurrency(totals.discountAmount, invoice.currency)}</strong></div>
                    <div><span>Tax</span><strong>{formatCurrency(totals.taxAmount, invoice.currency)}</strong></div>
                    <div className={styles.total}><span>Total</span><strong>{formatCurrency(totals.total, invoice.currency)}</strong></div>
                  </div>

                  <div className={styles.previewNote}>
                    <h5>Notes & Payment Instructions</h5>
                    <p>{draft.notes || 'No additional notes were provided for this invoice.'}</p>
                  </div>
                </div>
              </section>

              <section className={styles.card}>
                <h3>FX Rate Details</h3>
                <div className={styles.fxDetails}>
                  <div>
                    <span>Current Rate</span>
                    <strong>{draft.invoiceCurrency}/{draft.settlementCurrency} {rateLabel}</strong>
                  </div>
                  <div>
                    <span>24h Change</span>
                    <strong className={rateChange24h !== null && rateChange24h >= 0 ? styles.green : styles.red}>
                      {rateChangeLabel}
                    </strong>
                  </div>
                  <div>
                    <span>Settlement Estimate</span>
                    <strong>{settlementEstimate}</strong>
                  </div>
                  <div>
                    <span>Optimal Window</span>
                    <strong>{recommendation?.optimalWindow || (recommendationLoading ? 'Analysing...' : 'Unavailable')}</strong>
                  </div>
                </div>
                <div className={styles.recommendationBox}>
                  {recommendationLoading ? (
                    <p className={styles.recommendationMuted}>Analysing live market data for this invoice...</p>
                  ) : recommendation ? (
                    <>
                      <div className={styles.recommendationHeader}>
                        <div>
                          <p className={styles.recommendationEyebrow}>AI Recommendation</p>
                          <strong>{getRecommendationTitle(recommendation)}</strong>
                        </div>
                        <span className={styles.recommendationBadge}>
                          {Math.round(recommendation.confidence * 100)}% confidence
                        </span>
                      </div>
                      <p className={styles.recommendationText}>{recommendation.explanation}</p>
                      <p className={styles.recommendationMuted}>
                        {getRecommendationSupportText(recommendation)}
                      </p>
                      <div className={styles.recommendationFactors}>
                        {recommendation.factors?.map((factor) => (
                          <div key={factor.name} className={styles.recommendationFactor}>
                            <span className={`${styles.recommendationDot} ${
                              factor.impact === 'positive'
                                ? styles.recommendationPositive
                                : factor.impact === 'negative'
                                  ? styles.recommendationNegative
                                  : styles.recommendationNeutral
                            }`}></span>
                            <div>
                              <strong>{factor.name}</strong>
                              <p>{factor.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className={styles.recommendationMuted}>
                      {recommendationError || 'No recommendation available for this invoice yet.'}
                    </p>
                  )}
                </div>
              </section>

              <section className={styles.card}>
                <h3>Audit Trail</h3>
                <div className={styles.audit}>
                  <div>
                    <strong>Created</strong>
                    <span>{formatDateTime(invoice.createdAt)}</span>
                  </div>
                  <div>
                    <strong>Last Updated</strong>
                    <span>{formatDateTime(invoice.updatedAt)}</span>
                  </div>
                  <div>
                    <strong>Status</strong>
                    <span>{statusLabel}</span>
                  </div>
                </div>
              </section>
            </div>

            <aside className={styles.sidebar}>
              <section className={styles.card}>
                <h3>Email Delivery</h3>
                <div className={styles.formGroup}>
                  <label>Recipient</label>
                  <input className={styles.input} value={invoice.clientEmail} readOnly />
                </div>
                <div className={styles.formGroup}>
                  <label>Subject</label>
                  <input className={styles.input} value={emailSubject} readOnly />
                </div>
                <div className={styles.formGroup}>
                  <label>Message Preview</label>
                  <textarea
                    className={styles.textarea}
                    value={invoice?.paymentLink
                      ? `${emailMessage}\n\nPay Now: ${invoice.paymentLink}`
                      : emailMessage
                    }
                    readOnly
                  />
                </div>
                <p className={styles.helperText}>Invoice delivery uses the backend invoice email template.</p>
              </section>

              <section className={styles.card}>
                <h3>Invoice Summary</h3>
                <div className={styles.summaryList}>
                  <div><span>Invoice Number</span><strong>{invoice.invoiceNumber}</strong></div>
                  <div><span>Client</span><strong>{invoice.clientName}</strong></div>
                  <div><span>Status</span><strong>{statusLabel}</strong></div>
                  <div><span>Total</span><strong>{formatCurrency(totals.total, invoice.currency)}</strong></div>
                </div>
              </section>

              {invoice && invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                <div className={styles.card}>
                  <h3>Payment Link</h3>
                  {invoice.paymentLink ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-3)', marginTop: 'var(--spacing-3)' }}>
                      <input
                        className={styles.input}
                        value={invoice.paymentLink}
                        readOnly
                        style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-primary)' }}
                      />
                      <button
                        type="button"
                        className={styles.secondary}
                        onClick={() => void handleCopyPaymentLink()}
                      >
                        {copyLinkStatus === 'copied' ? 'Link Copied Successfully' : 'Copy Link'}
                      </button>
                      {copyLinkStatus === 'copied' && (
                        <p
                          className={styles.helperText}
                          style={{ marginTop: 'var(--spacing-1)', color: 'var(--color-success)' }}
                          aria-live="polite"
                        >
                          Link copied successfully.
                        </p>
                      )}
                    </div>
                  ) : (
                    <>
                      {linkError && (
                        <div className={`${styles.message} ${styles.errorMessage}`} style={{ marginTop: 'var(--spacing-3)' }}>
                          {linkError}
                        </div>
                      )}
                      {!providerStatusLoading && !hasConnectedPaymentProvider && (
                        <div
                          className={`${styles.message} ${styles.errorMessage}`}
                          style={{ marginTop: 'var(--spacing-3)' }}
                        >
                          Connect a payment provider in <Link href="/settings?section=integrations">Settings</Link> before generating a payment link.
                        </div>
                      )}
                      <button
                        type="button"
                        className={styles.primary}
                        onClick={handleGeneratePaymentLink}
                        disabled={generatingLink || providerStatusLoading || !hasConnectedPaymentProvider}
                        style={{ marginTop: 'var(--spacing-3)' }}
                      >
                        {providerStatusLoading
                          ? 'Checking Providers...'
                          : generatingLink
                            ? 'Generating...'
                            : 'Generate Payment Link'}
                      </button>
                    </>
                  )}
                </div>
              )}

              <section className={styles.card}>
                <h3>Actions</h3>
                <div className={styles.actionGroup}>
                  <button
                    type="button"
                    className={styles.primary}
                    onClick={() => void persistInvoiceStatus('sent')}
                    disabled={submittingAction !== null || invoice.status === 'sent'}
                  >
                    {invoice.status === 'sent'
                      ? 'Already Sent'
                      : submittingAction === 'sent'
                        ? 'Sending...'
                        : 'Send Invoice'}
                  </button>
                  <button
                    type="button"
                    className={styles.secondary}
                    onClick={handleDownloadPdf}
                    disabled={submittingAction !== null}
                  >
                    Download PDF
                  </button>
                  <button
                    type="button"
                    className={styles.tertiary}
                    onClick={() => void persistInvoiceStatus('draft')}
                    disabled={submittingAction !== null}
                  >
                    {submittingAction === 'draft' ? 'Saving...' : 'Save as Draft'}
                  </button>
                </div>
              </section>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
