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
        <div className="min-h-screen bg-gradient-to-br from-rose-50 via-amber-50 to-cyan-50 dark:bg-[#0b041c] text-slate-900 dark:text-white flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#140a2b] border-2 border-rose-300 dark:border-rose-500/40 p-6 sm:p-8 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-rose-500 via-amber-400 to-fuchsia-500" />
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center mx-auto mb-4 text-white shadow-lg shadow-rose-500/30">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-extrabold text-slate-900 dark:text-white mb-2">
              {isEn ? 'Something went wrong' : 'ระบบขัดข้องชั่วคราว'}
            </h2>
            <p className="text-xs text-slate-600 dark:text-purple-200/80 mb-4 leading-relaxed break-words">
              {friendlyDetail}
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => this.setState({ hasError: false, errorMessage: '' })}
                className="min-h-[48px] w-full py-2.5 px-5 rounded-xl bg-gradient-to-r from-fuchsia-600 via-rose-500 to-amber-500 hover:from-fuchsia-500 hover:to-amber-400 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>{isEn ? 'Continue / Retry' : 'ลองเชื่อมต่อใหม่อีกครั้ง'}</span>
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="min-h-[42px] w-full py-2 px-4 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-700 dark:text-purple-100 font-bold text-xs transition cursor-pointer"
              >
                {isEn ? 'Reload Page' : 'โหลดหน้าเว็บใหม่'}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
