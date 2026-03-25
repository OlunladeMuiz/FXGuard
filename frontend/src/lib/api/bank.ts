import {
  BankDetails,
  BankDetailsDraft,
  BankDetailsDraftSchema,
  BankDetailsSchema,
} from '@/types/settings';

const BANK_DETAILS_STORAGE_KEY = 'fxguard:settings:bank-details';

const DEFAULT_BANK_DETAILS: BankDetails = {
  bankName: '',
  accountName: '',
  accountNumber: '',
  currency: 'NGN',
  updatedAt: new Date(0).toISOString(),
};

function readStoredBankDetails(): BankDetails {
  if (typeof window === 'undefined') {
    return DEFAULT_BANK_DETAILS;
  }

  const rawValue = window.localStorage.getItem(BANK_DETAILS_STORAGE_KEY);
  if (!rawValue) {
    return DEFAULT_BANK_DETAILS;
  }

  try {
    return BankDetailsSchema.parse(JSON.parse(rawValue));
  } catch {
    return DEFAULT_BANK_DETAILS;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export async function getBankDetails(): Promise<BankDetails> {
  return readStoredBankDetails();
}

export async function updateBankDetails(input: BankDetailsDraft): Promise<BankDetails> {
  const validationResult = BankDetailsDraftSchema.safeParse(input);
  if (!validationResult.success) {
    throw new Error(validationResult.error.issues.map((issue) => issue.message).join(' '));
  }

  const nextRecord = BankDetailsSchema.parse({
    ...validationResult.data,
    updatedAt: new Date().toISOString(),
  });

  if (typeof window !== 'undefined') {
    await delay(700);
    window.localStorage.setItem(BANK_DETAILS_STORAGE_KEY, JSON.stringify(nextRecord));
  }

  return nextRecord;
}
