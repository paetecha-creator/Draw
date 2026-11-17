import React, { useEffect, useState, useCallback } from 'react';
import { Delete, ShieldCheck, X, AlertCircle } from 'lucide-react';
import { soundFX } from '../utils/audio';

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
            setError(`รหัส PIN ${pinLength} หลักไม่ถูกต้อง กรุณาลองใหม่`);
            setTimeout(() => {
              setPin('');
              setIsShaking(false);
            }, 500);
          }
        }

        return next;
      });
    },
    [expectedPin, isShaking, onSuccess, pinLength]
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[340px] rounded-3xl bg-zinc-900 border border-zinc-800 p-5 sm:p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={() => {
            soundFX.playClick();
            onClose();
          }}
          className="min-h-[44px] min-w-[44px] absolute top-3 right-3 text-zinc-400 hover:text-zinc-100 flex items-center justify-center rounded-xl hover:bg-zinc-800 transition cursor-pointer"
          aria-label="ปิดหน้าต่าง"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-5 pt-1">
          <div className="w-12 h-12 rounded-2xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center mx-auto mb-3 text-amber-400">
            {icon || <ShieldCheck className="w-6 h-6" />}
          </div>
          <h3 className="text-lg font-bold text-zinc-100 tracking-tight">{title}</h3>
          <p className="text-xs text-zinc-400 mt-1">{subtitle}</p>
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
                    ? 'bg-rose-400 border-rose-400 scale-110'
                    : filled
                    ? 'bg-amber-400 border-amber-300 scale-110 shadow-[0_0_10px_rgba(251,191,36,0.45)]'
                    : 'bg-zinc-950 border border-zinc-700'
                }`}
              />
            );
          })}
        </div>

        {/* Error Alert */}
        <div className="min-h-[28px] mb-3 flex items-center justify-center">
          {error ? (
            <div className="px-3 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px] font-semibold flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          ) : (
            <span className="text-[11px] text-zinc-500">
              กดรหัส {pinLength} หลัก — เข้าใช้งานอัตโนมัติทันที
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
              className="min-h-[56px] rounded-2xl bg-zinc-950 hover:bg-zinc-800 active:bg-amber-400 active:text-zinc-950 border border-zinc-800 text-zinc-100 text-xl font-bold font-mono tabular-nums flex items-center justify-center transition-all active:scale-95 cursor-pointer"
            >
              {d}
            </button>
          ))}

          <button
            type="button"
            onClick={handleClear}
            className="min-h-[56px] rounded-2xl bg-zinc-950/70 hover:bg-zinc-800 border border-zinc-800/80 text-zinc-400 hover:text-zinc-200 text-xs font-semibold flex items-center justify-center transition-all active:scale-95 cursor-pointer"
          >
            ล้าง
          </button>

          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="min-h-[56px] rounded-2xl bg-zinc-950 hover:bg-zinc-800 active:bg-amber-400 active:text-zinc-950 border border-zinc-800 text-zinc-100 text-xl font-bold font-mono tabular-nums flex items-center justify-center transition-all active:scale-95 cursor-pointer"
          >
            0
          </button>

          <button
            type="button"
            onClick={handleBackspace}
            className="min-h-[56px] rounded-2xl bg-zinc-950/70 hover:bg-zinc-800 border border-zinc-800/80 text-zinc-400 hover:text-zinc-200 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
            aria-label="ลบตัวเลข"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
