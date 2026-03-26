'use client';

import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('Unhandled render error:', error, errorInfo);
  }

  handleReload = (): void => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: '24px',
          background: 'linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)',
        }}
      >
        <section
          style={{
            width: '100%',
            maxWidth: '520px',
            padding: '32px',
            borderRadius: '24px',
            background: '#ffffff',
            boxShadow: '0 20px 40px rgba(15, 23, 42, 0.12)',
            textAlign: 'left',
          }}
        >
          <p
            style={{
              margin: '0 0 12px',
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#2563eb',
            }}
          >
            FXGuard
          </p>
          <h1
            style={{
              margin: '0 0 12px',
              fontSize: '28px',
              lineHeight: 1.2,
              color: '#0f172a',
            }}
          >
            Something went wrong while loading this page.
          </h1>
          <p
            style={{
              margin: '0 0 24px',
              color: '#475569',
              lineHeight: 1.6,
            }}
          >
            The app hit an unexpected problem. Refresh the page to try again, and if it keeps
            happening, check your deployment configuration or API connection.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            style={{
              border: 'none',
              borderRadius: '999px',
              padding: '12px 20px',
              background: '#0f172a',
              color: '#ffffff',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reload FXGuard
          </button>
        </section>
      </main>
    );
  }
}
