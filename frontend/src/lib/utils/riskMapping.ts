import { RiskLevel } from '@/types/recommendation';
import { VolatilityLevel } from '@/types/fx';

/**
 * Risk level configuration
 */
export interface RiskLevelConfig {
  level: RiskLevel;
  label: string;
  color: string;
  backgroundColor: string;
  description: string;
}

/**
 * Map risk score to risk level
 * @param score - Risk score between 0 and 1
 * @returns Risk level
 */
export const mapScoreToRiskLevel = (score: number): RiskLevel => {
  if (score <= 0.3) return 'low';
  if (score <= 0.7) return 'medium';
  return 'high';
};

/**
 * Get risk level configuration
 * @param level - Risk level
 * @returns Risk level configuration
 */
export const getRiskLevelConfig = (level: RiskLevel): RiskLevelConfig => {
  const configs: Record<RiskLevel, RiskLevelConfig> = {
    low: {
      level: 'low',
      label: 'Low Risk',
      color: '#10b981',
      backgroundColor: '#ecfdf5',
      description: 'Market conditions are stable with minimal volatility',
    },
    medium: {
      level: 'medium',
      label: 'Medium Risk',
      color: '#f59e0b',
      backgroundColor: '#fef3c7',
      description: 'Some market volatility detected, proceed with caution',
    },
    high: {
      level: 'high',
      label: 'High Risk',
      color: '#ef4444',
      backgroundColor: '#fee2e2',
      description: 'High market volatility, consider risk mitigation strategies',
    },
  };
  return configs[level];
};

/**
 * Volatility level configuration
 */
export interface VolatilityLevelConfig {
  level: VolatilityLevel;
  label: string;
  color: string;
  backgroundColor: string;
  meterPosition: number; // 0-100 for meter display
}

/**
 * Map volatility value to level
 * @param volatility - Volatility value between 0 and 1
 * @returns Volatility level
 */
export const mapVolatilityToLevel = (volatility: number): VolatilityLevel => {
  if (volatility <= 0.3) return 'low';
  if (volatility <= 0.7) return 'medium';
  return 'high';
};

/**
 * Get volatility level configuration
 * @param level - Volatility level
 * @returns Volatility level configuration
 */
export const getVolatilityLevelConfig = (level: VolatilityLevel): VolatilityLevelConfig => {
  const configs: Record<VolatilityLevel, VolatilityLevelConfig> = {
    low: {
      level: 'low',
      label: 'Low',
      color: '#10b981',
      backgroundColor: '#ecfdf5',
      meterPosition: 20,
    },
    medium: {
      level: 'medium',
      label: 'Medium',
      color: '#f59e0b',
      backgroundColor: '#fef3c7',
      meterPosition: 50,
    },
    high: {
      level: 'high',
      label: 'High',
      color: '#ef4444',
      backgroundColor: '#fee2e2',
      meterPosition: 85,
    },
  };
  return configs[level];
};

/**
 * Get meter color based on position
 * @param position - Position on meter (0-100)
 * @returns CSS color value
 */
export const getMeterColor = (position: number): string => {
  if (position <= 30) return '#10b981'; // Green
  if (position <= 70) return '#f59e0b'; // Yellow
  return '#ef4444'; // Red
};

/**
 * Map confidence score to display string
 * @param confidence - Confidence score between 0 and 1
 * @returns Display string
 */
export const mapConfidenceToDisplay = (confidence: number): string => {
  if (confidence >= 0.8) return 'Very High';
  if (confidence >= 0.6) return 'High';
  if (confidence >= 0.4) return 'Medium';
  if (confidence >= 0.2) return 'Low';
  return 'Very Low';
};

/**
 * Get gradient stops for risk/volatility meter
 */
export const getMeterGradientStops = (): string => {
  return 'linear-gradient(to right, #10b981 0%, #10b981 30%, #f59e0b 30%, #f59e0b 70%, #ef4444 70%, #ef4444 100%)';
};
