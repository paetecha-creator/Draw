import React, { useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Info, ShieldAlert, X } from 'lucide-react';
import { usePreferences } from '../contexts/PreferencesContext';
import { soundFX } from '../utils/audio';

export type PartyDialogVariant = 'warning' | 'danger' | 'info' | 'success';

export interface PartyDialogState {
  isOpen: boolean;
  mode: 'alert' | 'confirm';
  variant: PartyDialogVariant;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirmAction?: () => void;
}

interface PartyDialogModalProps {
  dialog: PartyDialogState;
  onClose: () => void;
}

export const PartyDialogModal: React.FC<PartyDialogModalProps> = ({ dialog, onClose }) => {
  const { t } = usePreferences();

  useEffect(() => {
    if (!dialog.isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        soundFX.playClick();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dialog.isOpen, onClose]);

  if (!dialog.isOpen) return null;

  const variantConfig: Record<
    PartyDialogVariant,
    {
      borderGradient: string;
      iconBg: string;
      btnGradient: string;
      icon: React.ReactNode;
      badgeText: string;
    }
  > = {
    warning: {
      borderGradient: 'from-amber-400 via-orange-500 to-fuchsia-500',
      iconBg: 'from-amber-400 to-orange-500 shadow-amber-500/30',
      btnGradient:
        'from-amber-500 via-orange-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 shadow-amber-500/25',
      icon: <AlertTriangle className="w-7 h-7 text-white" />,
      badgeText: t('แจ้งเตือนระบบ', 'SYSTEM NOTICE'),
    },
    danger: {
      borderGradient: 'from-rose-500 via-red-500 to-amber-500',
      iconBg: 'from-rose-500 to-red-600 shadow-rose-500/30',
      btnGradient:
        'from-rose-600 via-red-500 to-orange-500 hover:from-rose-500 hover:to-orange-400 shadow-rose-500/25',
      icon: <ShieldAlert className="w-7 h-7 text-white" />,
      badgeText: t('ยืนยันการดำเนินการ', 'CONFIRM ACTION'),
    },
    info: {
      borderGradient: 'from-cyan-400 via-fuchsia-500 to-violet-500',
      iconBg: 'from-cyan-500 to-fuchsia-600 shadow-cyan-500/30',
      btnGradient:
        'from-fuchsia-600 via-violet-500 to-cyan-500 hover:from-fuchsia-500 hover:to-cyan-400 shadow-fuchsia-500/25',
      icon: <Info className="w-7 h-7 text-white" />,
      badgeText: t('ข้อมูลระบบ', 'INFORMATION'),
    },
    success: {
      borderGradient: 'from-emerald-400 via-cyan-400 to-teal-500',
      iconBg: 'from-emerald-500 to-cyan-500 shadow-emerald-500/30',
      btnGradient:
        'from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 shadow-emerald-500/25',
      icon: <CheckCircle2 className="w-7 h-7 text-white" />,
      badgeText: t('สำเร็จเรียบร้อย', 'SUCCESS'),
    },
  };

  const style = variantConfig[dialog.variant] || variantConfig.warning;

  const handleConfirm = () => {
    soundFX.playClick();
    const action = dialog.onConfirmAction;
    onClose();
    if (action) {
      action();
    }
  };

  const handleCancel = () => {
    soundFX.playClick();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="party-dialog-title"
      onClick={handleCancel}
    >
      <div
        className={`w-full max-w-md rounded-3xl p-[2px] bg-gradient-to-br ${style.borderGradient} shadow-2xl animate-in zoom-in-95 duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rounded-[22px] bg-white dark:bg-[#140a2b] p-6 relative overflow-hidden">
          <button
            type="button"
            onClick={handleCancel}
            className="absolute top-3.5 right-3.5 w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-500 dark:text-purple-200 flex items-center justify-center transition cursor-pointer"
            aria-label={t('ปิดหน้าต่าง', 'Close')}
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex flex-col items-center text-center pt-1">
            <div
              className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${style.iconBg} shadow-lg flex items-center justify-center mb-3.5`}
            >
              {style.icon}
            </div>

            <span className="text-[10px] font-black tracking-widest uppercase text-fuchsia-600 dark:text-amber-300 mb-1">
              {style.badgeText}
            </span>

            <h3
              id="party-dialog-title"
              className="text-lg font-extrabold text-slate-900 dark:text-white leading-snug"
            >
              {dialog.title}
            </h3>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-purple-100/90 mt-2.5 leading-relaxed whitespace-pre-line">
              {dialog.message}
            </p>
          </div>

          <div className="mt-6 flex flex-col-reverse sm:flex-row items-center justify-center gap-2.5">
            {dialog.mode === 'confirm' && (
              <button
                type="button"
                onClick={handleCancel}
                className="w-full sm:flex-1 min-h-[46px] px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-700 dark:text-purple-100 font-bold text-xs border border-slate-200 dark:border-purple-500/30 transition active:scale-[0.98] cursor-pointer"
              >
                {dialog.cancelText || t('ยกเลิก', 'Cancel')}
              </button>
            )}

            <button
              type="button"
              onClick={handleConfirm}
              className={`w-full sm:flex-1 min-h-[46px] px-5 py-2.5 rounded-xl bg-gradient-to-r ${style.btnGradient} text-white font-extrabold text-xs shadow-lg transition active:scale-[0.98] cursor-pointer`}
            >
              {dialog.confirmText ||
                (dialog.mode === 'confirm' ? t('ยืนยันดำเนินการ', 'Confirm') : t('ตกลง', 'OK'))}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
