import React from 'react';
import styles from './Loader.module.css';

interface LoaderProps {
  fullPage?: boolean;
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Reusable Loader Component
 * Displays loading state with spinner
 */
export const Loader: React.FC<LoaderProps> = ({
  fullPage = false,
  message,
  size = 'md',
}) => {
  const containerClass = fullPage ? styles.loaderFullPage : styles.loaderInline;

  return (
    <div className={containerClass}>
      <div className={`${styles.spinner} ${styles[`spinner--${size}`]}`}>
        <div className={styles.spinnerInner}></div>
      </div>
      {message && <p className={styles.message}>{message}</p>}
    </div>
  );
};
