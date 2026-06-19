'use client';

import { Component, type ReactNode, type ErrorInfo } from 'react';

interface State {
  hasError: boolean;
  error: Error | null;
  componentStack: string | null;
}

export class DebugErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false, error: null, componentStack: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(_error: Error, info: ErrorInfo) {
    this.setState({ componentStack: info.componentStack ?? null });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: '#111', color: '#fff',
          fontFamily: 'monospace',
          padding: 16, overflow: 'auto',
        }}>
          <div style={{ color: '#ff5555', fontSize: 13, fontWeight: 'bold', marginBottom: 12 }}>
            {this.state.error?.message ?? 'Unknown error'}
          </div>

          <div style={{ color: '#ffb86c', fontSize: 11, marginBottom: 4 }}>COMPONENT STACK:</div>
          <pre style={{
            background: '#222', padding: 10, borderRadius: 4,
            whiteSpace: 'pre-wrap', wordBreak: 'break-all',
            color: '#50fa7b', fontSize: 10, marginBottom: 16,
          }}>
            {this.state.componentStack || '(none)'}
          </pre>

          <div style={{ color: '#ffb86c', fontSize: 11, marginBottom: 4 }}>JS STACK:</div>
          <pre style={{
            background: '#222', padding: 10, borderRadius: 4,
            whiteSpace: 'pre-wrap', wordBreak: 'break-all',
            color: '#8be9fd', fontSize: 10,
          }}>
            {this.state.error?.stack || '(none)'}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
