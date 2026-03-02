// Currency conversion utility functions
// CurrencyCode is available at @/types/currency if needed

/**
 * Calculate conversion between two currency amounts
 * @param amount - The amount to convert
 * @param rate - The exchange rate (from source currency to target currency)
 * @param decimalPlaces - Number of decimal places for rounding
 * @returns Converted amount
 */
export const calculateConversion = (
  amount: number,
  rate: number,
  decimalPlaces: number = 2
): number => {
  if (!isValidConersionInputs(amount, rate)) {
    throw new Error('Invalid conversion inputs: amount and rate must be positive numbers');
  }

  const converted = amount * rate;
  const multiplier = Math.pow(10, decimalPlaces);
  return Math.round(converted * multiplier) / multiplier;
};

/**
 * Calculate the required amount in source currency to get target amount
 * Useful for the inverse calculation
 * @param targetAmount - The desired amount in target currency
 * @param rate - The exchange rate (from source to target)
 * @param decimalPlaces - Number of decimal places for rounding
 * @returns Required amount in source currency
 */
export const calculateInverseConversion = (
  targetAmount: number,
  rate: number,
  decimalPlaces: number = 2
): number => {
  if (!isValidConersionInputs(targetAmount, rate)) {
    throw new Error(
      'Invalid conversion inputs: targetAmount and rate must be positive numbers'
    );
  }

  if (rate === 0) {
    throw new Error('Exchange rate cannot be zero');
  }

  const required = targetAmount / rate;
  const multiplier = Math.pow(10, decimalPlaces);
  return Math.round(required * multiplier) / multiplier;
};

/**
 * Calculate conversion fee
 * @param amount - The amount being converted
 * @param feePercentage - Fee as percentage (e.g., 1 for 1%)
 * @param decimalPlaces - Number of decimal places for rounding
 * @returns Fee amount
 */
export const calculateConversionFee = (
  amount: number,
  feePercentage: number,
  decimalPlaces: number = 2
): number => {
  if (amount <= 0 || feePercentage < 0) {
    throw new Error('Amount must be positive and fee must be non-negative');
  }

  const fee = (amount * feePercentage) / 100;
  const multiplier = Math.pow(10, decimalPlaces);
  return Math.round(fee * multiplier) / multiplier;
};

/**
 * Calculate net amount after fee
 * @param amount - The gross amount
 * @param feePercentage - Fee as percentage
 * @param decimalPlaces - Number of decimal places for rounding
 * @returns Remaining amount after fee
 */
export const calculateNetAmount = (
  amount: number,
  feePercentage: number,
  decimalPlaces: number = 2
): number => {
  const fee = calculateConversionFee(amount, feePercentage, decimalPlaces);
  return amount - fee;
};

/**
 * Calculate effective exchange rate (rate after fees)
 * @param baseRate - The base exchange rate
 * @param feePercentage - Fee as percentage
 * @returns Effective rate after fees
 */
export const calculateEffectiveRate = (
  baseRate: number,
  feePercentage: number
): number => {
  if (baseRate <= 0) {
    throw new Error('Base rate must be positive');
  }

  if (feePercentage < 0 || feePercentage >= 100) {
    throw new Error('Fee percentage must be between 0 and 100');
  }

  const feeMultiplier = 1 - feePercentage / 100;
  return baseRate * feeMultiplier;
};

/**
 * Validate conversion inputs
 * @param amount - The amount
 * @param rate - The exchange rate
 * @returns True if inputs are valid
 */
export const isValidConersionInputs = (
  amount: number,
  rate: number
): boolean => {
  return isFinite(amount) &&
    isFinite(rate) &&
    amount > 0 &&
    rate > 0;
};

/**
 * Compare two exchange rates
 * @param rate1 - First rate
 * @param rate2 - Second rate
 * @returns Percentage difference (-100 to +100, positive means rate1 is higher)
 */
export const compareExchangeRates = (rate1: number, rate2: number): number => {
  if (!isFinite(rate1) || !isFinite(rate2) || rate2 === 0) {
    throw new Error('Invalid rates for comparison');
  }

  return ((rate1 - rate2) / rate2) * 100;
};

/**
 * Round exchange rate to reasonable precision
 * @param rate - The exchange rate
 * @param decimalPlaces - Number of decimal places
 * @returns Rounded rate
 */
export const roundExchangeRate = (rate: number, decimalPlaces: number = 6): number => {
  if (!isFinite(rate)) {
    throw new Error('Invalid exchange rate');
  }

  const multiplier = Math.pow(10, decimalPlaces);
  return Math.round(rate * multiplier) / multiplier;
};
