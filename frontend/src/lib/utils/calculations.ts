import { SavingsEstimate, BestRateComparisonData, FXHistoryPoint } from '@/types/fx';

/**
 * Calculate savings estimate comparing current rate vs average rate
 * @param amount - Invoice amount in base currency
 * @param currentRate - Current exchange rate
 * @param averageRate - Average rate over the period
 * @returns Savings estimate data
 */
export const calculateSavingsEstimate = (
  amount: number,
  currentRate: number,
  averageRate: number
): SavingsEstimate => {
  const currentConversion = amount * currentRate;
  const averageConversion = amount * averageRate;
  const savings = currentConversion - averageConversion;
  const savingsPercentage = averageRate > 0 
    ? ((currentRate - averageRate) / averageRate) * 100 
    : 0;

  return {
    amount,
    currentRate,
    averageRate,
    currentConversion,
    averageConversion,
    savings,
    savingsPercentage,
    isPositiveSavings: savings > 0,
  };
};

/**
 * Calculate best rate comparison for a given period
 * @param amount - Invoice amount in base currency
 * @param currentRate - Current exchange rate
 * @param historicalRates - Array of historical rate data points
 * @returns Best rate comparison data
 */
export const calculateBestRateComparison = (
  amount: number,
  currentRate: number,
  historicalRates: FXHistoryPoint[]
): BestRateComparisonData => {
  if (historicalRates.length === 0) {
    return {
      currentRate,
      bestRate: currentRate,
      bestRateDate: new Date().toISOString(),
      amountAtCurrentRate: amount * currentRate,
      amountAtBestRate: amount * currentRate,
      difference: 0,
      percentageDifference: 0,
    };
  }

  // Find the best (highest) rate in the period
  const firstRate = historicalRates[0]!;
  let bestRate = firstRate.rate;
  let bestRateDate = firstRate.date;

  for (const point of historicalRates) {
    if (point.rate > bestRate) {
      bestRate = point.rate;
      bestRateDate = point.date;
    }
  }

  const amountAtCurrentRate = amount * currentRate;
  const amountAtBestRate = amount * bestRate;
  const difference = amountAtBestRate - amountAtCurrentRate;
  const percentageDifference = currentRate > 0 
    ? ((bestRate - currentRate) / currentRate) * 100 
    : 0;

  return {
    currentRate,
    bestRate,
    bestRateDate,
    amountAtCurrentRate,
    amountAtBestRate,
    difference,
    percentageDifference,
  };
};

/**
 * Calculate volatility from historical rates
 * Uses standard deviation normalized by mean
 * @param rates - Array of rate values
 * @returns Volatility value between 0 and 1
 */
export const calculateVolatility = (rates: number[]): number => {
  if (rates.length < 2) return 0;

  const mean = rates.reduce((sum, rate) => sum + rate, 0) / rates.length;
  
  if (mean === 0) return 0;

  const squaredDiffs = rates.map(rate => Math.pow(rate - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / rates.length;
  const standardDeviation = Math.sqrt(avgSquaredDiff);
  
  // Coefficient of variation, normalized to 0-1 range
  // Typical FX volatility rarely exceeds 0.1 (10%), so we scale it
  const coefficientOfVariation = standardDeviation / mean;
  const normalizedVolatility = Math.min(coefficientOfVariation * 10, 1);

  return normalizedVolatility;
};

/**
 * Calculate percentage change between two values
 * @param current - Current value
 * @param previous - Previous value
 * @returns Percentage change
 */
export const calculatePercentageChange = (current: number, previous: number): number => {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
};

/**
 * Calculate the converted amount given base amount and rate
 * @param amount - Base amount
 * @param rate - Exchange rate
 * @returns Converted amount
 */
export const calculateConvertedAmount = (amount: number, rate: number): number => {
  return amount * rate;
};

/**
 * Format savings message for display
 * @param savings - Savings amount
 * @param currencySymbol - Currency symbol to display
 * @returns Formatted savings message
 */
export const formatSavingsMessage = (savings: number, currencySymbol: string): string => {
  const absSavings = Math.abs(savings);
  const formattedAmount = absSavings.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (savings > 0) {
    return `You save approximately ${currencySymbol}${formattedAmount} if converting today.`;
  } else if (savings < 0) {
    return `Converting today costs ${currencySymbol}${formattedAmount} more than average.`;
  }
  return `Current rate matches the average - no savings or loss.`;
};
