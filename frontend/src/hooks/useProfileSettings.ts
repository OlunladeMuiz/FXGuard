'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  AUTH_USER_UPDATED_EVENT,
  fetchProfile,
  getPreferredCurrency,
  getUser,
  setUser,
  updateProfile,
  User,
} from '@/lib/api/auth';
import { formatApiError } from '@/lib/api/errors';
import { CurrencyCode, CurrencyCodeSchema } from '@/types/currency';

export interface ProfileSettingsForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  timeZone: string;
  preferredCurrency: CurrencyCode;
}

interface UseProfileSettingsResult {
  profile: User | null;
  form: ProfileSettingsForm;
  loading: boolean;
  saving: boolean;
  error: string | null;
  successMessage: string | null;
  setField: <Key extends keyof ProfileSettingsForm>(field: Key, value: ProfileSettingsForm[Key]) => void;
  save: () => Promise<void>;
  clearMessages: () => void;
}

const DEFAULT_FORM: ProfileSettingsForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  timeZone: 'Africa/Lagos',
  preferredCurrency: 'NGN',
};

function mapUserToForm(user: User | null): ProfileSettingsForm {
  if (!user) {
    return DEFAULT_FORM;
  }

  const preferredCurrencyResult = CurrencyCodeSchema.safeParse(getPreferredCurrency(user));

  return {
    firstName: user.first_name?.trim() ?? '',
    lastName: user.last_name?.trim() ?? '',
    email: user.email,
    phone: user.phone?.trim() ?? '',
    timeZone: user.time_zone?.trim() || 'Africa/Lagos',
    preferredCurrency: preferredCurrencyResult.success ? preferredCurrencyResult.data : 'NGN',
  };
}

export function useProfileSettings(): UseProfileSettingsResult {
  const [profile, setProfile] = useState<User | null>(null);
  const [form, setForm] = useState<ProfileSettingsForm>(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchProfile();
      setProfile(response);
      setForm(mapUserToForm(response));
      setUser(response);
    } catch (loadError) {
      const cachedUser = getUser();
      if (cachedUser) {
        setProfile(cachedUser);
        setForm(mapUserToForm(cachedUser));
      } else {
        setError(formatApiError(loadError, 'Unable to load profile settings.'));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const syncFromStorage = () => {
      const nextUser = getUser();
      setProfile(nextUser);
      setForm(mapUserToForm(nextUser));
    };

    window.addEventListener(AUTH_USER_UPDATED_EVENT, syncFromStorage);
    window.addEventListener('storage', syncFromStorage);

    return () => {
      window.removeEventListener(AUTH_USER_UPDATED_EVENT, syncFromStorage);
      window.removeEventListener('storage', syncFromStorage);
    };
  }, []);

  const setField = useCallback(<Key extends keyof ProfileSettingsForm>(
    field: Key,
    value: ProfileSettingsForm[Key],
  ) => {
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
      setError('Unable to save profile settings because the user profile is not loaded.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const updatedUser = await updateProfile({
        email: form.email.trim(),
        first_name: form.firstName.trim() || null,
        last_name: form.lastName.trim() || null,
        phone: form.phone.trim() || null,
        time_zone: form.timeZone.trim() || null,
        preferred_currency: form.preferredCurrency,
      });

      const nextUser: User = {
        ...profile,
        ...updatedUser,
      };

      setProfile(nextUser);
      setForm(mapUserToForm(nextUser));
      setUser(nextUser);
      setSuccessMessage('Profile saved successfully.');
    } catch (saveError) {
      setError(formatApiError(saveError, 'Failed to save profile settings.'));
    } finally {
      setSaving(false);
    }
  }, [form, profile]);

  return {
    profile,
    form,
    loading,
    saving,
    error,
    successMessage,
    setField,
    save,
    clearMessages,
  };
}
