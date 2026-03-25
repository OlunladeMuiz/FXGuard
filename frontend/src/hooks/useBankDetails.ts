'use client';

import { useCallback, useEffect, useState } from 'react';

import { formatApiError } from '@/lib/api/errors';
import { getBankDetails, updateBankDetails } from '@/lib/api/bank';
import { BankDetails, BankDetailsDraft } from '@/types/settings';

interface UseBankDetailsResult {
  bankDetails: BankDetailsDraft;
  lastSavedRecord: BankDetails | null;
  loading: boolean;
  saving: boolean;
  error: string | null;
  successMessage: string | null;
  updateField: <Key extends keyof BankDetailsDraft>(field: Key, value: BankDetailsDraft[Key]) => void;
  save: () => Promise<void>;
  resetMessages: () => void;
}

const EMPTY_BANK_DETAILS: BankDetailsDraft = {
  bankName: '',
  accountName: '',
  accountNumber: '',
  currency: 'NGN',
};

export function useBankDetails(): UseBankDetailsResult {
  const [bankDetails, setBankDetails] = useState<BankDetailsDraft>(EMPTY_BANK_DETAILS);
  const [lastSavedRecord, setLastSavedRecord] = useState<BankDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await getBankDetails();
        if (!cancelled) {
          setLastSavedRecord(response);
          setBankDetails({
            bankName: response.bankName,
            accountName: response.accountName,
            accountNumber: response.accountNumber,
            currency: response.currency,
          });
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(formatApiError(loadError, 'Unable to load payout account details.'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  const updateField = useCallback(<Key extends keyof BankDetailsDraft>(
    field: Key,
    value: BankDetailsDraft[Key],
  ) => {
    setBankDetails((current) => ({
      ...current,
      [field]: value,
    }));
  }, []);

  const resetMessages = useCallback(() => {
    setError(null);
    setSuccessMessage(null);
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await updateBankDetails(bankDetails);
      setLastSavedRecord(response);
      setBankDetails({
        bankName: response.bankName,
        accountName: response.accountName,
        accountNumber: response.accountNumber,
        currency: response.currency,
      });
      setSuccessMessage('Payout account updated successfully');
    } catch (saveError) {
      setError(formatApiError(saveError, 'Unable to update payout account details.'));
    } finally {
      setSaving(false);
    }
  }, [bankDetails]);

  return {
    bankDetails,
    lastSavedRecord,
    loading,
    saving,
    error,
    successMessage,
    updateField,
    save,
    resetMessages,
  };
}
