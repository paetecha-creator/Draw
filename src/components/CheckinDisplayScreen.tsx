import React, { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  Users,
  UserCheck,
  TrendingUp,
  CheckCircle2,
  Clock,
  Copy,
  Maximize2,
  Minimize2,
  ArrowLeft,
  Sparkles,
  MapPin,
  Lock,
  Trophy,
  HelpCircle,
} from 'lucide-react';
import { AttendeeRegistration, PartyConfig } from '../types/party';
import { FirestoreService } from '../services/firestoreService';
import { soundFX } from '../utils/audio';
import { usePreferences } from '../contexts/PreferencesContext';

const PUBLIC_REGISTRATION_URL = 'https://tseventdraw.vercel.app/';

interface CheckinDisplayScreenProps {
  config: PartyConfig;
  isAdminLoggedIn: boolean;
  isFullscreen?: boolean;
  onFullscreenChange?: (fullscreen: boolean) => void;
  onBackToAdmin?: () => void;
}

export const CheckinDisplayScreen: React.FC<CheckinDisplayScreenProps> = ({
  config,
  isAdminLoggedIn,
  isFullscreen: controlledFullscreen,
  onFullscreenChange,
  onBackToAdmin,
}) => {
  const { t, lang } = usePreferences();
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [latestRegistrations, setLatestRegistrations] = useState<AttendeeRegistration[]>([]);
  const [checkedInCount, setCheckedInCount] = useState<number>(0);
  const [totalRosterCount, setTotalRosterCount] = useState<number>(() =>
    FirestoreService.getCachedRoster().length
  );
  const [localFullscreen, setLocalFullscreen] = useState(false);
  const [copiedType, setCopiedType] = useState<'register' | 'display' | null>(null);
  const [newestId, setNewestId] = useState<string | null>(null);

  const isFullscreen =
    typeof controlledFullscreen === 'boolean' ? controlledFullscreen : localFullscreen;

  const setFullscreenState = (next: boolean) => {
    setLocalFullscreen(next);
    onFullscreenChange?.(next);
  };

  const seenIdsRef = useRef<Set<string>>(new Set());
  const baseCountLoadedRef = useRef(false);

  // Public registration URL encoded in QR Code
  const registrationUrl = PUBLIC_REGISTRATION_URL;

  const displayShareUrl = useMemo(() => {
    if (typeof window === 'undefined') return `${PUBLIC_REGISTRATION_URL}?checkin=1`;
    return `${window.location.origin}${window.location.pathname}?checkin=1`;
  }, []);

  // Generate crisp local high-resolution QR Code (0 network calls)
  useEffect(() => {
    if (!registrationUrl) return;
    QRCode.toDataURL(registrationUrl, {
      width: 520,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#140a2b',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => {});
  }, [registrationUrl]);

  // Quota-saving real-time architecture:
  // 1) Fetch exact initial totals via 1-read aggregation queries (getCountFromServer)
  // 2) Subscribe ONLY to the latest 10 registrations (limit(10)) via push-only onSnapshot
  // 3) Increment/decrement total count locally on each new arrival (0 extra full-collection reads!)
  useEffect(() => {
    let isMounted = true;

    Promise.all([
      FirestoreService.fetchRosterCount(),
      FirestoreService.fetchRegistrationsCount(),
    ]).then(([rosterTotal, regsTotal]) => {
      if (!isMounted) return;
      if (rosterTotal !== null) setTotalRosterCount(rosterTotal);
      if (regsTotal !== null) {
        setCheckedInCount(regsTotal);
        baseCountLoadedRef.current = true;
      }
    });

    const unsub = FirestoreService.subscribeRecentRegistrations(
      10,
      (latest, addedIds, removedIds, isInitial) => {
        if (!isMounted) return;
        setLatestRegistrations(latest);

        if (isInitial) {
          latest.forEach((r) => seenIdsRef.current.add(r.id));
          if (!baseCountLoadedRef.current) {
            setCheckedInCount((prev) => Math.max(prev, latest.length));
          }
          return;
        }

        let newlyAddedCount = 0;
        let latestNewDocId: string | null = null;
        addedIds.forEach((id) => {
          if (!seenIdsRef.current.has(id)) {
            seenIdsRef.current.add(id);
            newlyAddedCount += 1;
            latestNewDocId = id;
          }
        });

        if (newlyAddedCount > 0) {
          setCheckedInCount((prev) => prev + newlyAddedCount);
          if (latestNewDocId) {
            setNewestId(latestNewDocId);
            soundFX.playCelebrationChime();
          }
        }

        // If collection was cleared or items deleted (not just pushed off bottom of top-10)
        if (latest.length === 0 && removedIds.length > 0) {
          seenIdsRef.current.clear();
          setCheckedInCount(0);
        } else if (removedIds.length > 0 && newlyAddedCount === 0) {
          setCheckedInCount((prev) => Math.max(latest.length, prev - removedIds.length));
        }
      }
    );

    return () => {
      isMounted = false;
      unsub();
    };
  }, []);

  useEffect(() => {
    if (!newestId) return;
    const timer = setTimeout(() => setNewestId(null), 4000);
    return () => clearTimeout(timer);
  }, [newestId]);

  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement) {
        setFullscreenState(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setFullscreenState(false);
      }
    };
    document.addEventListener('fullscreenchange', onFsChange);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isFullscreen]);

  const toggleFullscreen = () => {
    soundFX.playClick();
    if (!isFullscreen) {
      setFullscreenState(true);
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.().catch(() => {});
      }
    } else {
      setFullscreenState(false);
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
    }
  };

  const handleCopy = (type: 'register' | 'display') => {
    soundFX.playClick();
    const text = type === 'register' ? registrationUrl : displayShareUrl;
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2500);
  };

  const totalTarget = totalRosterCount > 0 ? totalRosterCount : Math.max(checkedInCount, 1);
  const percent = Math.min(100, Math.round((checkedInCount / totalTarget) * 100));
  const remaining = Math.max(0, totalTarget - checkedInCount);

  const isRegOpen = config.isRegistrationOpen;

  return (
    <div className={`w-full mx-auto ${isFullscreen ? 'max-w-7xl py-2' : 'max-w-6xl pb-8'}`}>
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-gradient-to-r from-fuchsia-600 to-cyan-500 text-white text-[11px] font-black tracking-wider uppercase shadow">
              <QrCode className="w-3.5 h-3.5" />
              {t('หน้าจอรับลงทะเบียน', 'ENTRANCE CHECK-IN DISPLAY')}
            </span>
            {isRegOpen ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-400/40 text-[11px] font-extrabold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                {t('กำลังเปิดรับลงทะเบียน', 'CHECK-IN OPEN')}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-400/40 text-[11px] font-extrabold">
                <Lock className="w-3 h-3" />
                {t('ปิดรับลงทะเบียนแล้ว', 'CHECK-IN CLOSED')}
              </span>
            )}
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight bg-gradient-to-r from-violet-700 via-fuchsia-600 to-orange-500 dark:from-amber-300 dark:via-fuchsia-400 dark:to-cyan-300 bg-clip-text text-transparent mt-1 truncate">
            {config.eventName}
          </h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-300 truncate">
            {config.eventVenue}
            {config.eventDate ? ` · ${config.eventDate}` : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {!isFullscreen && (
            <button
              type="button"
              onClick={() => handleCopy('display')}
              className="min-h-[40px] px-3 py-1.5 rounded-xl bg-white dark:bg-violet-950/80 border border-cyan-300/70 dark:border-cyan-500/40 text-zinc-800 dark:text-cyan-200 text-xs font-bold flex items-center gap-1.5 hover:bg-cyan-50 dark:hover:bg-violet-900 transition cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>
                {copiedType === 'display'
                  ? t('คัดลอกลิงก์จอนี้แล้ว!', 'Copied!')
                  : t('ลิงก์เปิดจอนอก (?checkin=1)', 'Copy Display Link')}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={toggleFullscreen}
            className="min-h-[40px] px-3 py-1.5 rounded-xl bg-white dark:bg-violet-950/80 border border-fuchsia-300/70 dark:border-fuchsia-500/40 text-zinc-800 dark:text-white text-xs font-bold flex items-center gap-1.5 hover:bg-fuchsia-50 dark:hover:bg-violet-900 transition cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span className="hidden sm:inline">
              {isFullscreen ? t('ออกเต็มจอ', 'Exit Fullscreen') : t('ขยายเต็มจอ', 'Fullscreen')}
            </span>
          </button>

          {!isFullscreen && isAdminLoggedIn && onBackToAdmin && (
            <button
              type="button"
              onClick={() => {
                soundFX.playClick();
                onBackToAdmin();
              }}
              className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-amber-500 text-white text-xs font-extrabold flex items-center gap-1.5 shadow cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t('กลับแอดมิน', 'Admin')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main 2-Column Entrance TV Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
        {/* LEFT COLUMN (5 cols): DYNAMICALLY ADAPTS TO REGISTRATION OPEN / CLOSED STATUS */}
        {isRegOpen ? (
          <div className="lg:col-span-5 rounded-3xl p-[3px] bg-gradient-to-br from-fuchsia-500 via-amber-400 to-cyan-400 shadow-2xl shadow-fuchsia-500/20 flex">
            <div className="w-full rounded-[21px] bg-white/95 dark:bg-[#140a2b]/95 p-6 sm:p-7 flex flex-col items-center justify-between text-center">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-fuchsia-500/10 dark:bg-fuchsia-500/20 text-fuchsia-700 dark:text-amber-300 text-xs font-extrabold mb-2">
                  <Sparkles className="w-4 h-4" />
                  <span>{t('สแกนเพื่อลงทะเบียนเข้างาน', 'SCAN TO CHECK IN')}</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white leading-tight">
                  {t('ลงทะเบียน & รับหมายเลขโต๊ะ', 'Check-in & Get Table Pass')}
                </h3>
              </div>

              {/* Giant High-Contrast QR Frame */}
              <div className="my-5 p-4 sm:p-5 rounded-3xl bg-white border-4 border-fuchsia-400/70 shadow-2xl shadow-fuchsia-500/20">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={t('QR Code ลงทะเบียนเข้างาน', 'Event Registration QR Code')}
                    className="w-56 h-56 sm:w-72 sm:h-72 lg:w-64 lg:h-64 xl:w-72 xl:h-72 object-contain block"
                  />
                ) : (
                  <div className="w-56 h-56 sm:w-72 sm:h-72 flex items-center justify-center text-zinc-400 text-xs">
                    {t('กำลังสร้าง QR Code...', 'Generating QR...')}
                  </div>
                )}
              </div>

              <div className="w-full space-y-2.5">
                <p className="text-xs sm:text-sm font-bold text-zinc-700 dark:text-zinc-200 leading-relaxed">
                  {t(
                    'ใช้กล้องมือถือหรือ LINE สแกน QR Code เพื่อเข้าสู่หน้าลงทะเบียน',
                    'Use your phone camera or LINE to scan the QR Code to open the registration page'
                  )}
                </p>

                <button
                  type="button"
                  onClick={() => handleCopy('register')}
                  className="w-full py-2.5 px-3 rounded-xl bg-zinc-100 dark:bg-white/10 hover:bg-fuchsia-50 dark:hover:bg-white/15 border border-zinc-200 dark:border-white/15 text-[11px] font-mono text-zinc-700 dark:text-cyan-200 flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <span className="truncate">{registrationUrl}</span>
                  <Copy className="w-3.5 h-3.5 shrink-0 text-fuchsia-600 dark:text-amber-300" />
                </button>
                {copiedType === 'register' && (
                  <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    {t('คัดลอกลิงก์หน้าลงทะเบียนเรียบร้อย!', 'Check-in URL copied!')}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-5 rounded-3xl p-[3px] bg-gradient-to-br from-rose-500 via-amber-500 to-fuchsia-600 shadow-2xl shadow-rose-500/20 flex">
            <div className="w-full rounded-[21px] bg-white/95 dark:bg-[#140a2b]/95 p-6 sm:p-8 flex flex-col items-center justify-between text-center gap-5">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-500/15 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-400/40 text-xs font-extrabold mb-3">
                  <Lock className="w-4 h-4" />
                  <span>{t('ปิดระบบรับลงทะเบียนแล้ว', 'REGISTRATION CLOSED')}</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white leading-tight">
                  {t('ปิดรับลงทะเบียนเข้างานเรียบร้อย', 'Event Check-in Is Now Closed')}
                </h3>
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 mt-2 leading-relaxed">
                  {t(
                    'ขอบคุณผู้เข้าร่วมงานทุกท่านที่ลงทะเบียนเข้างาน เตรียมพบกับกิจกรรมพิเศษและการจับรางวัล Lucky Draw บนเวทีหลัก!',
                    'Thank you for checking in! Get ready for special activities and the Lucky Draw on the main stage.'
                  )}
                </p>
              </div>

              {/* Closed State Centerpiece Visual */}
              <div className="w-full rounded-3xl bg-gradient-to-br from-rose-500/10 via-amber-400/15 to-fuchsia-500/10 border-2 border-amber-400/50 p-6 flex flex-col items-center">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 flex items-center justify-center text-white shadow-xl shadow-amber-500/30 mb-3">
                  <Trophy className="w-10 h-10" />
                </div>
                <div className="text-xs font-extrabold text-amber-700 dark:text-amber-300 uppercase tracking-wider">
                  {t('สรุปยอดผู้ลงทะเบียนทั้งหมด', 'FINAL CHECKED-IN TOTAL')}
                </div>
                <div className="text-5xl sm:text-6xl font-black font-mono tabular-nums bg-gradient-to-r from-fuchsia-600 via-rose-500 to-amber-500 dark:from-amber-300 dark:via-fuchsia-400 dark:to-cyan-300 bg-clip-text text-transparent my-1">
                  {checkedInCount.toLocaleString()}
                </div>
                <div className="text-xs font-bold text-zinc-600 dark:text-zinc-300">
                  {t(
                    `จากรายชื่อพนักงานทั้งหมด ${totalRosterCount.toLocaleString()} คน (${percent}%)`,
                    `out of ${totalRosterCount.toLocaleString()} staff (${percent}%)`
                  )}
                </div>
              </div>

              {/* Helpdesk info for late arrivals */}
              <div className="w-full p-4 rounded-2xl bg-zinc-100/90 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-xs text-zinc-700 dark:text-zinc-200 flex items-start gap-2.5 text-left">
                <HelpCircle className="w-4 h-4 text-fuchsia-600 dark:text-amber-300 shrink-0 mt-0.5" />
                <div>
                  <div className="font-extrabold text-zinc-900 dark:text-white">
                    {t('หากยังไม่ได้ลงทะเบียนหรือต้องการความช่วยเหลือ', 'Need assistance with check-in?')}
                  </div>
                  <div className="text-[11px] text-zinc-600 dark:text-zinc-300 mt-0.5">
                    {config.eventContact ||
                      t('กรุณาติดต่อทีมงานผู้จัดงาน ณ จุดลงทะเบียนหน้างาน', 'Please contact the event organizer desk at the entrance')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* RIGHT COLUMN (7 cols): REAL-TIME STATS + LATEST CHECK-INS FEED */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          {/* Stats Summary Card */}
          <div className="rounded-3xl bg-white/95 dark:bg-[#140a2b]/95 border-2 border-cyan-300/70 dark:border-cyan-500/35 p-5 sm:p-6 shadow-xl">
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-500/15 to-cyan-500/15 border border-emerald-400/50">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                  <UserCheck className="w-4 h-4 shrink-0" />
                  <span className="truncate">{t('ลงทะเบียนแล้ว', 'Checked In')}</span>
                </div>
                <div className="text-3xl sm:text-4xl font-black font-mono tabular-nums text-emerald-700 dark:text-emerald-300 mt-1">
                  {checkedInCount.toLocaleString()}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-fuchsia-500/12 to-violet-500/12 border border-fuchsia-400/40">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-fuchsia-700 dark:text-fuchsia-300">
                  <Users className="w-4 h-4 shrink-0" />
                  <span className="truncate">{t('พนักงานทั้งหมด', 'Total Staff')}</span>
                </div>
                <div className="text-3xl sm:text-4xl font-black font-mono tabular-nums text-zinc-900 dark:text-white mt-1">
                  {totalRosterCount.toLocaleString()}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-500/15 to-orange-500/15 border border-amber-400/50">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-300">
                  <TrendingUp className="w-4 h-4 shrink-0" />
                  <span className="truncate">{t('ความคืบหน้า', 'Progress')}</span>
                </div>
                <div className="text-3xl sm:text-4xl font-black font-mono tabular-nums text-amber-600 dark:text-amber-300 mt-1">
                  {percent}%
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-zinc-600 dark:text-zinc-300 mb-1.5">
                <span>
                  {t(
                    `เข้าร่วมงานแล้ว ${checkedInCount.toLocaleString()} จาก ${totalRosterCount.toLocaleString()} คน`,
                    `${checkedInCount.toLocaleString()} of ${totalRosterCount.toLocaleString()} checked in`
                  )}
                </span>
                <span className="font-mono text-cyan-700 dark:text-cyan-300">
                  {t(`คงเหลือ ${remaining.toLocaleString()} คน`, `${remaining.toLocaleString()} remaining`)}
                </span>
              </div>
              <div className="w-full h-3.5 rounded-full bg-zinc-200 dark:bg-white/10 overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-fuchsia-500 via-amber-400 to-emerald-400 transition-all duration-500"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Latest 10 Checked-in Feed */}
          <div className="flex-1 rounded-3xl bg-white/95 dark:bg-[#140a2b]/95 border-2 border-fuchsia-300/60 dark:border-fuchsia-500/35 p-5 shadow-xl flex flex-col">
            <div className="flex items-center justify-between gap-2 mb-3.5 pb-2.5 border-b border-fuchsia-200/60 dark:border-violet-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className={`w-5 h-5 ${isRegOpen ? 'text-emerald-500' : 'text-amber-500'}`} />
                <h3 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-white">
                  {isRegOpen
                    ? t('ผู้ลงทะเบียนสำเร็จล่าสุด (10 อันดับ)', 'Latest Checked-in Guests (Top 10)')
                    : t('รายชื่อผู้ลงทะเบียนล่าสุดก่อนปิดระบบ (10 อันดับ)', 'Final Checked-in Guests (Top 10)')}
                </h3>
              </div>
              <span
                className={`text-[11px] font-bold ${
                  isRegOpen
                    ? 'text-emerald-600 dark:text-emerald-300'
                    : 'text-rose-600 dark:text-rose-300'
                }`}
              >
                {isRegOpen
                  ? t('อัปเดตทันทีเมื่อมีผู้ลงทะเบียนใหม่', 'Updates live on new check-in')
                  : t('ปิดรับลงทะเบียนแล้ว', 'Check-in closed')}
              </span>
            </div>

            {latestRegistrations.length === 0 ? (
              <div className="flex-1 py-12 flex flex-col items-center justify-center text-center text-zinc-500 dark:text-zinc-400">
                {isRegOpen ? (
                  <>
                    <QrCode className="w-10 h-10 mb-2 opacity-40" />
                    <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                      {t('รอต้อนรับผู้ร่วมงานคนแรก...', 'Waiting for the first check-in...')}
                    </p>
                    <p className="text-xs mt-1">
                      {t(
                        'สแกน QR Code ด้านซ้าย รายชื่อจะปรากฏขึ้นที่นี่แบบเรียลไทม์',
                        'Scan the QR code to appear here instantly'
                      )}
                    </p>
                  </>
                ) : (
                  <>
                    <Lock className="w-10 h-10 mb-2 opacity-40 text-rose-500" />
                    <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                      {t('ปิดรับลงทะเบียนแล้ว', 'Registration is currently closed')}
                    </p>
                    <p className="text-xs mt-1">
                      {t(
                        'เมื่อแอดมินเปิดระบบรับลงทะเบียน หน้าจอนี้จะแสดง QR Code โดยอัตโนมัติ',
                        'The QR code will reappear automatically once the organizer opens check-in.'
                      )}
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {latestRegistrations.map((att, idx) => {
                  const isJustArrived = newestId === att.id || (idx === 0 && newestId === att.id);
                  return (
                    <div
                      key={att.id}
                      className={`p-2.5 rounded-2xl border flex items-center gap-3 transition-all ${
                        isJustArrived
                          ? 'bg-gradient-to-r from-emerald-500/20 via-cyan-500/15 to-amber-400/20 border-emerald-400 ring-2 ring-emerald-400/50 scale-[1.01]'
                          : 'bg-zinc-50/90 dark:bg-violet-950/50 border-fuchsia-200/60 dark:border-violet-800/80'
                      }`}
                    >
                      <div className="w-12 h-14 rounded-xl overflow-hidden bg-zinc-200 dark:bg-zinc-900 border-2 border-fuchsia-400/60 shrink-0">
                        {att.selfieUrl ? (
                          <img
                            src={att.selfieUrl}
                            alt={att.fullName}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-zinc-400">
                            {idx + 1}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[11px] font-mono font-extrabold text-fuchsia-600 dark:text-amber-300">
                            {att.employeeId}
                          </span>
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                            <Clock className="w-2.5 h-2.5" />
                            {new Date(att.registeredAt).toLocaleTimeString(
                              lang === 'en' ? 'en-US' : 'th-TH',
                              { hour: '2-digit', minute: '2-digit' }
                            )}
                          </span>
                        </div>
                        <div className="text-xs sm:text-sm font-extrabold text-zinc-900 dark:text-white truncate">
                          {att.fullName}
                        </div>
                        <div className="flex items-center justify-between gap-1.5 mt-0.5">
                          <span className="text-[11px] text-zinc-600 dark:text-zinc-300 truncate">
                            {att.department}
                          </span>
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-gradient-to-r from-fuchsia-500 to-amber-500 text-white text-[10px] font-extrabold font-mono shrink-0">
                            <MapPin className="w-2.5 h-2.5" />
                            {att.tableNumber}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
