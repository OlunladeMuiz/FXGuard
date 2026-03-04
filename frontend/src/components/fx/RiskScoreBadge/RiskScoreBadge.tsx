'use client';

import React from 'react';
import styles from './RiskScoreBadge.module.css';
import { mapScoreToRiskLevel, getRiskLevelConfig } from '@/utils/riskMapping';

interface RiskScoreBadgeProps {
  riskScore: number; // 0-1 value
  showScore?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * RiskScoreBadge Component
 * Visual badge displaying risk level based on score
 * Presentation-only - receives risk score from hook
 * 
 * Risk levels:
 * - Low Risk: 0-0.3 (green)
 * - Medium Risk: 0.3-0.7 (yellow)
 * - High Risk: 0.7-1 (red)
 */
export const RiskScoreBadge: React.FC<RiskScoreBadgeProps> = ({
  riskScore,
  showScore = true,
  size = 'md',
}) => {
  // Clamp score between 0 and 1
  const clampedScore = Math.max(0, Math.min(1, riskScore));
  
  // Get level and configuration from utility
  const level = mapScoreToRiskLevel(clampedScore);
  const config = getRiskLevelConfig(level);

  return (
    <div 
      className={`${styles.badge} ${styles[`badge--${size}`]}`}
      style={{ 
        color: config.color,
        backgroundColor: config.backgroundColor,
        borderColor: config.color,
      }}
    >
      <span className={styles.indicator} style={{ backgroundColor: config.color }} />
      <span className={styles.label}>{config.label}</span>
      {showScore && (
        <span className={styles.score}>
          ({(clampedScore * 100).toFixed(0)}%)
        </span>
      )}
    </div>
  );
};

export default RiskScoreBadge;
