import client from '@/lib/api/client';

const INVOICE_DRAFT_STORAGE_KEY = 'fxguard:invoice-draft';

export interface InvoiceEditorLineItem {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
}

export interface InvoiceEditorState {
  persistedInvoiceId: string | null;
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  clientCompany: string;
  address: string;
  country: string;
  issueDate: string;
  dueDate: string;
  paymentTerms: string;
  accountName: string;
  bankName: string;
  accountNumber: string;
  invoiceCurrency: string;
  settlementCurrency: string;
  lineItems: InvoiceEditorLineItem[];
  discount: string;
  discountType: 'percent' | 'fixed';
  taxRate: string;
  notes: string;
}

interface BackendInvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  created_at: string;
}

export interface BackendInvoiceRecord {
  id: string;
  user_id: string;
  invoice_number: string;
  client_name: string;
  client_email: string;
  client_company: string | null;
  address: string | null;
  country: string | null;
  amount: number;
  currency: string;
  discount: number;
  tax_rate: number;
  issue_date: string;
  due_date: string;
  description: string | null;
  payment_method: string | null;
  payment_details: string | null;
  account_name: string | null;
  bank_name: string | null;
  account_number: string | null;
  status: string;
  payment_link: string | null;
  payment_reference: string | null;
  payment_completed_at: string | null;
  created_at: string;
  updated_at: string;
  items: BackendInvoiceItem[];
}

export interface InvoiceRecordItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  createdAt: string;
}

export interface InvoiceRecord {
  id: string;
  userId: string;
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  clientCompany: string;
  address: string;
  country: string;
  amount: number;
  currency: string;
  discount: number;
  taxRate: number;
  issueDate: string;
  dueDate: string;
  description: string;
  paymentMethod: string;
  paymentDetails: string;
  accountName: string;
  bankName: string;
  accountNumber: string;
  status: string;
  paymentLink: string;
  paymentReference: string;
  paymentCompletedAt: string;
  createdAt: string;
  updatedAt: string;
  items: InvoiceRecordItem[];
}

export interface InvoiceTotals {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
}

function formatIsoDatePart(value: number): string {
  return String(value).padStart(2, '0');
}

function formatLocalDate(date: Date): string {
  return [
    date.getFullYear(),
    formatIsoDatePart(date.getMonth() + 1),
    formatIsoDatePart(date.getDate()),
  ].join('-');
}

function todayIsoDate(): string {
  return formatLocalDate(new Date());
}

function datePlusDays(days: number): string {
  const value = new Date();
  value.setDate(value.getDate() + days);
  return formatLocalDate(value);
}

function createInvoiceNumber(): string {
  const now = new Date();
  const datePart = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');
  const randomPart = Math.floor(100 + Math.random() * 900);
  return `INV-${datePart}-${randomPart}`;
}

export function createInvoiceLineItem(partial?: Partial<InvoiceEditorLineItem>): InvoiceEditorLineItem {
  return {
    id: partial?.id ?? crypto.randomUUID(),
    description: partial?.description ?? '',
    quantity: partial?.quantity ?? '1',
    unitPrice: partial?.unitPrice ?? '',
  };
}

export function createEmptyInvoiceDraft(): InvoiceEditorState {
  return {
    persistedInvoiceId: null,
    invoiceNumber: createInvoiceNumber(),
    clientName: '',
    clientEmail: '',
    clientCompany: '',
    address: '',
    country: '',
    issueDate: todayIsoDate(),
    dueDate: datePlusDays(30),
    paymentTerms: 'Net 30',
    accountName: '',
    bankName: '',
    accountNumber: '',
    invoiceCurrency: 'USD',
    settlementCurrency: 'NGN',
    lineItems: [createInvoiceLineItem()],
    discount: '0',
    discountType: 'percent',
    taxRate: '0',
    notes: '',
  };
}

