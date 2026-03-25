'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  AUTH_USER_UPDATED_EVENT,
  getUser,
  setUser,
  User,
} from '@/lib/api/auth';
import { formatApiError } from '@/lib/api/errors';
import {
  getBusinessDetails,
  mapProfileToBusinessDetails,
  updateBusinessDetails,
} from '@/lib/api/settings';
import {
  BusinessDetails,
  BusinessDetailsDraft,
  BusinessDetailsDraftSchema,
} from '@/types/settings';

interface UseBusinessDetailsResult {
  businessDetails: BusinessDetails | null;
  form: BusinessDetailsDraft;
  loading: boolean;
  saving: boolean;
  error: string | null;
  successMessage: string | null;
  setField: <Key extends keyof BusinessDetailsDraft>(field: Key, value: BusinessDetailsDraft[Key]) => void;
  save: () => Promise<void>;
  refresh: () => Promise<void>;
  clearMessages: () => void;
}

const DEFAULT_FORM: BusinessDetailsDraft = {
  businessName: '',
  ownerFirstName: '',
  ownerLastName: '',
  email: '',
  phoneNumber: '',
  country: '',
  defaultCurrency: 'NGN',
  businessType: '',
};

function mapBusinessDetailsToForm(details: BusinessDetails | null): BusinessDetailsDraft {
  if (!details) {
    return DEFAULT_FORM;
  }

  return {
    businessName: details.businessName === 'Not provided' ? '' : details.businessName,
    ownerFirstName: details.ownerFirstName,
    ownerLastName: details.ownerLastName,
    email: details.email,
    phoneNumber: details.phoneNumber === 'Not provided' ? '' : details.phoneNumber,
    country: details.country === 'Not provided' ? '' : details.country,
    defaultCurrency: details.defaultCurrency,
    businessType: details.businessType === 'Not provided' ? '' : details.businessType,
  };
}

function getDraftValidationError(form: BusinessDetailsDraft): string | null {
  const result = BusinessDetailsDraftSchema.safeParse(form);
  if (result.success) {
    return null;
  }

  return result.error.issues[0]?.message ?? 'Please review the business details form.';
}

export function useBusinessDetails(): UseBusinessDetailsResult {
  const [profile, setProfile] = useState<User | null>(null);
  const [businessDetails, setBusinessDetails] = useState<BusinessDetails | null>(null);
  const [form, setForm] = useState<BusinessDetailsDraft>(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const syncUserState = useCallback((user: User | null) => {
    setProfile(user);

    if (!user) {
      setBusinessDetails(null);
      setForm(DEFAULT_FORM);
      return;
    }

    const nextBusinessDetails = mapProfileToBusinessDetails(user);
    setBusinessDetails(nextBusinessDetails);
    setForm(mapBusinessDetailsToForm(nextBusinessDetails));
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getBusinessDetails();
      setBusinessDetails(response);
      setForm(mapBusinessDetailsToForm(response));

      const cachedUser = getUser();
      if (cachedUser) {
        setProfile(cachedUser);
      }
    } catch (loadError) {
      const cachedUser = getUser();
      if (cachedUser) {
        syncUserState(cachedUser);
      } else {
        setError(formatApiError(loadError, 'Unable to load business details.'));
        setBusinessDetails(null);
        setForm(DEFAULT_FORM);
        setProfile(null);
      }
    } finally {
      setLoading(false);
    }
  }, [syncUserState]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const syncFromStorage = () => {
      syncUserState(getUser());
    };

    window.addEventListener(AUTH_USER_UPDATED_EVENT, syncFromStorage);
    window.addEventListener('storage', syncFromStorage);

    return () => {
      window.removeEventListener(AUTH_USER_UPDATED_EVENT, syncFromStorage);
      window.removeEventListener('storage', syncFromStorage);
    };
  }, [syncUserState]);

  const setField = useCallback(<Key extends keyof BusinessDetailsDraft>(
    field: Key,
    value: BusinessDetailsDraft[Key],
  ) => {
    setError(null);
    setSuccessMessage(null);
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }, []);

  const clearMessages = useCallback(() => {
    setError(null);
    setSuccessMessage(null);
  }, []);

  const save = useCallback(async () => {
    if (!profile) {
      setError('Unable to save business details because the user profile is not loaded.');
      return;
    }

    const validationError = getDraftValidationError(form);
    if (validationError) {
      setError(validationError);
      setSuccessMessage(null);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await updateBusinessDetails(form);
      setProfile(result.user);
      setBusinessDetails(result.businessDetails);
      setForm(mapBusinessDetailsToForm(result.businessDetails));
      setUser(result.user);
      setSuccessMessage('Business details updated successfully.');
    } catch (saveError) {
      setError(formatApiError(saveError, 'Failed to update business details.'));
    } finally {
      setSaving(false);
    }
  }, [form, profile]);

  return {
    businessDetails,
    form,
    loading,
    saving,
    error,
    successMessage,
    setField,
    save,
    refresh,
    clearMessages,
  };
}
