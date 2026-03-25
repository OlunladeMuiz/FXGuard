import {
  fetchProfile,
  getUser,
  setUser,
  updateProfile,
  User,
} from './auth';
import { CurrencyCodeSchema } from '@/types/currency';
import {
  BusinessDetails,
  BusinessDetailsDraft,
  BusinessDetailsSchema,
} from '@/types/settings';

function titleCase(value: string): string {
  if (!value) {
    return '';
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function deriveOwnerName(
  firstName: string | null | undefined,
  lastName: string | null | undefined,
  email: string,
): string {
  const fullName = [firstName?.trim(), lastName?.trim()].filter(Boolean).join(' ').trim();
  if (fullName) {
    return fullName;
  }

  const emailPrefix = email.split('@')[0] ?? '';
  const nameParts = emailPrefix.split(/[._-]/).filter(Boolean);

  if (nameParts.length >= 2) {
    return `${titleCase(nameParts[0] ?? '')} ${titleCase(nameParts[1] ?? '')}`.trim();
  }

  return titleCase(emailPrefix) || 'Not provided';
}

function normalizeCurrency(value: string | null | undefined) {
  const parsed = CurrencyCodeSchema.safeParse(value?.trim().toUpperCase() || 'NGN');
  return parsed.success ? parsed.data : 'NGN';
}

function cleanField(value: string | null | undefined): string {
  const cleaned = value?.trim();
  return cleaned || 'Not provided';
}

export function mapProfileToBusinessDetails(profile: User): BusinessDetails {
  const registrationDate = profile.created_at
    ? new Date(profile.created_at).toISOString()
    : new Date(0).toISOString();
  const phoneNumber = cleanField(profile.phone);
  const businessName = cleanField(profile.company_name);
  const ownerFirstName = profile.first_name?.trim() || '';
  const ownerLastName = profile.last_name?.trim() || '';
  const country = cleanField(profile.country);
  const businessType = cleanField(profile.business_type);

  return BusinessDetailsSchema.parse({
    businessName,
    ownerFirstName,
    ownerLastName,
    ownerName: deriveOwnerName(ownerFirstName, ownerLastName, profile.email),
    email: profile.email,
    phoneNumber,
    country,
    defaultCurrency: normalizeCurrency(profile.preferred_currency),
    businessType,
    registrationDate,
    hasMissingFields: phoneNumber === 'Not provided'
      || businessName === 'Not provided'
      || country === 'Not provided'
      || businessType === 'Not provided'
      || !ownerFirstName
      || !ownerLastName,
  });
}

export async function getBusinessDetails(): Promise<BusinessDetails> {
  try {
    const response = await fetchProfile();
    setUser(response);
    return mapProfileToBusinessDetails(response);
  } catch {
    const cachedUser = getUser();
    if (cachedUser) {
      return mapProfileToBusinessDetails(cachedUser);
    }

    throw new Error('Unable to load business details.');
  }
}

export interface UpdateBusinessDetailsResult {
  businessDetails: BusinessDetails;
  user: User;
}

export async function updateBusinessDetails(
  payload: BusinessDetailsDraft,
): Promise<UpdateBusinessDetailsResult> {
  const updatedUser = await updateProfile({
    company_name: payload.businessName.trim(),
    first_name: payload.ownerFirstName.trim(),
    last_name: payload.ownerLastName.trim(),
    email: payload.email.trim(),
    phone: payload.phoneNumber.trim(),
    country: payload.country.trim(),
    preferred_currency: payload.defaultCurrency,
    business_type: payload.businessType.trim(),
  });

  return {
    businessDetails: mapProfileToBusinessDetails(updatedUser),
    user: updatedUser,
  };
}
