import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    (this as any).state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    const s = (this as any).state as State;
    const p = (this as any).props as Props;
    if (s.hasError) {
      return (
        <div style={{ color: 'red', padding: '20px', background: '#000', minHeight: '100vh' }}>
          <h1>Something went wrong.</h1>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{s.error?.message}</pre>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '10px' }}>{s.error?.stack}</pre>
        </div>
      );
    }

    return p.children;
  }
}
