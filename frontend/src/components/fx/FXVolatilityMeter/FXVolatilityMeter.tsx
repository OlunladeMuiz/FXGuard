'use client';

import React from 'react';
import styles from './FXVolatilityMeter.module.css';
import { mapVolatilityToLevel, getVolatilityLevelConfig } from '@/utils/riskMapping';

interface FXVolatilityMeterProps {
  volatility: number; // 0-1 value
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * FXVolatilityMeter Component
 * Visual meter displaying FX volatility level
 * Presentation-only - receives volatility value from hook
 */
export const FXVolatilityMeter: React.FC<FXVolatilityMeterProps> = ({
  volatility,
  showLabel = true,
  size = 'md',
}) => {
  // Clamp volatility between 0 and 1
  const clampedVolatility = Math.max(0, Math.min(1, volatility));
  
  // Get level and configuration from utility
  const level = mapVolatilityToLevel(clampedVolatility);
  const config = getVolatilityLevelConfig(level);
  
  // Calculate meter position (0-100%)
  const meterPosition = clampedVolatility * 100;

  return (
    <div className={`${styles.container} ${styles[`container--${size}`]}`}>
      {showLabel && (
        <div className={styles.header}>
          <span className={styles.title}>FX Volatility</span>
          <span 
            className={styles.levelBadge}
            style={{ 
              color: config.color,
              backgroundColor: config.backgroundColor,
            }}
          >
            {config.label}
          </span>
        </div>
      )}
      
      <div className={styles.meterWrapper}>
        <div className={styles.meterTrack}>
          <div className={styles.meterGradient} />
          <div 
            className={styles.meterIndicator}
            style={{ left: `${meterPosition}%` }}
          />
        </div>
        
        <div className={styles.meterLabels}>
          <span className={styles.meterLabel}>Low</span>
          <span className={styles.meterLabel}>Medium</span>
          <span className={styles.meterLabel}>High</span>
        </div>
      </div>

      <div className={styles.valueDisplay}>
        <span className={styles.valueNumber}>
          {(clampedVolatility * 100).toFixed(1)}%
        </span>
        <span className={styles.valueLabel}>volatility index</span>
      </div>
    </div>
  );
};

export default FXVolatilityMeter;
