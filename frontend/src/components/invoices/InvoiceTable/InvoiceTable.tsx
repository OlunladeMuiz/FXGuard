'use client';

import React from 'react';
import styles from './InvoiceTable.module.css';
import { Card } from '@/components/ui/Card/Card';
import { Loader } from '@/components/ui/Loader/Loader';
import { Invoice } from '@/types/invoice';

interface InvoiceTableProps {
  invoices: Invoice[];
  loading: boolean;
  error: Error | null;
  onSelectInvoice?: (invoice: Invoice) => void;
  selectedInvoiceId?: string | null | undefined;
}

/**
 * InvoiceTable Component
 * Displays list of invoices in a table format
 * Presentation-only component
 */
export const InvoiceTable: React.FC<InvoiceTableProps> = ({
  invoices,
  loading,
  error,
  onSelectInvoice,
  selectedInvoiceId,
}) => {
  if (loading) {
    return (
      <Card className={styles.tableCard}>
        <Loader message="Loading invoices..." />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={styles.tableCard}>
        <div className={styles.errorState}>
          <h3>Error Loading Invoices</h3>
          <p>{error.message}</p>
        </div>
      </Card>
    );
  }

  if (invoices.length === 0) {
    return (
      <Card className={styles.tableCard}>
        <div className={styles.emptyState}>
          <h3>No Invoices Found</h3>
          <p>Create your first invoice to get started.</p>
        </div>
      </Card>
    );
  }

  const formatCurrency = (amount: number, currency: string): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusClass = (status: string): string => {
    switch (status) {
      case 'pending':
        return styles.statusPending || '';
      case 'paid':
        return styles.statusPaid || '';
      case 'overdue':
        return styles.statusOverdue || '';
      case 'cancelled':
        return styles.statusCancelled || '';
      default:
        return styles.statusPending || '';
    }
  };

  return (
    <Card className={styles.tableCard}>
      <div className={styles.tableHeader}>
        <h2 className={styles.tableTitle}>Invoices</h2>
        <span className={styles.tableCount}>{invoices.length} total</span>
      </div>
      
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Client Name</th>
              <th>Amount</th>
              <th>Base</th>
              <th>Target</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr
                key={invoice.id}
                className={`${styles.tableRow} ${
                  selectedInvoiceId === invoice.id ? styles.selectedRow : ''
                }`}
                onClick={() => onSelectInvoice?.(invoice)}
              >
                <td className={styles.idCell}>
                  {invoice.id.substring(0, 8)}...
                </td>
                <td className={styles.clientCell}>{invoice.clientName}</td>
                <td className={styles.amountCell}>
                  {formatCurrency(invoice.amount, invoice.baseCurrency)}
                </td>
                <td className={styles.currencyCell}>{invoice.baseCurrency}</td>
                <td className={styles.currencyCell}>{invoice.targetCurrency}</td>
                <td>
                  <span className={`${styles.status} ${getStatusClass(invoice.status)}`}>
                    {invoice.status}
                  </span>
                </td>
                <td className={styles.dateCell}>{formatDate(invoice.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default InvoiceTable;
