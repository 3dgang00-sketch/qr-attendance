/**
 * Error Boundary Component
 * Catches errors in child components and displays fallback UI
 */

import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback({ error, errorInfo, reset: this.resetError });
      }

      // Default error UI
      return (
        <div
          style={{
            padding: '20px',
            margin: '20px',
            border: '1px solid #ff6b6b',
            borderRadius: '8px',
            backgroundColor: '#ffe0e0',
            color: '#c92a2a',
          }}
        >
          <h2 style={{ marginTop: 0 }}>Something went wrong</h2>
          <p>{error?.toString()}</p>
          {process.env.NODE_ENV === 'development' && (
            <details style={{ marginTop: '10px', padding: '10px', backgroundColor: '#fff3bf' }}>
              <summary>Error details (development only)</summary>
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
                {errorInfo?.componentStack}
              </pre>
            </details>
          )}
          <button
            onClick={this.resetError}
            style={{
              marginTop: '10px',
              padding: '8px 16px',
              backgroundColor: '#c92a2a',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Try again
          </button>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
