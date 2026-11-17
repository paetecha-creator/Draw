import React, { useEffect, useState, useCallback } from 'react';
import { Delete, ShieldCheck, X, AlertCircle } from 'lucide-react';
import { soundFX } from '../utils/audio';
import { usePreferences } from '../contexts/PreferencesContext';

interface NumpadPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  expectedPin: string;
  title: string;
  subtitle: string;
  icon?: React.ReactNode;
}

export const NumpadPinModal: React.FC<NumpadPinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  expectedPin,
  title,
  subtitle,
  icon,
}) => {
  const { t } = usePreferences();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);

  const pinLength = expectedPin.length;

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError(null);
      setIsShaking(false);
    }
  }, [isOpen, expectedPin]);

  const handleDigit = useCallback(
    (digit: string) => {
      if (isShaking) return;
      soundFX.playClick();
      setError(null);

      setPin((prev) => {
        if (prev.length >= pinLength) return prev;
        const next = prev + digit;

        if (next.length === pinLength) {
          if (next === expectedPin) {
            soundFX.playCelebrationChime();
            setTimeout(() => {
              setPin('');
              onSuccess();
            }, 60);
          } else {
            setIsShaking(true);
            setError(
              t(
                `รหัส PIN ${pinLength} หลักไม่ถูกต้อง กรุณาลองใหม่`,
                `Invalid ${pinLength}-digit PIN. Please try again.`
              )
            );
            setTimeout(() => {
              setPin('');
              setIsShaking(false);
            }, 500);
          }
        }

        return next;
      });
    },
    [expectedPin, isShaking, onSuccess, pinLength, t]
  );

  const handleBackspace = useCallback(() => {
    if (isShaking) return;
    soundFX.playClick();
    setError(null);
    setPin((prev) => prev.slice(0, -1));
  }, [isShaking]);

  const handleClear = useCallback(() => {
    if (isShaking) return;
    soundFX.playClick();
    setError(null);
    setPin('');
  }, [isShaking]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, handleDigit, handleBackspace, onClose]);

  if (!isOpen) return null;

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 dark:bg-[#050212]/85 backdrop-blur-md"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[340px] rounded-3xl bg-white dark:bg-[#140a2b] border-2 border-fuchsia-300/80 dark:border-fuchsia-500/40 p-5 sm:p-6 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-fuchsia-500 via-amber-400 to-cyan-400" />
        <button
          type="button"
          onClick={() => {
            soundFX.playClick();
            onClose();
          }}
          className="min-h-[44px] min-w-[44px] absolute top-3 right-3 text-slate-500 dark:text-purple-300 hover:text-slate-900 dark:hover:text-white flex items-center justify-center rounded-xl hover:bg-fuchsia-50 dark:hover:bg-white/10 transition cursor-pointer"
          aria-label={t('ปิดหน้าต่าง', 'Close')}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-5 pt-1">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-fuchsia-500 via-violet-500 to-cyan-500 flex items-center justify-center mx-auto mb-3 text-white shadow-lg shadow-fuchsia-500/30">
            {icon || <ShieldCheck className="w-6 h-6" />}
          </div>
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">{title}</h3>
          <p className="text-xs text-slate-600 dark:text-purple-200/80 mt-1">{subtitle}</p>
        </div>

        {/* PIN Dots Indicator */}
        <div
          className={`flex items-center justify-center gap-2.5 my-5 transition-transform ${
            isShaking ? 'translate-x-1.5' : ''
          }`}
        >
          {Array.from({ length: pinLength }).map((_, idx) => {
            const filled = idx < pin.length;
            return (
              <div
                key={idx}
                className={`rounded-full transition-all duration-150 ${
                  pinLength > 6 ? 'w-3 h-3' : 'w-3.5 h-3.5'
                } ${
                  isShaking
                    ? 'bg-rose-500 border-rose-500 scale-110'
                    : filled
                    ? 'bg-gradient-to-r from-fuchsia-500 to-cyan-400 scale-125 shadow-[0_0_12px_rgba(236,72,153,0.6)]'
                    : 'bg-slate-100 dark:bg-[#0b051c] border-2 border-fuchsia-200 dark:border-purple-500/40'
                }`}
              />
            );
          })}
        </div>

        {/* Error Alert */}
        <div className="min-h-[28px] mb-3 flex items-center justify-center">
          {error ? (
            <div className="px-3 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-[11px] font-semibold flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          ) : (
            <span className="text-[11px] text-slate-500 dark:text-purple-300/70">
              {t(`กดรหัส ${pinLength} หลัก — เข้าใช้งานอัตโนมัติทันที`, `Enter ${pinLength}-digit PIN — unlocks automatically`)}
            </span>
          )}
        </div>

        {/* Ergonomic 3x4 Touch Numpad */}
        <div className="grid grid-cols-3 gap-2.5 select-none">
          {digits.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => handleDigit(d)}
              className="min-h-[56px] rounded-2xl bg-gradient-to-b from-fuchsia-50/80 to-cyan-50/80 dark:from-white/5 dark:to-white/[0.02] hover:from-fuchsia-100 hover:to-cyan-100 dark:hover:from-fuchsia-500/20 dark:hover:to-cyan-500/20 active:bg-gradient-to-r active:from-fuchsia-500 active:to-cyan-500 active:text-white border border-fuchsia-200 dark:border-purple-500/30 text-slate-900 dark:text-white text-xl font-bold font-mono tabular-nums flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-sm"
            >
              {d}
            </button>
          ))}

          <button
            type="button"
            onClick={handleClear}
            className="min-h-[56px] rounded-2xl bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center justify-center transition-all active:scale-95 cursor-pointer"
          >
            {t('ล้าง', 'Clear')}
          </button>

          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="min-h-[56px] rounded-2xl bg-gradient-to-b from-fuchsia-50/80 to-cyan-50/80 dark:from-white/5 dark:to-white/[0.02] hover:from-fuchsia-100 hover:to-cyan-100 dark:hover:from-fuchsia-500/20 dark:hover:to-cyan-500/20 active:bg-gradient-to-r active:from-fuchsia-500 active:to-cyan-500 active:text-white border border-fuchsia-200 dark:border-purple-500/30 text-slate-900 dark:text-white text-xl font-bold font-mono tabular-nums flex items-center justify-center transition-all active:scale-95 cursor-pointer shadow-sm"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleBackspace}
            className="min-h-[56px] rounded-2xl bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 border border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-300 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
            aria-label={t('ลบตัวเลข', 'Backspace')}
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
