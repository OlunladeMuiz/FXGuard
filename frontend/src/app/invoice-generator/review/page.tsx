'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './page.module.css';
import { fetchRealFXRate, fetchRealFXRateOnDate } from '@/lib/api/fx';
import { getUser, User } from '@/lib/api/auth';
import { formatApiError } from '@/lib/api/errors';
import {
  InvoiceEditorState,
  InvoiceRecord,
  buildInvoiceEmailMessage,
  buildInvoiceEmailSubject,
  buildInvoicePrintHtml,
  calculateInvoiceTotals,
  fetchInvoiceRecord,
  formatCurrency,
  formatDisplayDate,
  loadInvoiceDraft,
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

function mergeRecordWithDraft(record: InvoiceRecord, storedDraft: InvoiceEditorState): InvoiceEditorState {
  const nextDraft = mapInvoiceRecordToDraft(record);

  if (storedDraft.persistedInvoiceId === record.id && storedDraft.settlementCurrency) {
    nextDraft.settlementCurrency = storedDraft.settlementCurrency;
  }

  return nextDraft;
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
  const [submittingAction, setSubmittingAction] = useState<'draft' | 'sent' | null>(null);

  useEffect(() => {
    let isActive = true;

    const loadReview = async () => {
      setCurrentUser(getUser());

      if (!invoiceId) {
        if (isActive) {
          setError('No invoice was selected for review.');
          setLoading(false);
        }
        return;
      }

      try {
        const storedDraft = loadInvoiceDraft();
        const record = await fetchInvoiceRecord(invoiceId);
        const nextDraft = mergeRecordWithDraft(record, storedDraft);

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
      const nextDraft = mergeRecordWithDraft(updatedRecord, draft);

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
                    <strong>Next 3-5 days</strong>
                  </div>
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
                  <textarea className={styles.textarea} value={emailMessage} readOnly />
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
