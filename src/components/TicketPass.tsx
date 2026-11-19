import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Sparkles, MapPin, Calendar, CheckCircle2, QrCode, Share2, Phone } from 'lucide-react';
import { AttendeeRegistration, PartyConfig } from '../types/party';
import { soundFX } from '../utils/audio';
import { usePreferences } from '../contexts/PreferencesContext';
import { PartyDialogModal, PartyDialogState } from './PartyDialogModal';

interface TicketPassProps {
  registration: AttendeeRegistration;
  config: PartyConfig;
  onRegisterAnother: () => void;
}

export const TicketPass: React.FC<TicketPassProps> = ({
  registration,
  config,
  onRegisterAnother,
}) => {
  const { t } = usePreferences();
  const [dialog, setDialog] = useState<PartyDialogState>({
    isOpen: false,
    mode: 'alert',
    variant: 'success',
    title: '',
    message: '',
  });

  useEffect(() => {
    soundFX.playCelebrationChime();
    confetti({
      particleCount: 90,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#ec4899', '#fbbf24', '#06b6d4', '#10b981', '#8b5cf6'],
    });
  }, []);

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center">
      {/* Top celebratory banner */}
      <div className="w-full text-center mb-5">
        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1.5">
          <CheckCircle2 className="w-4 h-4" />
          <span>{t('ลงทะเบียนยืนยันตัวตนสำเร็จเรียบร้อย', 'Check-in Verified Successfully')}</span>
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-fuchsia-600 via-orange-500 to-cyan-600 dark:from-amber-300 dark:via-fuchsia-400 dark:to-cyan-300 bg-clip-text text-transparent">
          {t('บัตรเข้างานดิจิทัลของคุณ', 'Your Digital Event Pass')}
        </h2>
        <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1">
          {t('กรุณาแสดงบัตรนี้ ณ จุดต้อนรับและประจำโต๊ะเลี้ยง', 'Please present this pass at reception and your assigned table')}
        </p>
      </div>

      {/* Main Digital Ticket Badge */}
      <div className="w-full relative rounded-3xl bg-white/95 dark:bg-[#140a2b]/95 border-2 border-fuchsia-400/60 dark:border-fuchsia-500/40 shadow-2xl shadow-fuchsia-500/15 overflow-hidden">
        <div className="bg-gradient-to-r from-fuchsia-600 via-violet-600 to-cyan-500 p-4 text-center relative">
          <div className="text-[10px] font-bold tracking-widest text-amber-200 uppercase">
            {config.ticketTitle || 'OFFICIAL PARTY PASS & TABLE PASS'}
          </div>
          <h3 className="text-lg font-extrabold tracking-wide text-white mt-0.5">
            {config.eventName}
          </h3>
          <div className="flex items-center justify-center gap-3 text-[11px] text-white/90 mt-1">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-amber-300" />
              {config.eventDate}
            </span>
          </div>
        </div>

        {/* Lanyard punch hole aesthetic */}
        <div className="w-10 h-1.5 bg-gradient-to-r from-fuchsia-300 via-amber-300 to-cyan-300 dark:from-fuchsia-700 dark:via-amber-600 dark:to-cyan-700 rounded-full mx-auto my-3" />

        <div className="p-5 pt-1 flex flex-col items-center">
          {/* Uploaded Photo Avatar */}
          <div className="relative mb-3 p-1 rounded-2xl bg-gradient-to-tr from-fuchsia-500 via-amber-400 to-cyan-400 shadow-xl">
            <div className="w-28 h-36 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-950">
              {registration.selfieUrl ? (
                <img
                  src={registration.selfieUrl}
                  alt={registration.fullName}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-zinc-500">
                  {t('ไม่มีรูปภาพ', 'No Photo')}
                </div>
              )}
            </div>
          </div>

          {/* Attendee Info */}
          <div className="text-center mt-1 mb-4">
            <div className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
              {t('รหัสพนักงาน', 'Employee ID')}{' '}
              <span className="font-mono text-fuchsia-600 dark:text-amber-300 font-bold ml-1">
                {registration.employeeId}
              </span>
            </div>
            <h4 className="text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight mt-0.5">
              {registration.fullName}
            </h4>
            <div className="flex items-center justify-center gap-2 text-xs text-zinc-600 dark:text-zinc-300 mt-1 flex-wrap">
              {registration.nickname && <span>{t(`คุณ${registration.nickname}`, registration.nickname)}</span>}
              {registration.nickname && <span aria-hidden="true">·</span>}
              <span>{registration.department}</span>
              {registration.phone && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 font-mono tabular-nums text-zinc-800 dark:text-zinc-200">
                    <Phone className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                    {registration.phone}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* HIGHLIGHTED TABLE NUMBER */}
          <div className="w-full rounded-2xl bg-gradient-to-r from-fuchsia-500/15 via-amber-400/20 to-cyan-500/15 dark:from-fuchsia-500/20 dark:via-amber-500/15 dark:to-cyan-500/20 border-2 border-amber-400/60 p-4 text-center mb-4 animate-party-glow">
            <div className="text-xs font-bold text-fuchsia-700 dark:text-amber-300 flex items-center justify-center gap-1.5 mb-1">
              <Sparkles className="w-4 h-4" />
              <span>{t('ที่นั่งและหมายเลขโต๊ะของคุณ', 'Your Assigned Table')}</span>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
              {registration.tableNumber}
            </div>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-300 mt-1">
              {t('อ้างอิงตามฐานข้อมูลจัดโต๊ะของฝ่ายจัดงาน', 'Assigned from the official event seating roster')}
            </p>
          </div>

          {/* Venue & Timestamp */}
          <div className="w-full border-t border-fuchsia-200/70 dark:border-violet-800 pt-3 flex items-center justify-between text-[11px] text-zinc-600 dark:text-zinc-300">
            <div className="flex items-center gap-1 truncate max-w-[220px]">
              <MapPin className="w-3.5 h-3.5 text-fuchsia-600 dark:text-cyan-400 shrink-0" />
              <span className="truncate">{config.eventVenue}</span>
            </div>
            <div className="flex items-center gap-1 font-mono text-emerald-600 dark:text-emerald-400 shrink-0 font-bold">
              <QrCode className="w-3.5 h-3.5" />
              <span>VERIFIED</span>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Actions */}
      <div className="w-full mt-4 flex flex-col gap-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              soundFX.playClick();
              if (navigator.share) {
                navigator.share({
                  title: `${config.eventName} - ${t('บัตรเข้างาน', 'Event Pass')}`,
                  text: t(
                    `ฉันลงทะเบียนเข้างานแล้ว! ได้นั่ง ${registration.tableNumber}`,
                    `I checked in! Assigned to ${registration.tableNumber}`
                  ),
                }).catch(() => {});
              } else {
                setDialog({
                  isOpen: true,
                  mode: 'alert',
                  variant: 'success',
                  title: t('บัตรลงทะเบียนสำเร็จ!', 'Check-in Verified!'),
                  message: t(
                    `ชื่อ: ${registration.fullName}\nรหัสพนักงาน: ${registration.employeeId}\nหมายเลขโต๊ะ: ${registration.tableNumber}`,
                    `Name: ${registration.fullName}\nEmployee ID: ${registration.employeeId}\nAssigned Table: ${registration.tableNumber}`
                  ),
                });
              }
            }}
            className="flex-1 min-h-[44px] py-2 px-3 rounded-xl bg-white dark:bg-violet-950/70 hover:bg-fuchsia-50 dark:hover:bg-violet-900 text-zinc-800 dark:text-zinc-100 text-xs font-bold border border-fuchsia-300/60 dark:border-violet-700 flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5 text-fuchsia-600 dark:text-cyan-400" />
            <span>{t('แชร์บัตร', 'Share Pass')}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundFX.playClick();
              onRegisterAnother();
            }}
            className="flex-1 min-h-[44px] py-2 px-3 rounded-xl bg-white dark:bg-violet-950/70 hover:bg-cyan-50 dark:hover:bg-violet-900 text-zinc-800 dark:text-zinc-100 text-xs font-bold border border-cyan-300/60 dark:border-violet-700 flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <span>{t('ลงทะเบียนคนถัดไป', 'Next Check-in')}</span>
          </button>
        </div>
      </div>

      <PartyDialogModal
        dialog={dialog}
        onClose={() => setDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
