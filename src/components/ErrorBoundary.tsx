import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    errorMessage: '',
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล',
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in ErrorBoundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let friendlyDetail = this.state.errorMessage;
      try {
        const parsed = JSON.parse(this.state.errorMessage);
        if (parsed?.error) {
          friendlyDetail = `${parsed.operationType?.toUpperCase() || 'DB'}: ${parsed.error}`;
        }
      } catch {
        // non-JSON error message
      }

      const isEn = typeof document !== 'undefined' && document.documentElement.lang === 'en';

      return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 sm:p-8 text-center shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto mb-4 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">
              {isEn ? 'Something went wrong' : 'ระบบขัดข้องชั่วคราว'}
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-4 leading-relaxed break-words">
              {friendlyDetail}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="min-h-[48px] w-full py-2.5 px-5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>{isEn ? 'Reload Page' : 'โหลดหน้าเว็บใหม่อีกครั้ง'}</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
