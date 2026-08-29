'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { fetchInvoiceById, deleteInvoice } from '@/lib/api/invoices';
import { useFXRates } from '@/hooks/useFXRates';
import { type CurrencyCode } from '@/types/currency';
import { AUTH_USER_UPDATED_EVENT, getUser, type User } from '@/lib/api/auth';
import styles from './page.module.css';

export default function InvoicePage({ params }: { params: { id: string } }) {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this invoice?')) return;
    setIsDeleting(true);
    try {
      await deleteInvoice(params.id);
      router.push('/dashboard');
    } catch (err) {
      console.error('Failed to delete invoice:', err);
      alert('Failed to delete invoice. Please try again.');
      setIsDeleting(false);
    }
  };

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

  const preferredSettlementCurrency = (user?.preferred_currency?.trim().toUpperCase() || 'NGN') as CurrencyCode;
  const { getRate, loading: ratesLoading } = useFXRates(preferredSettlementCurrency);

  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        const data = await fetchInvoiceById(params.id);
        if (!cancelled) {
          setInvoice(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [params.id]);

  if (loading) {
    return (
      <main className={styles.container}>
        <section className={styles.card}>
          <p>Loading invoice details...</p>
        </section>
      </main>
    );
  }

  if (error || !invoice) {
    return (
      <main className={styles.container}>
        <section className={styles.card}>
          <h1>Invoice not found</h1>
          <p>We could not load the details for this invoice.</p>
          <br />
          <Link href="/dashboard" className={styles.backLink}>← Back to dashboard</Link>
        </section>
      </main>
    );
  }

  const currency = invoice.currency || invoice.baseCurrency || 'USD';
  const issueDateStr = invoice.issueDate || invoice.createdAt;
  
  const formattedIssueDate = new Date(issueDateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  const formattedDueDate = new Date(invoice.dueDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(val);

  const invoiceCurrency = (currency) as CurrencyCode;
  const rate = getRate(invoiceCurrency, preferredSettlementCurrency);
  const totalAmount = invoice.amount + (invoice.amount * ((invoice.taxRate || 0) / 100));
  const hasRate = rate !== null && rate > 0;
  const convertedTotal = hasRate ? totalAmount * rate : null;

  const isDeleteDisabled = isDeleting || invoice.status === 'paid';

  return (
    <main className={styles.container}>
      <Link className={styles.breadcrumb} href="/dashboard">← Back to Dashboard</Link>
      
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <h1>{invoice.invoiceNumber || 'Invoice'}</h1>
          <span className={styles.badge}>{invoice.status}</span>
        </div>
        <button
          onClick={handleDelete}
          disabled={isDeleteDisabled}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'transparent',
            border: '1px solid var(--surface-3)',
            color: 'var(--text-mid)',
            padding: 'var(--spacing-2) var(--spacing-4)',
            borderRadius: 'var(--radius-md)',
            cursor: isDeleting ? 'not-allowed' : 'pointer',
            fontWeight: 500,
            fontSize: '0.875rem',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            if (!isDeleting) {
              e.currentTarget.style.borderColor = '#ef4444';
              e.currentTarget.style.color = '#ef4444';
            }
          }}
          onMouseOut={(e) => {
            if (!isDeleting) {
              e.currentTarget.style.borderColor = 'var(--surface-3)';
              e.currentTarget.style.color = 'var(--text-mid)';
            }
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2-2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
          {isDeleting ? 'Deleting...' : 'Delete Invoice'}
        </button>
      </header>

      <div className={styles.layoutGrid}>
        <div className={styles.column}>
          {/* Meta Card */}
          <section className={styles.card}>
            <div className={styles.metaGrid}>
              <div className={styles.metaBlock}>
                <span className={styles.label}>Billed To</span>
                <span className={styles.value}>{invoice.clientName}</span>
                {invoice.clientEmail && <span className={styles.label} style={{ textTransform: 'none', marginTop: '4px' }}>{invoice.clientEmail}</span>}
              </div>
              <div className={styles.metaBlock}>
                <span className={styles.label}>Issue Date</span>
                <span className={styles.value}>{formattedIssueDate}</span>
                <span className={styles.label} style={{ marginTop: '12px' }}>Due Date</span>
                <span className={styles.value}>{formattedDueDate}</span>
              </div>
            </div>
          </section>

          {/* Line Items Card */}
          <section className={styles.card}>
            <h2 className={styles.cardHeader}>Line Items</h2>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Description</th>
                  <th className={styles.alignRight}>Qty</th>
                  <th className={styles.alignRight}>Price</th>
                  <th className={styles.alignRight}>Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items && invoice.items.length > 0 ? (
                  invoice.items.map((item: any) => (
                    <tr key={item.id}>
                      <td>{item.description}</td>
                      <td className={styles.alignRight}>{item.quantity}</td>
                      <td className={styles.alignRight}>{formatCurrency(item.unitPrice)}</td>
                      <td className={styles.alignRight}>{formatCurrency(item.quantity * item.unitPrice)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-mid)' }}>No items found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        </div>

        <div className={styles.column}>
          {/* Summary Card */}
          <section className={styles.card}>
            <h2 className={styles.cardHeader}>Summary</h2>
            <div className={styles.summaryRow}>
              <span>Subtotal</span>
              <span>{formatCurrency(invoice.amount)}</span>
            </div>
            <div className={styles.summaryRow}>
              <span>Tax ({invoice.taxRate || 0}%)</span>
              <span>{formatCurrency(invoice.amount * ((invoice.taxRate || 0) / 100))}</span>
            </div>
            <div className={`${styles.summaryRow} ${styles.total}`}>
              <span>Total</span>
            </div>
            <div className={styles.totalAmount}>
              {formatCurrency(invoice.amount + (invoice.amount * ((invoice.taxRate || 0) / 100)))}
            </div>
          </section>

          {/* FX Settlement Impact */}
          <aside className={styles.card}>
            <h2 className={styles.cardHeader}>Settlement Impact</h2>
            {ratesLoading ? (
              <p style={{ color: 'var(--text-mid)', fontSize: '0.875rem' }}>Fetching live rates...</p>
            ) : hasRate ? (
              <div className={styles.metaBlock}>
                <span className={styles.label}>Est. Payout ({preferredSettlementCurrency})</span>
                <span className={styles.value} style={{ fontSize: '2rem', fontWeight: '600' }}>
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: preferredSettlementCurrency }).format(convertedTotal!)}
                </span>
                <span className={styles.label} style={{ marginTop: '12px', textTransform: 'none' }}>
                  Rate: 1 {invoiceCurrency} = {rate} {preferredSettlementCurrency}
                </span>
              </div>
            ) : (
              <p style={{ color: 'var(--text-mid)', fontSize: '0.875rem' }}>
                Conversion rate unavailable for {invoiceCurrency} to {preferredSettlementCurrency}.
              </p>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
