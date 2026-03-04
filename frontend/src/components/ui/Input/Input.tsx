import React from 'react';
import styles from './Input.module.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string | undefined;
  error?: string | undefined;
  icon?: React.ReactNode | undefined;
  helperText?: string | undefined;
}

/**
 * Reusable Input Component
 * Supports labels, error messages, and helper text
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      icon,
      helperText,
      className = '',
      ...props
    },
    ref
  ) => {
    const inputId = props.id || `input-${Math.random()}`;

    return (
      <div className={`${styles.inputWrapper} ${className}`}>
        {label && (
          <label htmlFor={inputId} className={styles.label}>
            {label}
          </label>
        )}
        <div className={styles.inputContainer}>
          {icon && <span className={styles.icon}>{icon}</span>}
          <input
            ref={ref}
            id={inputId}
            className={`${styles.input} ${error ? styles['input--error'] : ''} ${
              icon ? styles['input--withIcon'] : ''
            }`}
            {...props}
          />
        </div>
        {error && <p className={styles.error}>{error}</p>}
        {helperText && !error && (
          <p className={styles.helperText}>{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