function normalizeDraft(value: Partial<InvoiceEditorState> | null | undefined): InvoiceEditorState {
  const fallback = createEmptyInvoiceDraft();
  if (!value) {
    return fallback;
  }

  return {
    ...fallback,
    ...value,
    persistedInvoiceId: value.persistedInvoiceId ?? fallback.persistedInvoiceId,
    lineItems:
      value.lineItems?.length
        ? value.lineItems.map((item) => createInvoiceLineItem(item))
        : fallback.lineItems,
  };
}

export function loadInvoiceDraft(): InvoiceEditorState {
  if (typeof window === 'undefined') {
    return createEmptyInvoiceDraft();
  }

  const raw = window.sessionStorage.getItem(INVOICE_DRAFT_STORAGE_KEY);
  if (!raw) {
    return createEmptyInvoiceDraft();
  }

  try {
    return normalizeDraft(JSON.parse(raw) as Partial<InvoiceEditorState>);
  } catch {
    return createEmptyInvoiceDraft();
  }
}

export function saveInvoiceDraft(draft: InvoiceEditorState): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(INVOICE_DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

export function clearInvoiceDraft(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.removeItem(INVOICE_DRAFT_STORAGE_KEY);
}

function parseNumeric(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function calculateInvoiceTotals(draft: InvoiceEditorState): InvoiceTotals {
  const subtotal = draft.lineItems.reduce((sum, item) => {
    return sum + parseNumeric(item.quantity) * parseNumeric(item.unitPrice);
  }, 0);

  const rawDiscount = Math.max(0, parseNumeric(draft.discount));
  const discountAmount =
    draft.discountType === 'percent'
      ? subtotal * Math.min(rawDiscount, 100) / 100
      : Math.min(rawDiscount, subtotal);
  const taxableSubtotal = Math.max(subtotal - discountAmount, 0);
  const taxRate = Math.max(0, parseNumeric(draft.taxRate));
  const taxAmount = taxableSubtotal * taxRate / 100;

  return {
    subtotal,
    discountAmount,
    taxAmount,
    total: taxableSubtotal + taxAmount,
  };
}

export function formatCurrency(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

export function formatDisplayDate(value: string): string {
  if (!value) {
    return 'Not specified';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function mapBackendInvoice(record: BackendInvoiceRecord): InvoiceRecord {
  return {
    id: record.id,
    userId: record.user_id,
    invoiceNumber: record.invoice_number,
    clientName: record.client_name,
    clientEmail: record.client_email,
    clientCompany: record.client_company ?? '',
    address: record.address ?? '',
    country: record.country ?? '',
    amount: record.amount,
    currency: record.currency,
    discount: record.discount,
    taxRate: record.tax_rate,
    issueDate: record.issue_date,
    dueDate: record.due_date,
    description: record.description ?? '',
    paymentMethod: record.payment_method ?? '',
    paymentDetails: record.payment_details ?? '',
    accountName: record.account_name ?? '',
    bankName: record.bank_name ?? '',
    accountNumber: record.account_number ?? '',
    status: record.status,
    paymentLink: record.payment_link ?? '',
    paymentReference: record.payment_reference ?? '',
    paymentCompletedAt: record.payment_completed_at ?? '',
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    items: record.items.map((item) => ({
      id: item.id,
      invoiceId: item.invoice_id,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      createdAt: item.created_at,
    })),
  };
}

function toApiDate(dateValue: string): string {
  return `${dateValue}T00:00:00Z`;
}

function buildInvoicePayload(draft: InvoiceEditorState, status: string) {
  const totals = calculateInvoiceTotals(draft);
  const trimmedNotes = draft.notes.trim();

  return {
    invoice_number: draft.invoiceNumber.trim(),
    client_name: draft.clientName.trim(),
    client_email: draft.clientEmail.trim(),
    client_company: draft.clientCompany.trim() || null,
    address: draft.address.trim() || null,
    country: draft.country.trim() || null,
    amount: Number(totals.total.toFixed(2)),
    currency: draft.invoiceCurrency,
    discount: Number(totals.discountAmount.toFixed(2)),
    tax_rate: Number(parseNumeric(draft.taxRate).toFixed(2)),
    issue_date: toApiDate(draft.issueDate),
    due_date: toApiDate(draft.dueDate),
    description: trimmedNotes || null,
    payment_method: draft.paymentTerms.trim() || null,
    payment_details: trimmedNotes || null,
    account_name: draft.accountName.trim() || null,
    bank_name: draft.bankName.trim() || null,
    account_number: draft.accountNumber.trim() || null,
    status,
    items: draft.lineItems
      .filter((item) => item.description.trim() || parseNumeric(item.unitPrice) > 0)
      .map((item) => ({
        description: item.description.trim() || 'Line item',
        quantity: Number(parseNumeric(item.quantity).toFixed(2)),
        unit_price: Number(parseNumeric(item.unitPrice).toFixed(2)),
      })),
  };
}

export function mapInvoiceRecordToDraft(record: InvoiceRecord): InvoiceEditorState {
  return {
    persistedInvoiceId: record.id,
    invoiceNumber: record.invoiceNumber,
    clientName: record.clientName,
    clientEmail: record.clientEmail,
    clientCompany: record.clientCompany,
    address: record.address,
    country: record.country,
    issueDate: record.issueDate.slice(0, 10) || todayIsoDate(),
    dueDate: record.dueDate.slice(0, 10) || datePlusDays(30),
    paymentTerms: record.paymentMethod || 'Net 30',
    accountName: record.accountName || '',
    bankName: record.bankName || '',
    accountNumber: record.accountNumber || '',
    invoiceCurrency: record.currency,
    settlementCurrency: 'NGN',
    lineItems:
      record.items.length > 0
        ? record.items.map((item) => createInvoiceLineItem({
            description: item.description,
            quantity: String(item.quantity),
            unitPrice: String(item.unitPrice),
          }))
        : [createInvoiceLineItem()],
    discount: String(record.discount),
    discountType: 'fixed',
    taxRate: String(record.taxRate),
    notes: record.description || record.paymentDetails || '',
  };
}

export async function createInvoiceRecord(
  draft: InvoiceEditorState,
  status: 'draft' | 'sent',
): Promise<InvoiceRecord> {
  const response = await client.post<BackendInvoiceRecord>('/invoices/', buildInvoicePayload(draft, status));
  return mapBackendInvoice(response.data);
}

export async function updateInvoiceRecord(
  invoiceId: string,
  draft: InvoiceEditorState,
  status: 'draft' | 'sent',
): Promise<InvoiceRecord> {
  const response = await client.put<BackendInvoiceRecord>(`/invoices/${invoiceId}`, buildInvoicePayload(draft, status));
  return mapBackendInvoice(response.data);
}

export async function fetchInvoiceRecord(invoiceId: string): Promise<InvoiceRecord> {
  const response = await client.get<BackendInvoiceRecord>(`/invoices/${invoiceId}`);
  return mapBackendInvoice(response.data);
}

export async function fetchAllInvoiceRecords(batchSize: number = 200): Promise<InvoiceRecord[]> {
  const invoices: InvoiceRecord[] = [];
  let skip = 0;

  while (true) {
    const response = await client.get<BackendInvoiceRecord[]>('/invoices/', {
      params: {
        skip,
        limit: batchSize,
      },
    });

    const batch = response.data.map(mapBackendInvoice);
    invoices.push(...batch);

    if (batch.length < batchSize) {
      break;
    }

    skip += batchSize;
  }

  return invoices;
}

export function buildInvoiceEmailSubject(record: InvoiceRecord): string {
  return `Invoice ${record.invoiceNumber} from FXGuard`;
}

export function buildInvoiceEmailMessage(record: InvoiceRecord): string {
  return [
    `Dear ${record.clientName},`,
    '',
    `Please find attached invoice ${record.invoiceNumber}.`,
    `Payment is due on ${formatDisplayDate(record.dueDate)}.`,
    '',
    'Thank you.',
  ].join('\n');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildInvoicePrintHtml(
  draft: InvoiceEditorState,
  businessName: string,
  contactEmail: string,
): string {
  const totals = calculateInvoiceTotals(draft);
  const rows = draft.lineItems
    .filter((item) => item.description.trim())
    .map((item) => {
      const quantity = Number.parseFloat(item.quantity) || 0;
      const unitPrice = Number.parseFloat(item.unitPrice) || 0;
      return `
        <tr>
          <td>${escapeHtml(item.description)}</td>
          <td>${quantity}</td>
          <td>${formatCurrency(unitPrice, draft.invoiceCurrency)}</td>
          <td>${formatCurrency(quantity * unitPrice, draft.invoiceCurrency)}</td>
        </tr>
      `;
    })
    .join('');

  return `
    <html>
      <head>
        <title>${escapeHtml(draft.invoiceNumber)}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 32px; color: #0f172a; }
          .top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; gap: 24px; }
          .label { color: #64748b; font-size: 12px; text-transform: uppercase; margin-bottom: 4px; }
          .block { display: flex; flex-direction: column; gap: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 24px; }
          th, td { border-bottom: 1px solid #e2e8f0; padding: 12px 8px; text-align: left; }
          .totals { width: 320px; margin-left: auto; margin-top: 24px; }
          .totals div { display: flex; justify-content: space-between; padding: 6px 0; }
          .totals .total { border-top: 1px solid #cbd5e1; font-weight: bold; margin-top: 8px; padding-top: 12px; }
        </style>
      </head>
      <body>
        <div class="top">
          <div class="block">
            <strong>${escapeHtml(businessName)}</strong>
            <span>${escapeHtml(contactEmail || 'your@email.com')}</span>
            <span>${escapeHtml(draft.address || 'Business address')}</span>
            <span>${escapeHtml(draft.country || 'Country')}</span>
          </div>
          <div class="block" style="text-align:right">
            <strong>INVOICE</strong>
            <span>${escapeHtml(draft.invoiceNumber)}</span>
            <span>Issued ${escapeHtml(formatDisplayDate(draft.issueDate))}</span>
          </div>
        </div>
        <div class="top">
          <div class="block">
            <div class="label">Bill To</div>
            <strong>${escapeHtml(draft.clientName || 'Client Name')}</strong>
            <span>${escapeHtml(draft.clientCompany || '')}</span>
            <span>${escapeHtml(draft.clientEmail || '')}</span>
            <span>${escapeHtml(draft.address || '')}</span>
            <span>${escapeHtml(draft.country || '')}</span>
          </div>
          <div class="block" style="text-align:right">
            <div class="label">Due Date</div>
            <strong>${escapeHtml(formatDisplayDate(draft.dueDate))}</strong>
            <span>${escapeHtml(draft.paymentTerms)}</span>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="totals">
          <div><span>Subtotal</span><strong>${formatCurrency(totals.subtotal, draft.invoiceCurrency)}</strong></div>
          <div><span>Discount</span><strong>-${formatCurrency(totals.discountAmount, draft.invoiceCurrency)}</strong></div>
          <div><span>Tax</span><strong>${formatCurrency(totals.taxAmount, draft.invoiceCurrency)}</strong></div>
          <div class="total"><span>Total</span><strong>${formatCurrency(totals.total, draft.invoiceCurrency)}</strong></div>
        </div>
        <div style="margin-top: 32px;">
          <div class="label">Notes</div>
          <p>${escapeHtml(draft.notes || 'No additional notes provided.')}</p>
        </div>
      </body>
    </html>
  `;
}
