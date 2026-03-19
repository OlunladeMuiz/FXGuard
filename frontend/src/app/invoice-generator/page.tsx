'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import { fetchRealFXRate, fetchRealFXRateOnDate } from '@/lib/api/fx';
import { getUser, User } from '@/lib/api/auth';
import { formatApiError } from '@/lib/api/errors';
import {
  InvoiceEditorState,
  buildInvoicePrintHtml,
  calculateInvoiceTotals,
  createInvoiceLineItem,
  createInvoiceRecord,
  formatCurrency,
  formatDisplayDate,
  loadInvoiceDraft,
  mapInvoiceRecordToDraft,
  saveInvoiceDraft,
  updateInvoiceRecord,
} from '@/lib/invoices/editor';

const countries = [
  'United States',
  'United Kingdom',
  'Nigeria',
  'Canada',
  'Germany',
  'France',
];

const currencies = [
  { code: 'USD', label: 'USD - US Dollar' },
  { code: 'EUR', label: 'EUR - Euro' },
  { code: 'GBP', label: 'GBP - British Pound' },
  { code: 'NGN', label: 'NGN - Nigerian Naira' },
];

const paymentTerms = ['Net 7', 'Net 14', 'Net 30', 'Net 45'];

export default function InvoiceGeneratorPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [draft, setDraft] = useState<InvoiceEditorState | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  const [fxRate, setFxRate] = useState<number | null>(null);
  const [rateChange, setRateChange] = useState<number | null>(null);
  const [loadingRate, setLoadingRate] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submittingAction, setSubmittingAction] = useState<'draft' | 'sent' | null>(null);

  useEffect(() => {
    const user = getUser();
    setCurrentUser(user);
    setDraft(loadInvoiceDraft());
    setDraftReady(true);
  }, []);

  useEffect(() => {
    if (!draftReady || !draft) {
      return;
    }

    saveInvoiceDraft(draft);
  }, [draft, draftReady]);

  useEffect(() => {
    const loadFXData = async () => {
      if (!draft) {
        setFxRate(null);
        setRateChange(null);
        setLoadingRate(true);
        return;
      }

      if (!draft.invoiceCurrency || !draft.settlementCurrency) {
        setFxRate(null);
        setRateChange(null);
        setLoadingRate(false);
        return;
      }

      if (draft.invoiceCurrency === draft.settlementCurrency) {
        setFxRate(1);
        setRateChange(0);
        setLoadingRate(false);
        return;
      }

      setLoadingRate(true);

      try {
        const { rate } = await fetchRealFXRate(draft.invoiceCurrency, draft.settlementCurrency);
        setFxRate(rate);

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 2);
        const yesterdayStr = yesterday.toISOString().slice(0, 10);
        const { rate: yesterdayRateValue } = await fetchRealFXRateOnDate(
          draft.invoiceCurrency,
          draft.settlementCurrency,
          yesterdayStr,
        );
        const yesterdayRate = yesterdayRateValue || rate;
        const change = ((rate - yesterdayRate) / yesterdayRate) * 100;
        setRateChange(Math.round(change * 100) / 100);
      } catch (loadError) {
        console.error('Failed to fetch FX rate:', loadError);
        setFxRate(null);
        setRateChange(null);
      } finally {
        setLoadingRate(false);
      }
    };

    void loadFXData();
  }, [draft]);

  const totals = useMemo(
    () => (draft ? calculateInvoiceTotals(draft) : null),
    [draft],
  );
  const businessName = currentUser?.company_name?.trim() || 'Your Business Name';

  const updateDraft = <K extends keyof InvoiceEditorState>(field: K, value: InvoiceEditorState[K]) => {
    setDraft((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const updateLineItem = (itemId: string, field: 'description' | 'quantity' | 'unitPrice', value: string) => {
    setDraft((prev) => {
      if (!prev) {
        return prev;
      }

      return {
        ...prev,
        lineItems: prev.lineItems.map((item) => (
          item.id === itemId ? { ...item, [field]: value } : item
        )),
      };
    });
  };

  const addLineItem = () => {
    setDraft((prev) => {
      if (!prev) {
        return prev;
      }

      return {
        ...prev,
        lineItems: [...prev.lineItems, createInvoiceLineItem()],
      };
    });
  };

  const removeLineItem = (itemId: string) => {
    setDraft((prev) => {
      if (!prev) {
        return prev;
      }

      return {
        ...prev,
        lineItems:
          prev.lineItems.length > 1
            ? prev.lineItems.filter((item) => item.id !== itemId)
            : [createInvoiceLineItem()],
      };
    });
  };

  const validateDraft = (): string | null => {
    if (!draft) return 'Invoice draft is still loading.';
    if (!draft.clientName.trim()) return 'Client name is required.';
    if (!draft.clientEmail.trim()) return 'Client email is required.';
    if (!draft.invoiceNumber.trim()) return 'Invoice number is required.';
    if (!draft.issueDate) return 'Issue date is required.';
    if (!draft.dueDate) return 'Due date is required.';
    if (new Date(draft.dueDate) < new Date(draft.issueDate)) {
      return 'Due date cannot be earlier than issue date.';
    }

    const validItems = draft.lineItems.filter((item) => {
      return item.description.trim() && (Number.parseFloat(item.quantity) || 0) > 0 && (Number.parseFloat(item.unitPrice) || 0) > 0;
    });

    if (validItems.length === 0) {
      return 'Add at least one valid line item with description, quantity, and rate.';
    }

    return null;
  };

  const persistInvoice = async (status: 'draft' | 'sent') => {
    if (!draft || !totals) {
      setError('Invoice draft is still loading. Please try again.');
      setSuccess('');
      return;
    }

    const validationError = validateDraft();
    if (validationError) {
      setError(validationError);
      setSuccess('');
      return;
    }

    setSubmittingAction(status);
    setError('');
    setSuccess('');

    try {
      const record = draft.persistedInvoiceId
        ? await updateInvoiceRecord(draft.persistedInvoiceId, draft, status)
        : await createInvoiceRecord(draft, status);
      const nextDraft = mapInvoiceRecordToDraft(record);
      setDraft(nextDraft);
      saveInvoiceDraft(nextDraft);
      setSuccess(status === 'draft' ? 'Invoice draft saved successfully.' : 'Invoice sent successfully.');

      if (status === 'sent') {
        router.push(`/invoice-generator/review?id=${record.id}`);
      }
    } catch (submitError: unknown) {
      setError(formatApiError(submitError, 'Invoice action failed. Please try again.'));
    } finally {
      setSubmittingAction(null);
    }
  };

  const downloadPdf = () => {
    if (!draft || !totals) {
      setError('Invoice draft is still loading. Please try again.');
      return;
    }

    const printableWindow = window.open('', '_blank', 'noopener,noreferrer');
    if (!printableWindow) {
      setError('Unable to open print window. Please allow popups and try again.');
      return;
    }

    printableWindow.document.write(buildInvoicePrintHtml(draft, businessName, currentUser?.email || ''));
    printableWindow.document.close();
    printableWindow.focus();
    printableWindow.print();
  };

  const displayRate = fxRate ? fxRate.toFixed(4) : '---';
  const displayChange =
    rateChange !== null
      ? `${rateChange >= 0 ? '+' : ''}${rateChange.toFixed(2)}%`
      : '---';

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>Create New Invoice</h1>
          <p>Generate professional international invoices with optimized FX rates</p>
        </header>

        {(error || success) && (
          <div className={`${styles.message} ${error ? styles.errorMessage : styles.successMessage}`}>
            {error || success}
          </div>
        )}

        {!draftReady || !draft || !totals ? (
          <section className={styles.card}>
            <p>Loading invoice editor...</p>
          </section>
        ) : (
          <div className={styles.layout}>
            <div className={styles.formColumn}>
              <section className={styles.card}>
                <h3>Client Details</h3>
                <div className={styles.gridTwo}>
                  <div>
                    <label className={styles.label}>Client Name</label>
                    <input
                      className={styles.input}
                      placeholder="Enter client name"
                      value={draft.clientName}
                      onChange={(e) => updateDraft('clientName', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={styles.label}>Address</label>
                    <textarea
                      className={styles.addressInput}
                      placeholder="Street address, City, State/Province"
                      value={draft.address}
                      onChange={(e) => updateDraft('address', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={styles.label}>Company</label>
                    <input
                      className={styles.input}
                      placeholder="Company name"
                      value={draft.clientCompany}
                      onChange={(e) => updateDraft('clientCompany', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={styles.label}>Country</label>
                    <select
                      className={styles.select}
                      value={draft.country}
                      onChange={(e) => updateDraft('country', e.target.value)}
                    >
                      <option value="">Select country</option>
                      {countries.map((country) => (
                        <option key={country} value={country}>
                          {country}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={styles.label}>Email Address</label>
                    <input
                      className={styles.input}
                      placeholder="client@company.com"
                      value={draft.clientEmail}
                      onChange={(e) => updateDraft('clientEmail', e.target.value)}
                    />
                  </div>
                </div>
              </section>

              <section className={styles.card}>
                <h3>Invoice Details</h3>
                <div className={styles.gridFour}>
                  <div>
                    <label className={styles.label}>Invoice Number</label>
                    <input
                      className={styles.input}
                      value={draft.invoiceNumber}
                      onChange={(e) => updateDraft('invoiceNumber', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={styles.label}>Issue Date</label>
                    <input
                      type="date"
                      className={styles.input}
                      value={draft.issueDate}
                      onChange={(e) => updateDraft('issueDate', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={styles.label}>Due Date</label>
                    <input
                      type="date"
                      className={styles.input}
                      value={draft.dueDate}
                      onChange={(e) => updateDraft('dueDate', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={styles.label}>Payment Terms</label>
                    <select
                      className={styles.select}
                      value={draft.paymentTerms}
                      onChange={(e) => updateDraft('paymentTerms', e.target.value)}
                    >
                      {paymentTerms.map((term) => (
                        <option key={term} value={term}>
                          {term}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              <section className={styles.card}>
                <h3>Currency Settings</h3>
                <div className={styles.gridTwo}>
                  <div>
                    <label className={styles.label}>Invoice Currency</label>
                    <select
                      className={styles.select}
                      value={draft.invoiceCurrency}
                      onChange={(e) => updateDraft('invoiceCurrency', e.target.value)}
                    >
                      {currencies.map((currency) => (
                        <option key={currency.code} value={currency.code}>
                          {currency.label}
                        </option>
                      ))}
                    </select>
                    <span className={styles.helper}>
                      Current rate: 1 {draft.invoiceCurrency} = {loadingRate ? '...' : displayRate} {draft.settlementCurrency}
                    </span>
                  </div>
                  <div>
                    <label className={styles.label}>Settlement Currency</label>
                    <select
                      className={styles.select}
                      value={draft.settlementCurrency}
                      onChange={(e) => updateDraft('settlementCurrency', e.target.value)}
                    >
                      {currencies.map((currency) => (
                        <option key={currency.code} value={currency.code}>
                          {currency.label}
                        </option>
                      ))}
                    </select>
                    <span className={styles.helper}>For FX optimization tracking</span>
                  </div>
                </div>
              </section>

              <section className={styles.card}>
                <div className={styles.sectionHeader}>
                  <h3>Line Items</h3>
                  <button type="button" className={styles.addButton} onClick={addLineItem}>
                    + Add Item
                  </button>
                </div>
                <div className={styles.lineHeader}>
                  <span>Description</span>
                  <span>Qty</span>
                  <span>Rate</span>
                  <span>Amount</span>
                  <span>Action</span>
                </div>
                {draft.lineItems.map((item) => {
                  const quantity = Number.parseFloat(item.quantity) || 0;
                  const unitPrice = Number.parseFloat(item.unitPrice) || 0;
                  return (
                    <div key={item.id} className={styles.lineRow}>
                      <input
                        className={styles.input}
                        placeholder="Item description"
                        value={item.description}
                        onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                      />
                      <input
                        className={styles.input}
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(item.id, 'quantity', e.target.value)}
                      />
                      <input
                        className={styles.input}
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={item.unitPrice}
                        onChange={(e) => updateLineItem(item.id, 'unitPrice', e.target.value)}
                      />
                      <strong>{formatCurrency(quantity * unitPrice, draft.invoiceCurrency)}</strong>
                      <button type="button" className={styles.trash} onClick={() => removeLineItem(item.id)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </section>

              <section className={styles.cardSplit}>
                <div>
                  <h3>Tax & Discount</h3>
                  <div className={styles.gridTwo}>
                    <div>
                      <label className={styles.label}>Discount</label>
                      <div className={styles.inlineInput}>
                        <input
                          className={styles.input}
                          type="number"
                          min="0"
                          step="0.01"
                          value={draft.discount}
                          onChange={(e) => updateDraft('discount', e.target.value)}
                        />
                        <select
                          className={styles.select}
                          value={draft.discountType}
                          onChange={(e) => updateDraft('discountType', e.target.value as InvoiceEditorState['discountType'])}
                        >
                          <option value="percent">%</option>
                          <option value="fixed">{draft.invoiceCurrency}</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className={styles.label}>Tax Rate</label>
                      <div className={styles.taxInput}>
                        <input
                          className={styles.input}
                          type="number"
                          min="0"
                          step="0.01"
                          value={draft.taxRate}
                          onChange={(e) => updateDraft('taxRate', e.target.value)}
                        />
                        <span>%</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <h3>Invoice Total</h3>
                  <div className={styles.totalBox}>
                    <div><span>Subtotal</span><strong>{formatCurrency(totals.subtotal, draft.invoiceCurrency)}</strong></div>
                    <div><span>Discount</span><strong>-{formatCurrency(totals.discountAmount, draft.invoiceCurrency)}</strong></div>
                    <div><span>Tax</span><strong>{formatCurrency(totals.taxAmount, draft.invoiceCurrency)}</strong></div>
                    <div className={styles.totalRow}><span>Total</span><strong>{formatCurrency(totals.total, draft.invoiceCurrency)}</strong></div>
                  </div>
                </div>
              </section>

              <section className={styles.card}>
                <h3>Notes & Payment Instructions</h3>
                <textarea
                  className={styles.textarea}
                  placeholder="Add any additional notes, payment instructions, or terms..."
                  value={draft.notes}
                  onChange={(e) => updateDraft('notes', e.target.value)}
                />
              </section>

              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={() => void persistInvoice('draft')}
                  disabled={submittingAction !== null}
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  className={styles.success}
                  onClick={() => void persistInvoice('sent')}
                  disabled={submittingAction !== null}
                >
                  {submittingAction === 'sent' ? 'Sending...' : 'Send Invoice'}
                </button>
                <button
                  type="button"
                  className={styles.primary}
                  onClick={downloadPdf}
                >
                  Download PDF
                </button>
              </div>
            </div>

            <aside className={styles.previewColumn}>
              <section className={styles.card}>
                <div className={styles.previewHeader}>
                  <h3>Live Preview</h3>
                  <button type="button" className={styles.link} onClick={downloadPdf}>
                    Print / PDF
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
                      <span>{businessName}</span>
                    </div>
                    <div className={styles.previewInvoiceLabel}>
                      <strong>INVOICE</strong>
                      <span>{draft.invoiceNumber}</span>
                    </div>
                  </div>
                  <div className={styles.previewAddresses}>
                    <div>
                      <span className={styles.addressLabel}>FROM</span>
                      <strong>{businessName}</strong>
                      <span>{currentUser?.email || 'your@email.com'}</span>
                      <span>{draft.address || 'Business address'}</span>
                      <span>{draft.country || 'Country'}</span>
                    </div>
                    <div>
                      <span className={styles.addressLabel}>TO</span>
                      <strong>{draft.clientName || 'Client Name'}</strong>
                      <span>{draft.clientCompany || 'Company Name'}</span>
                      <span>{draft.clientEmail || 'client@email.com'}</span>
                      <span>{draft.address || 'Client Address'}</span>
                    </div>
                  </div>
                  <div className={styles.previewDates}>
                    <div>
                      <span>Issue Date</span>
                      <strong>{formatDisplayDate(draft.issueDate)}</strong>
                    </div>
                    <div>
                      <span>Due Date</span>
                      <strong>{formatDisplayDate(draft.dueDate)}</strong>
                    </div>
                  </div>
                  <div className={styles.previewTable}>
                    <div className={styles.previewTableHeader}>
                      <span>Description</span>
                      <span>Amount</span>
                    </div>
                    {draft.lineItems.filter((item) => item.description.trim()).map((item) => {
                      const quantity = Number.parseFloat(item.quantity) || 0;
                      const unitPrice = Number.parseFloat(item.unitPrice) || 0;
                      return (
                        <div key={item.id} className={styles.previewTableRow}>
                          <span>{item.description}</span>
                          <span>{formatCurrency(quantity * unitPrice, draft.invoiceCurrency)}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className={styles.previewTotals}>
                    <div><span>Subtotal</span><span>{formatCurrency(totals.subtotal, draft.invoiceCurrency)}</span></div>
                    <div><span>Tax</span><span>{formatCurrency(totals.taxAmount, draft.invoiceCurrency)}</span></div>
                    <div className={styles.previewTotal}><span>Total</span><strong>{formatCurrency(totals.total, draft.invoiceCurrency)}</strong></div>
                  </div>
                  <div className={styles.previewPayment}>
                    <strong>Payment Instructions</strong>
                    <span>{draft.notes || 'Payment terms and instructions will appear here.'}</span>
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
                    <span>Current Rate ({draft.invoiceCurrency}/{draft.settlementCurrency})</span>
                    <strong>{loadingRate ? '...' : displayRate}</strong>
                  </div>
                  <div>
                    <span>Rate Trend (24h)</span>
                    <strong className={rateChange !== null && rateChange >= 0 ? styles.green : styles.red}>
                      {loadingRate ? '...' : displayChange}
                    </strong>
                  </div>
                  <div>
                    <span>Settlement Estimate</span>
                    <strong>{fxRate ? formatCurrency(totals.total * fxRate, draft.settlementCurrency) : '---'}</strong>
                  </div>
                  <div>
                    <span>Optimal Window</span>
                    <strong>Next 3-5 days</strong>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
