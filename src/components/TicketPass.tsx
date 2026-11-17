import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Sparkles, Trophy, MapPin, Calendar, CheckCircle2, QrCode, ArrowRight, Share2, Phone } from 'lucide-react';
import { AttendeeRegistration, PartyConfig } from '../types/party';
import { soundFX } from '../utils/audio';
import { usePreferences } from '../contexts/PreferencesContext';

interface TicketPassProps {
  registration: AttendeeRegistration;
  config: PartyConfig;
  onViewLiveDraw: () => void;
  onRegisterAnother: () => void;
}

export const TicketPass: React.FC<TicketPassProps> = ({
  registration,
  config,
  onViewLiveDraw,
  onRegisterAnother,
}) => {
  const { t } = usePreferences();

  useEffect(() => {
    soundFX.playCelebrationChime();
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#fbbf24', '#f59e0b', '#34d399', '#818cf8', '#f472b6'],
    });
  }, []);

  return (
    <div className="w-full max-w-md mx-auto flex flex-col items-center">
      {/* Top celebratory banner */}
      <div className="w-full text-center mb-5">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-1.5">
          <CheckCircle2 className="w-4 h-4" />
          <span>{t('ลงทะเบียนยืนยันตัวตนสำเร็จเรียบร้อย', 'Check-in Verified Successfully')}</span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          {t('บัตรเข้างานดิจิทัลของคุณ', 'Your Digital Event Pass')}
        </h2>
        <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
          {t('กรุณาแสดงบัตรนี้ ณ จุดต้อนรับและประจำโต๊ะเลี้ยง', 'Please present this pass at reception and your assigned table')}
        </p>
      </div>

      {/* Main Digital Ticket Badge */}
      <div className="w-full relative rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden">
        <div className="bg-zinc-900 dark:bg-gradient-to-r dark:from-zinc-900 dark:via-zinc-800 dark:to-zinc-900 border-b border-zinc-200 dark:border-zinc-800 p-4 text-center relative">
          <div className="text-[10px] font-bold tracking-widest text-amber-400">
            {config.ticketTitle || 'OFFICIAL PARTY PASS & TABLE PASS'}
          </div>
          <h3 className="text-lg font-bold tracking-wide text-zinc-100 mt-0.5">
            {config.eventName}
          </h3>
          <div className="flex items-center justify-center gap-3 text-[11px] text-zinc-300 dark:text-zinc-400 mt-1">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-amber-400" />
              {config.eventDate}
            </span>
          </div>
        </div>

        {/* Lanyard punch hole aesthetic */}
        <div className="w-10 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full mx-auto my-3 border border-zinc-300 dark:border-zinc-700" />

        <div className="p-5 pt-1 flex flex-col items-center">
          {/* Selfie Avatar */}
          <div className="relative mb-3">
            <div className="w-28 h-36 rounded-2xl overflow-hidden border-2 border-amber-500/70 dark:border-amber-400/70 shadow-xl bg-zinc-100 dark:bg-zinc-950">
              {registration.selfieUrl ? (
                <img
                  src={registration.selfieUrl}
                  alt={registration.fullName}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-zinc-500">
                  {t('ไม่มีรูปถ่าย', 'No Photo')}
                </div>
              )}
            </div>
          </div>

          {/* Attendee Info */}
          <div className="text-center mt-1 mb-4">
            <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              {t('รหัสพนักงาน', 'Employee ID')}{' '}
              <span className="font-mono text-amber-600 dark:text-amber-400 font-bold ml-1">
                {registration.employeeId}
              </span>
            </div>
            <h4 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight mt-0.5">
              {registration.fullName}
            </h4>
            <div className="flex items-center justify-center gap-2 text-xs text-zinc-600 dark:text-zinc-400 mt-1 flex-wrap">
              {registration.nickname && <span>{t(`คุณ${registration.nickname}`, registration.nickname)}</span>}
              {registration.nickname && <span aria-hidden="true">·</span>}
              <span>{registration.department}</span>
              {registration.phone && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 font-mono tabular-nums text-zinc-800 dark:text-zinc-300">
                    <Phone className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    {registration.phone}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* HIGHLIGHTED TABLE NUMBER */}
          <div className="w-full rounded-2xl bg-amber-50/70 dark:bg-zinc-950 border border-amber-400/50 dark:border-amber-400/40 p-4 text-center mb-4 animate-party-glow">
            <div className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center justify-center gap-1.5 mb-1">
              <Sparkles className="w-4 h-4" />
              <span>{t('ที่นั่งและหมายเลขโต๊ะของคุณ', 'Your Assigned Table')}</span>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              {registration.tableNumber}
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
              {t('อ้างอิงตามฐานข้อมูลจัดโต๊ะของฝ่ายจัดงาน', 'Assigned from the official event seating roster')}
            </p>
          </div>

          {/* Venue & Timestamp */}
          <div className="w-full border-t border-zinc-200 dark:border-zinc-800 pt-3 flex items-center justify-between text-[11px] text-zinc-600 dark:text-zinc-400">
            <div className="flex items-center gap-1 truncate max-w-[220px]">
              <MapPin className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="truncate">{config.eventVenue}</span>
            </div>
            <div className="flex items-center gap-1 font-mono text-emerald-600 dark:text-emerald-400 shrink-0 font-semibold">
              <QrCode className="w-3.5 h-3.5" />
              <span>VERIFIED</span>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Actions */}
      <div className="w-full mt-4 flex flex-col gap-2.5">
        <button
          type="button"
          onClick={() => {
            soundFX.playClick();
            onViewLiveDraw();
          }}
          className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-sm shadow-lg shadow-amber-500/15 flex items-center justify-center gap-2 active:scale-[0.98] transition cursor-pointer"
        >
          <Trophy className="w-5 h-5" />
          <span>{t('ดูผลรางวัล LIVE', 'Watch LIVE Draw')}</span>
          <ArrowRight className="w-4 h-4 ml-auto" />
        </button>

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
                alert(
                  t(
                    `บัตรลงทะเบียนสำเร็จ!\nชื่อ: ${registration.fullName}\nโต๊ะ: ${registration.tableNumber}`,
                    `Check-in Verified!\nName: ${registration.fullName}\nTable: ${registration.tableNumber}`
                  )
                );
              }
            }}
            className="flex-1 min-h-[44px] py-2 px-3 rounded-xl bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-semibold border border-zinc-200 dark:border-zinc-800 flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>{t('แชร์บัตร', 'Share Pass')}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundFX.playClick();
              onRegisterAnother();
            }}
            className="flex-1 min-h-[44px] py-2 px-3 rounded-xl bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-semibold border border-zinc-200 dark:border-zinc-800 flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <span>{t('ลงทะเบียนคนถัดไป', 'Next Check-in')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
