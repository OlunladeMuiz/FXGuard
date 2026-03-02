import React from 'react';
import styles from './Card.module.css';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevation?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

/**
 * Reusable Card Component
 * Container for content with consistent styling
 */
export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      elevation = 'md',
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const cardClasses = [
      styles.card,
      styles[`card--${elevation}`],
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div ref={ref} className={cardClasses} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
