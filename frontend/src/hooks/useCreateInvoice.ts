'use client';

import { useState, useCallback } from 'react';
import { Invoice, CreateInvoicePayload, CreateInvoiceSchema } from '@/types/invoice';
import { createInvoice } from '@/api/invoices';
import { ZodError } from 'zod';

interface UseCreateInvoiceState {
  loading: boolean;
  error: Error | null;
  validationErrors: Record<string, string>;
  createdInvoice: Invoice | null;
}

interface UseCreateInvoiceReturn extends UseCreateInvoiceState {
  create: (payload: CreateInvoicePayload) => Promise<Invoice>;
  reset: () => void;
  clearErrors: () => void;
}

/**
 * Custom hook for creating invoices
 * Handles validation, submission, and error management
 *
 * @returns Invoice creation utilities
 */
export const useCreateInvoice = (): UseCreateInvoiceReturn => {
  const [state, setState] = useState<UseCreateInvoiceState>({
    loading: false,
    error: null,
    validationErrors: {},
    createdInvoice: null,
  });

  const create = useCallback(async (payload: CreateInvoicePayload): Promise<Invoice> => {
    try {
      setState((prev) => ({
        ...prev,
        loading: true,
        error: null,
        validationErrors: {},
      }));

      // Validate payload with Zod
      const validatedPayload = CreateInvoiceSchema.parse(payload);
      
      // Create invoice
      const invoice = await createInvoice(validatedPayload);
      
      setState((prev) => ({
        ...prev,
        loading: false,
        createdInvoice: invoice,
        error: null,
      }));

      return invoice;
    } catch (error) {
      if (error instanceof ZodError) {
        // Extract validation errors
        const validationErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          validationErrors[path] = err.message;
        });
        
        setState((prev) => ({
          ...prev,
          loading: false,
          validationErrors,
          error: new Error('Validation failed'),
        }));
        
        throw new Error('Validation failed');
      }
      
      const err = error instanceof Error ? error : new Error('Failed to create invoice');
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err,
      }));
      
      throw err;
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      loading: false,
      error: null,
      validationErrors: {},
      createdInvoice: null,
    });
  }, []);

  const clearErrors = useCallback(() => {
    setState((prev) => ({
      ...prev,
      error: null,
      validationErrors: {},
    }));
  }, []);

  return {
    ...state,
    create,
    reset,
    clearErrors,
  };
};

export default useCreateInvoice;
