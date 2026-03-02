'use client';

import React from 'react';
import styles from './GlassButton.module.css';

type ButtonSize = 'sm' | 'default' | 'lg' | 'icon';
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: ButtonSize;
  variant?: ButtonVariant; // Accepted for compatibility, glass style applied regardless
  isLoading?: boolean;
  contentClassName?: string;
  children: React.ReactNode;
}

/**
 * GlassButton Component
 * A modern glass-morphism styled button with blur effects
 */
export const GlassButton: React.FC<GlassButtonProps> = ({
  size = 'default',
  variant: _variant, // Accepted but not used - glass style is uniform
  isLoading = false,
  contentClassName = '',
  children,
  className = '',
  disabled,
  ...props
}) => {
  const sizeClass = styles[size] || styles.default;
  const isDisabled = disabled || isLoading;

  return (
    <button
      className={`${styles.glassButton} ${sizeClass} ${className}`}
      disabled={isDisabled}
      {...props}
    >
      <span className={styles.glassLayer} />
      <span className={styles.glassHighlight} />
      <span className={`${styles.content} ${contentClassName}`}>
        {isLoading ? (
          <span className={styles.spinner} />
        ) : (
          children
        )}
      </span>
    </button>
  );
};

export default GlassButton;
