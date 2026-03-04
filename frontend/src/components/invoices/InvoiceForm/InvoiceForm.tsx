'use client';

import React, { useState, useCallback } from 'react';
import styles from './InvoiceForm.module.css';
import { Input } from '@/components/ui/Input/Input';
import { Button } from '@/components/ui/Button/Button';
import { Card } from '@/components/ui/Card/Card';
import { InvoiceFormData, formDataToPayload } from '@/types/invoice';
import { useCreateInvoice } from '@/hooks/useCreateInvoice';

interface InvoiceFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

/**
 * InvoiceForm Component
 * Form for creating new invoices with validation
 * UI-only component - business logic handled by hook
 */
export const InvoiceForm: React.FC<InvoiceFormProps> = ({ onSuccess, onCancel }) => {
  const { create, loading, error, validationErrors, reset } = useCreateInvoice();
  
  const [formData, setFormData] = useState<InvoiceFormData>({
    clientName: '',
    amount: '',
    baseCurrency: 'USD',
    targetCurrency: 'NGN',
    dueDate: '',
  });

  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleInputChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitSuccess(false);

    try {
      const payload = formDataToPayload(formData);
      await create(payload);
      
      setSubmitSuccess(true);
      setFormData({
        clientName: '',
        amount: '',
        baseCurrency: 'USD',
        targetCurrency: 'NGN',
        dueDate: '',
      });
      
      onSuccess?.();
    } catch {
      // Error is handled by hook
    }
  }, [formData, create, onSuccess]);

  const handleCancel = useCallback(() => {
    reset();
    setFormData({
      clientName: '',
      amount: '',
      baseCurrency: 'USD',
      targetCurrency: 'NGN',
      dueDate: '',
    });
    onCancel?.();
  }, [reset, onCancel]);

  // Get minimum date (today)
  const today = new Date().toISOString().split('T')[0];

  return (
    <Card className={styles.formCard}>
      <h2 className={styles.formTitle}>Create New Invoice</h2>
      
      {submitSuccess && (
        <div className={styles.successMessage}>
          Invoice created successfully!
        </div>
      )}

      {error && !Object.keys(validationErrors).length && (
        <div className={styles.errorMessage}>
          {error.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.formGroup}>
          <Input
            label="Client Name"
            name="clientName"
            value={formData.clientName}
            onChange={handleInputChange}
            placeholder="Enter client name"
            error={validationErrors.clientName}
            required
          />
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <Input
              label="Amount"
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              value={formData.amount}
              onChange={handleInputChange}
              placeholder="0.00"
              error={validationErrors.amount}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Base Currency</label>
            <select
              name="baseCurrency"
              value={formData.baseCurrency}
              onChange={handleInputChange}
              className={styles.select}
              disabled
            >
              <option value="USD">USD</option>
            </select>
            <span className={styles.helperText}>Base currency is fixed to USD</span>
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Target Currency</label>
            <select
              name="targetCurrency"
              value={formData.targetCurrency}
              onChange={handleInputChange}
              className={styles.select}
              required
            >
              <option value="NGN">NGN - Nigerian Naira</option>
              <option value="GBP">GBP - British Pound</option>
              <option value="EUR">EUR - Euro</option>
            </select>
            {validationErrors.targetCurrency && (
              <span className={styles.errorText}>{validationErrors.targetCurrency}</span>
            )}
          </div>

          <div className={styles.formGroup}>
            <Input
              label="Due Date"
              name="dueDate"
              type="date"
              min={today}
              value={formData.dueDate}
              onChange={handleInputChange}
              error={validationErrors.dueDate}
              required
            />
          </div>
        </div>

        <div className={styles.formActions}>
          <Button
            type="button"
            variant="secondary"
            onClick={handleCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={loading}
          >
            Create Invoice
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default InvoiceForm;
