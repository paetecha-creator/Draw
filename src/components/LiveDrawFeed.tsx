import React, { useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Trophy,
  Sparkles,
  Gift,
  Clock,
  MapPin,
  Volume2,
  VolumeX,
  Radio,
  Crown,
  Timer,
  Shuffle,
  Zap,
  AlertCircle,
  Users,
  UserCheck,
  TrendingUp,
  CheckCircle2,
  Minimize2,
  Maximize2,
} from 'lucide-react';
import { AttendeeRegistration, LuckyDrawRecord, PartyConfig, Prize } from '../types/party';
import { soundFX } from '../utils/audio';
import { usePreferences } from '../contexts/PreferencesContext';

interface LiveDrawFeedProps {
  winners: LuckyDrawRecord[];
  prizes: Prize[];
  config: PartyConfig;
  candidates?: AttendeeRegistration[];
  totalRosterCount?: number;
  onBackToTicket: () => void;
  hasMyPass: boolean;
}

interface ShuffleDisplayCard {
  employeeId: string;
  fullName: string;
  nickname?: string;
  department: string;
  tableNumber: string;
  selfieUrl?: string;
}

export const LiveDrawFeed: React.FC<LiveDrawFeedProps> = ({
  winners,
  prizes,
  config,
  candidates = [],
  totalRosterCount = 0,
  onBackToTicket,
  hasMyPass,
}) => {
  const { t, lang } = usePreferences();
  const [muted, setMuted] = useState(soundFX.getMuted());
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
  const [justWonHighlight, setJustWonHighlight] = useState(false);

  // Randomize Animation State
  const [isAnimatingDraw, setIsAnimatingDraw] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<'fast' | 'slowing' | 'reveal'>('fast');
  const [shuffleCard, setShuffleCard] = useState<ShuffleDisplayCard | null>(null);
  const [animatingPrizeName, setAnimatingPrizeName] = useState<string>('');
  const [animatingPrizeTier, setAnimatingPrizeTier] = useState<string>('');

  // 60-Second Claim Countdown State
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);
  const [isCountdownMinimized, setIsCountdownMinimized] = useState(false);
  const lastTickSecRef = useRef<number | null>(null);

  const latestWinner = winners.length > 0 ? winners[0] : null;
  const latestWinnerPrize = latestWinner
    ? prizes.find((p) => p.id === latestWinner.prizeId)
    : undefined;
  const latestWinnerPrizeImage =
    latestWinner?.prizeImageUrl || latestWinnerPrize?.imageUrl || '';
  const armedPrize =
    prizes.find((p) => p.id === config.vipActivePrizeId) ||
    prizes.find((p) => p.remaining > 0) ||
    prizes[0];

  const hasMountedRef = useRef(false);
  const prevWinnerIdRef = useRef<string | null>(latestWinner?.id ?? null);
  const shufflePoolRef = useRef<ShuffleDisplayCard[]>([]);

  // Build dynamic shuffle pool from real checked-in candidates + winners
  const shufflePool = useMemo<ShuffleDisplayCard[]>(() => {
    const map = new Map<string, ShuffleDisplayCard>();
    candidates.forEach((c) => {
      if (!c.isBlockedFromDraw) {
        map.set(c.employeeId.toUpperCase(), {
          employeeId: c.employeeId,
          fullName: c.fullName,
          nickname: c.nickname,
          department: c.department,
          tableNumber: c.tableNumber,
          selfieUrl: c.selfieUrl,
        });
      }
    });
    winners.forEach((w) => {
      if (!map.has(w.employeeId.toUpperCase())) {
        map.set(w.employeeId.toUpperCase(), {
          employeeId: w.employeeId,
          fullName: w.winnerName,
          nickname: w.nickname,
          department: w.department,
          tableNumber: w.tableNumber,
          selfieUrl: w.selfieUrl,
        });
      }
    });
    return Array.from(map.values());
  }, [candidates, winners]);

  useEffect(() => {
    shufflePoolRef.current = shufflePool;
  }, [shufflePool]);

  // Real-time Registration Statistics & Latest 10 Checked-in Attendees (for LIVE while registration is open)
  const registrationStats = useMemo(() => {
    const checkedInCount = candidates.length;
    const totalEmployees = totalRosterCount > 0 ? totalRosterCount : checkedInCount;
    const attendancePercent =
      totalEmployees > 0 ? Math.min(100, Math.round((checkedInCount / totalEmployees) * 100)) : 0;
    const remainingToCheckIn = Math.max(0, totalEmployees - checkedInCount);

    const deptCounts = new Map<string, number>();
    candidates.forEach((c) => {
      const dept = c.department || 'ทั่วไป';
      deptCounts.set(dept, (deptCounts.get(dept) || 0) + 1);
    });
    const topDepartments = Array.from(deptCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);

    const latestTen = [...candidates]
      .sort((a, b) => {
        const tA = Date.parse(a.registeredAt || '') || 0;
        const tB = Date.parse(b.registeredAt || '') || 0;
        return tB - tA;
      })
      .slice(0, 10);

    return {
      checkedInCount,
      totalEmployees,
      attendancePercent,
      remainingToCheckIn,
      topDepartments,
      latestTen,
    };
  }, [candidates, totalRosterCount]);

  // Trigger dramatic multi-stage random reel animation whenever a new winner arrives
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      prevWinnerIdRef.current = latestWinner?.id ?? null;
      if (latestWinner) {
        confetti({
          particleCount: 50,
          spread: 65,
          origin: { y: 0.4 },
          colors: ['#ec4899', '#fbbf24', '#06b6d4', '#10b981', '#8b5cf6'],
        });
      }
      return;
    }

    if (!latestWinner) {
      prevWinnerIdRef.current = null;
      setIsAnimatingDraw(false);
      setJustWonHighlight(false);
      return;
    }

    const isNewArrival = prevWinnerIdRef.current !== latestWinner.id;
    prevWinnerIdRef.current = latestWinner.id;

    if (!isNewArrival) return;

    // Launch random slot-reel suspense animation (~2.8s)
    setAnimatingPrizeName(latestWinner.prizeName);
    setAnimatingPrizeTier(latestWinner.prizeTier);
    setIsAnimatingDraw(true);
    setAnimationPhase('fast');
    setJustWonHighlight(false);

    const stopDrumroll = soundFX.startDrumroll();
    const timers: Array<ReturnType<typeof setTimeout>> = [];

    const pool =
      shufflePoolRef.current.length > 0
        ? shufflePoolRef.current
        : [
            {
              employeeId: latestWinner.employeeId,
              fullName: latestWinner.winnerName,
              nickname: latestWinner.nickname,
              department: latestWinner.department,
              tableNumber: latestWinner.tableNumber,
              selfieUrl: latestWinner.selfieUrl,
            },
          ];

    // Step schedule with accelerating -> decelerating suspense intervals
    const delays = [
      0, 60, 120, 180, 240, 300, 360, 420, 480, 550, 620, 700, 780, 870, 960,
      1060, 1170, 1290, 1420, 1560, 1720, 1900, 2100, 2320, 2560,
    ];

    delays.forEach((delay, stepIdx) => {
      const tId = setTimeout(() => {
        if (stepIdx >= 16) {
          setAnimationPhase('slowing');
        }
        const pick = pool[Math.floor(Math.random() * pool.length)];
        setShuffleCard(pick);
      }, delay);
      timers.push(tId);
    });

    const revealTimer = setTimeout(() => {
      stopDrumroll();
      setAnimationPhase('reveal');
      setIsAnimatingDraw(false);
      setJustWonHighlight(true);
      soundFX.playWinnerFanfare();

      // Multi-burst confetti celebration
      confetti({
        particleCount: 160,
        spread: 110,
        origin: { y: 0.45 },
        colors: ['#ec4899', '#fbbf24', '#06b6d4', '#10b981', '#8b5cf6', '#f43f5e'],
      });
      setTimeout(() => {
        confetti({
          particleCount: 80,
          angle: 60,
          spread: 65,
          origin: { x: 0.1, y: 0.55 },
          colors: ['#ec4899', '#fbbf24', '#06b6d4'],
        });
        confetti({
          particleCount: 80,
          angle: 120,
          spread: 65,
          origin: { x: 0.9, y: 0.55 },
          colors: ['#10b981', '#8b5cf6', '#fbbf24'],
        });
      }, 250);
    }, 2800);
    timers.push(revealTimer);

    const highlightTimer = setTimeout(() => {
      setJustWonHighlight(false);
    }, 8000);
    timers.push(highlightTimer);

    return () => {
      stopDrumroll();
      timers.forEach((id) => clearTimeout(id));
    };
  }, [latestWinner?.id]);

  // Real-time 60-second claim countdown synced from Admin via PartyConfig
  useEffect(() => {
    setIsCountdownMinimized(false);
    const endAtStr = config.claimCountdownEndAt?.trim();
    if (!endAtStr) {
      setCountdownSeconds(null);
      lastTickSecRef.current = null;
      return;
    }

    const endMs = Date.parse(endAtStr);
    if (!Number.isFinite(endMs)) {
      setCountdownSeconds(null);
      return;
    }

    const updateTimer = () => {
      const diffMs = endMs - Date.now();
      const secs = Math.max(0, Math.ceil(diffMs / 1000));
      setCountdownSeconds((prev) => (prev === secs ? prev : secs));

      if (secs > 0 && secs <= 10 && lastTickSecRef.current !== secs && !isAnimatingDraw) {
        lastTickSecRef.current = secs;
        soundFX.playCountdownTick(true);
      } else if (secs === 0 && lastTickSecRef.current !== 0) {
        lastTickSecRef.current = 0;
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 500);
    return () => clearInterval(interval);
  }, [config.claimCountdownEndAt, isAnimatingDraw]);

  const toggleSound = () => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    soundFX.setMuted(nextMuted);
  };

  const prizeCardBorders = [
    'border-fuchsia-400/50 dark:border-fuchsia-500/40',
    'border-cyan-400/50 dark:border-cyan-500/40',
    'border-amber-400/50 dark:border-amber-500/40',
    'border-emerald-400/50 dark:border-emerald-500/40',
  ];

  // Calculate SVG circular countdown ring geometry
  const countdownProgress = countdownSeconds !== null ? Math.min(1, Math.max(0, countdownSeconds / 60)) : 0;
  const ringRadius = 42;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringDashOffset = ringCircumference * (1 - countdownProgress);
  const isCountdownUrgent = countdownSeconds !== null && countdownSeconds <= 10;
  const isCountdownWarning = countdownSeconds !== null && countdownSeconds > 10 && countdownSeconds <= 20;

  return (
    <div className="w-full max-w-3xl mx-auto pb-12">
      {/* =========================================================================
          FULL-SCREEN GIANT COUNTDOWN OVERLAY (Synced when Admin starts countdown)
      ========================================================================= */}
      {countdownSeconds !== null && !isAnimatingDraw && !isCountdownMinimized && (
        <div
          className={`fixed inset-0 z-50 flex flex-col justify-between p-4 sm:p-8 transition-colors duration-300 overflow-y-auto ${
            countdownSeconds === 0
              ? 'bg-gradient-to-br from-[#2b050f] via-[#450a18] to-[#1a0308]'
              : isCountdownUrgent
              ? 'bg-gradient-to-br from-[#260618] via-[#3a081e] to-[#160412]'
              : isCountdownWarning
              ? 'bg-gradient-to-br from-[#241305] via-[#331a06] to-[#170b04]'
              : 'bg-gradient-to-br from-[#070217] via-[#120633] to-[#051a2e]'
          } text-white`}
        >
          {/* Ambient Animated Radial Glows */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            <div
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] sm:w-[760px] sm:h-[760px] rounded-full blur-3xl opacity-35 ${
                countdownSeconds === 0 || isCountdownUrgent
                  ? 'bg-rose-500 animate-pulse'
                  : isCountdownWarning
                  ? 'bg-amber-500 animate-pulse'
                  : 'bg-cyan-500'
              }`}
            />
          </div>

          {/* Top Bar */}
          <div className="relative z-10 w-full max-w-5xl mx-auto flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-black tracking-widest uppercase text-amber-300">
                <Timer
                  className={`w-4 h-4 sm:w-5 sm:h-5 ${
                    countdownSeconds === 0 || isCountdownUrgent ? 'text-rose-400 animate-spin' : 'text-cyan-300 animate-pulse'
                  }`}
                />
                <span>
                  {countdownSeconds === 0
                    ? t('หมดเวลารับรางวัลแล้ว!', "TIME'S UP — CLAIM EXPIRED")
                    : isCountdownUrgent
                    ? t('นาทีสุดท้าย! กรุณาแสดงตัวบนเวทีด่วน', 'FINAL SECONDS! COME TO STAGE NOW')
                    : t('นับถอยหลังแสดงตัวรับรางวัลบนเวที', 'STAGE CLAIM COUNTDOWN')}
                </span>
              </div>
              {latestWinner && (
                <div className="text-sm sm:text-xl font-extrabold text-white/95 truncate mt-0.5">
                  {latestWinner.prizeName}
                  {latestWinner.prizeTier ? ` · ${latestWinner.prizeTier}` : ''}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                soundFX.playClick();
                setIsCountdownMinimized(true);
              }}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shrink-0"
              title={t('ย่อหน้าต่างชั่วคราว', 'Minimize overlay')}
            >
              <Minimize2 className="w-4 h-4" />
              <span className="hidden sm:inline">{t('ย่อจอ', 'Minimize')}</span>
            </button>
          </div>

          {/* Centerpiece GIANT Countdown Number */}
          <div className="relative z-10 flex-1 flex flex-col items-center justify-center my-4 select-none text-center">
            <div
              className={`font-black font-mono tabular-nums leading-none tracking-tighter transition-transform duration-150 ${
                countdownSeconds === 0
                  ? 'text-[8rem] sm:text-[13rem] md:text-[16rem] text-rose-400 drop-shadow-[0_0_55px_rgba(244,63,94,0.85)] animate-pulse'
                  : isCountdownUrgent
                  ? 'text-[10rem] sm:text-[15rem] md:text-[19rem] lg:text-[22rem] text-rose-400 drop-shadow-[0_0_65px_rgba(244,63,94,0.9)] scale-105'
                  : isCountdownWarning
                  ? 'text-[10rem] sm:text-[15rem] md:text-[19rem] lg:text-[22rem] text-amber-300 drop-shadow-[0_0_55px_rgba(251,191,36,0.75)]'
                  : 'text-[10rem] sm:text-[15rem] md:text-[19rem] lg:text-[22rem] bg-gradient-to-b from-white via-cyan-200 to-emerald-300 bg-clip-text text-transparent drop-shadow-[0_0_55px_rgba(34,211,238,0.65)]'
              }`}
            >
              {countdownSeconds}
            </div>

            <div className="mt-2 sm:mt-4 text-sm sm:text-xl font-black tracking-[0.25em] uppercase text-white/85">
              {countdownSeconds === 0
                ? t('หมดเวลา 60 วินาที!', '60 SECONDS EXPIRED!')
                : t('วินาทีที่เหลือ / SECONDS LEFT', 'SECONDS REMAINING')}
            </div>

            {/* Wide Fullscreen Progress Bar */}
            <div className="mt-5 w-full max-w-2xl h-3.5 sm:h-4 rounded-full bg-white/15 overflow-hidden p-0.5 border border-white/15">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  countdownSeconds === 0 || isCountdownUrgent
                    ? 'bg-gradient-to-r from-rose-500 to-red-400'
                    : isCountdownWarning
                    ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                    : 'bg-gradient-to-r from-emerald-400 via-cyan-400 to-fuchsia-400'
                }`}
                style={{ width: `${Math.round(countdownProgress * 100)}%` }}
              />
            </div>
          </div>

          {/* Bottom Winner & Prize Paired Strip */}
          {latestWinner && (
            <div className="relative z-10 w-full max-w-3xl mx-auto rounded-2xl sm:rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 p-3.5 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                {/* Winner Photo */}
                <div className="w-16 h-20 sm:w-20 sm:h-24 rounded-xl overflow-hidden border-2 border-cyan-300 bg-zinc-900 shrink-0 shadow-lg">
                  {latestWinner.selfieUrl ? (
                    <img
                      src={latestWinner.selfieUrl}
                      alt={latestWinner.winnerName}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-white/60">
                      {t('ผู้โชคดี', 'Winner')}
                    </div>
                  )}
                </div>

                {/* Paired Prize Photo */}
                {latestWinnerPrizeImage && !brokenImages[`fs_${latestWinner.prizeId}`] ? (
                  <div className="w-16 h-20 sm:w-20 sm:h-24 rounded-xl overflow-hidden border-2 border-amber-300 bg-zinc-900 shrink-0 shadow-lg">
                    <img
                      src={latestWinnerPrizeImage}
                      alt={latestWinner.prizeName}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={() =>
                        setBrokenImages((prev) => ({
                          ...prev,
                          [`fs_${latestWinner.prizeId}`]: true,
                        }))
                      }
                    />
                  </div>
                ) : (
                  <div className="w-16 h-20 sm:w-20 sm:h-24 rounded-xl border-2 border-amber-300/70 bg-gradient-to-br from-fuchsia-600/40 to-amber-500/40 flex items-center justify-center shrink-0">
                    <Gift className="w-7 h-7 text-amber-300" />
                  </div>
                )}

                <div className="min-w-0 text-left">
                  <div className="text-xs font-mono font-extrabold text-amber-300">
                    {latestWinner.employeeId}
                  </div>
                  <div className="text-lg sm:text-2xl font-black text-white truncate">
                    {latestWinner.winnerName}
                    {latestWinner.nickname ? ` (${latestWinner.nickname})` : ''}
                  </div>
                  <div className="text-xs sm:text-sm text-cyan-200 font-semibold truncate">
                    {latestWinner.department} · {latestWinner.tableNumber}
                  </div>
                </div>
              </div>

              <div className="px-4 py-2 rounded-xl bg-gradient-to-r from-fuchsia-500 via-rose-500 to-amber-400 text-white text-xs sm:text-sm font-black shrink-0 shadow-lg">
                {countdownSeconds === 0
                  ? t('กรุณาติดต่อทีมงาน', 'Please See Organizer')
                  : t('ขอเชิญขึ้นเวทีรับรางวัล!', 'Come to the Stage!')}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 mb-5 sm:mb-6">
        <div className="min-w-0">
          <p className="text-xs font-bold mb-0.5 truncate bg-gradient-to-r from-fuchsia-600 via-orange-500 to-cyan-600 dark:from-amber-300 dark:via-fuchsia-400 dark:to-cyan-300 bg-clip-text text-transparent">
            {config.eventName} · LIVE STAGE
          </p>
          <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2 flex-wrap">
            <span>
              {config.isRegistrationOpen && winners.length === 0 && !isAnimatingDraw
                ? t('LIVE รายงานการลงทะเบียนเข้างาน', 'LIVE Check-in Tracker')
                : t('LIVE ประกาศผลรางวัล Lucky Draw', 'LIVE Lucky Draw Results')}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500 text-white text-[10px] font-black tracking-widest uppercase animate-pulse">
              LIVE
            </span>
            {config.isRegistrationOpen && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-400/40 text-[10px] font-extrabold uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                {t('เปิดลงทะเบียน', 'CHECK-IN OPEN')}
              </span>
            )}
          </h2>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={toggleSound}
            className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-white dark:bg-violet-950/80 border border-fuchsia-300/60 dark:border-fuchsia-500/40 text-zinc-700 dark:text-zinc-100 hover:bg-fuchsia-50 dark:hover:bg-violet-900 flex items-center justify-center transition cursor-pointer"
            title={muted ? t('เปิดเสียงเอฟเฟกต์', 'Unmute Sound') : t('ปิดเสียง', 'Mute Sound')}
          >
            {muted ? (
              <VolumeX className="w-4 h-4 text-rose-500 dark:text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            )}
          </button>

          {hasMyPass && (
            <button
              type="button"
              onClick={onBackToTicket}
              className="min-h-[44px] py-2 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 text-white text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 shadow-md"
            >
              {t('ดูบัตรของฉัน', 'My Pass')}
            </button>
          )}
        </div>
      </div>

      {/* LIVE ARMED STATUS BANNER (Real-time sync when Admin unlocks VIP Draw button!) */}
      {!isAnimatingDraw && config.isVipTriggerActive && armedPrize && (
        <div className="mb-6 rounded-3xl p-[2px] bg-gradient-to-r from-fuchsia-500 via-amber-400 to-cyan-400 animate-gradient-flow shadow-2xl shadow-fuchsia-500/25">
          <div className="rounded-[22px] bg-white/95 dark:bg-[#16082e]/95 p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-4">
            <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-gradient-to-tr from-fuchsia-500 to-amber-400 p-[2px] shrink-0">
              <div className="w-full h-full rounded-[14px] overflow-hidden bg-zinc-100 dark:bg-zinc-950 flex items-center justify-center">
                {armedPrize.imageUrl && !brokenImages[armedPrize.id] ? (
                  <img
                    src={armedPrize.imageUrl}
                    alt={armedPrize.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={() => setBrokenImages((prev) => ({ ...prev, [armedPrize.id]: true }))}
                  />
                ) : (
                  <Gift className="w-7 h-7 text-fuchsia-500" />
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0 text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-600 dark:text-emerald-300">
                <Radio className="w-4 h-4 animate-pulse text-fuchsia-500 dark:text-amber-300" />
                <span>
                  {t(
                    'แอดมินเปิดสิทธิ์รอบนี้แล้ว — กำลังรอผู้บริหารกดปุ่มจับรางวัล!',
                    'NEXT ROUND LIVE — Waiting for Executive to Press Draw!'
                  )}
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-extrabold text-zinc-900 dark:text-white mt-0.5 truncate">
                {armedPrize.name}
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-300">
                {armedPrize.tier} ·{' '}
                {t(`เหลือ ${armedPrize.remaining} รางวัล`, `${armedPrize.remaining} remaining`)}
              </p>
            </div>

            <div className="px-4 py-2 rounded-xl bg-gradient-to-r from-fuchsia-500 via-rose-500 to-amber-400 text-white text-xs font-extrabold flex items-center gap-1.5 shrink-0 shadow-lg animate-pulse">
              <Crown className="w-4 h-4" />
              <span>{t('เตรียมลุ้นรางวัล!', 'Stand By!')}</span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MAIN STAGE: SPECTACULAR RANDOMIZING REEL OR WINNER SPOTLIGHT + 60s COUNTDOWN
      ========================================================================= */}
      {isAnimatingDraw && shuffleCard ? (
        <div className="mb-8 relative rounded-3xl p-[3px] bg-gradient-to-r from-fuchsia-500 via-amber-400 via-emerald-400 to-cyan-400 animate-gradient-flow shadow-2xl shadow-fuchsia-500/35 overflow-hidden">
          <div className="rounded-[21px] bg-gradient-to-br from-[#190836] via-[#120729] to-[#081a30] text-white p-6 sm:p-9 relative overflow-hidden">
            {/* Ambient Stage Spotlights */}
            <div className="absolute -top-20 left-1/4 w-64 h-64 bg-fuchsia-500/30 rounded-full blur-3xl animate-pulse pointer-events-none" />
            <div className="absolute -bottom-20 right-1/4 w-64 h-64 bg-cyan-400/25 rounded-full blur-3xl animate-pulse pointer-events-none" />

            <div className="relative z-10 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-white/10 border border-white/20 text-amber-300 text-xs font-black tracking-widest uppercase mb-3">
                <Shuffle className="w-4 h-4 animate-spin" />
                <span>
                  {animationPhase === 'slowing'
                    ? t('กำลังจะหยุดแล้ว! ลุ้นเลย...', 'FINALIZING WINNER! GET READY...')
                    : t('กำลังสุ่มผู้โชคดีแบบเรียลไทม์...', 'SHUFFLING ELIGIBLE ATTENDEES...')}
                </span>
                <Zap className="w-4 h-4 text-cyan-300 animate-bounce" />
              </div>

              <h3 className="text-xl sm:text-3xl font-black bg-gradient-to-r from-amber-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">
                {animatingPrizeName}
              </h3>
              {animatingPrizeTier && (
                <p className="text-xs text-cyan-300 font-bold mt-0.5">{animatingPrizeTier}</p>
              )}

              {/* Slot Reel Spotlight Window */}
              <div className="mt-6 max-w-md mx-auto relative">
                {/* Rotating Aura Ring */}
                <div className="relative p-1 rounded-3xl bg-gradient-to-r from-amber-400 via-fuchsia-500 to-cyan-400 animate-gradient-flow shadow-2xl">
                  <div className="rounded-[20px] bg-[#0c051e]/95 p-5 sm:p-6 flex flex-col items-center">
                    <div
                      className={`w-28 h-36 sm:w-32 sm:h-40 rounded-2xl p-1 bg-gradient-to-tr from-fuchsia-500 via-amber-400 to-cyan-400 mb-3 shadow-xl transition-transform ${
                        animationPhase === 'slowing' ? 'scale-105' : 'scale-100'
                      }`}
                    >
                      <div className="w-full h-full rounded-xl overflow-hidden bg-zinc-900">
                        {shuffleCard.selfieUrl ? (
                          <img
                            src={shuffleCard.selfieUrl}
                            alt={shuffleCard.fullName}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl font-black text-amber-300">
                            ?
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-sm sm:text-base font-mono font-black tracking-widest text-amber-300 bg-amber-400/10 border border-amber-400/30 px-3 py-0.5 rounded-lg">
                      {shuffleCard.employeeId}
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-white mt-2 truncate max-w-full">
                      {shuffleCard.fullName}
                    </div>
                    <div className="text-xs text-cyan-300 font-bold mt-1">
                      {shuffleCard.department} · {shuffleCard.tableNumber}
                    </div>
                  </div>
                </div>
              </div>

              {/* Dynamic progress bar */}
              <div className="mt-6 max-w-sm mx-auto h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r from-fuchsia-500 via-amber-400 to-cyan-400 transition-all duration-700 ${
                    animationPhase === 'slowing' ? 'w-11/12' : 'w-2/3 animate-pulse'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>
      ) : latestWinner ? (
        <div
          className={`mb-8 relative rounded-3xl p-[2px] bg-gradient-to-tr from-fuchsia-500 via-amber-400 to-cyan-400 shadow-2xl overflow-hidden animate-party-glow transition-all duration-500 ${
            justWonHighlight ? 'scale-[1.01]' : ''
          }`}
        >
          <div className="rounded-[22px] bg-white/95 dark:bg-[#140a2b]/95 p-5 sm:p-7">
            <div className="text-center mb-5">
              <div className="inline-flex items-center gap-1.5 text-xs font-extrabold text-fuchsia-600 dark:text-amber-300">
                <Sparkles className="w-4 h-4 text-amber-500 dark:text-fuchsia-400" />
                <span>
                  {justWonHighlight
                    ? t('🎉 ผู้โชคดีคนใหม่ล่าสุดมาแล้ว!', '🎉 NEW WINNER JUST DRAWN!')
                    : t('ผู้โชคดีคนล่าสุด', 'Latest Winner')}
                </span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white mt-1 text-balance">
                {latestWinner.prizeName}
              </h3>
              <p className="text-xs text-cyan-700 dark:text-cyan-300 font-semibold mt-0.5">
                {latestWinner.prizeTier}
              </p>
            </div>

            <div className="flex flex-col md:flex-row items-center gap-6 bg-gradient-to-br from-fuchsia-50 via-amber-50/70 to-cyan-50 dark:from-violet-950/80 dark:via-[#1b0c38] dark:to-cyan-950/60 border border-fuchsia-300/60 dark:border-fuchsia-500/35 rounded-2xl p-5">
              {/* Paired Showcase: Winner Photo + Prize Image Side-by-Side */}
              <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                {/* 1. Winner Photo */}
                <div className="relative">
                  <div className="w-32 h-40 sm:w-36 sm:h-44 rounded-2xl p-1 bg-gradient-to-tr from-fuchsia-500 via-amber-400 to-cyan-400 shadow-xl">
                    <div className="w-full h-full rounded-xl overflow-hidden bg-zinc-200 dark:bg-zinc-900 relative">
                      {latestWinner.selfieUrl ? (
                        <img
                          src={latestWinner.selfieUrl}
                          alt={latestWinner.winnerName}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-zinc-500">
                          {t('ไม่มีรูปภาพ', 'No Photo')}
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent py-1.5 px-2 text-center">
                        <span className="text-[10px] font-extrabold text-white tracking-wide">
                          {t('ผู้โชคดี', 'Winner')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="absolute -top-2.5 -left-2.5 bg-gradient-to-tr from-fuchsia-500 to-rose-500 text-white p-1.5 rounded-xl shadow-lg">
                    <Trophy className="w-4 h-4" />
                  </div>
                </div>

                {/* 2. Prize Photo */}
                <div className="relative">
                  <div className="w-32 h-40 sm:w-36 sm:h-44 rounded-2xl p-1 bg-gradient-to-tr from-amber-400 via-orange-500 to-fuchsia-500 shadow-xl">
                    <div className="w-full h-full rounded-xl overflow-hidden bg-white dark:bg-zinc-900 relative flex items-center justify-center">
                      {latestWinnerPrizeImage && !brokenImages[`winner_${latestWinner.prizeId}`] ? (
                        <img
                          src={latestWinnerPrizeImage}
                          alt={latestWinner.prizeName}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                          onError={() =>
                            setBrokenImages((prev) => ({
                              ...prev,
                              [`winner_${latestWinner.prizeId}`]: true,
                            }))
                          }
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-100 via-fuchsia-50 to-cyan-100 dark:from-violet-950 dark:to-zinc-900 p-3 text-center">
                          <Gift className="w-10 h-10 text-fuchsia-500 dark:text-amber-400 mb-1" />
                          <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-200 line-clamp-2">
                            {latestWinner.prizeName}
                          </span>
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent py-1.5 px-2 text-center">
                        <span className="text-[10px] font-extrabold text-amber-300 tracking-wide">
                          {t('ของรางวัล', 'Prize')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="absolute -top-2.5 -right-2.5 bg-gradient-to-tr from-amber-400 to-orange-500 text-white p-1.5 rounded-xl shadow-lg">
                    <Gift className="w-4 h-4" />
                  </div>
                </div>
              </div>

              <div className="text-center md:text-left flex-1 min-w-0">
                <div className="text-xs font-mono text-fuchsia-600 dark:text-amber-300 font-extrabold mb-1">
                  {latestWinner.employeeId}
                </div>
                <h4 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight truncate">
                  {latestWinner.winnerName}
                </h4>
                {latestWinner.nickname && (
                  <p className="text-sm font-bold text-orange-600 dark:text-amber-300 mt-0.5">
                    {t(`คุณ${latestWinner.nickname}`, latestWinner.nickname)}
                  </p>
                )}
                <p className="text-xs text-zinc-700 dark:text-zinc-300 mt-1.5 font-medium">
                  {t(`แผนก ${latestWinner.department}`, latestWinner.department)}
                </p>

                <div className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-fuchsia-500 via-orange-500 to-amber-400 text-white text-xs font-extrabold shadow-md">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{latestWinner.tableNumber}</span>
                </div>
              </div>
            </div>

            {/* LIVE 60-SECOND CLAIM COUNTDOWN BANNER (Controlled by Admin) */}
            {countdownSeconds !== null && (
              <div
                className={`mt-5 rounded-2xl p-4 sm:p-5 border-2 transition-all shadow-xl ${
                  countdownSeconds === 0
                    ? 'bg-gradient-to-r from-rose-600/20 via-red-500/20 to-orange-500/20 border-rose-500 animate-pulse'
                    : isCountdownUrgent
                    ? 'bg-gradient-to-r from-rose-500/15 via-orange-500/15 to-amber-500/15 border-rose-500 dark:border-rose-400'
                    : isCountdownWarning
                    ? 'bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-yellow-500/15 border-amber-400'
                    : 'bg-gradient-to-r from-cyan-500/15 via-emerald-500/15 to-teal-500/15 border-cyan-400 dark:border-cyan-400/70'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Circular Countdown Gauge */}
                  <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                    <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r={ringRadius}
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="transparent"
                        className="text-slate-200 dark:text-white/10"
                      />
                      <circle
                        cx="50"
                        cy="50"
                        r={ringRadius}
                        stroke="currentColor"
                        strokeWidth="8"
                        strokeLinecap="round"
                        fill="transparent"
                        strokeDasharray={ringCircumference}
                        strokeDashoffset={ringDashOffset}
                        className={`transition-all duration-300 ${
                          countdownSeconds === 0 || isCountdownUrgent
                            ? 'text-rose-500'
                            : isCountdownWarning
                            ? 'text-amber-500'
                            : 'text-emerald-500 dark:text-cyan-400'
                        }`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span
                        className={`text-3xl font-black font-mono tabular-nums leading-none ${
                          countdownSeconds === 0 || isCountdownUrgent
                            ? 'text-rose-600 dark:text-rose-400'
                            : isCountdownWarning
                            ? 'text-amber-600 dark:text-amber-300'
                            : 'text-cyan-700 dark:text-cyan-300'
                        }`}
                      >
                        {countdownSeconds}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 dark:text-purple-200 uppercase">
                        {t('วินาที', 'SEC')}
                      </span>
                    </div>
                  </div>

                  {/* Countdown Description & Linear Bar */}
                  <div className="flex-1 min-w-0 text-center sm:text-left w-full">
                    <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-black uppercase tracking-wide">
                      {countdownSeconds === 0 ? (
                        <>
                          <AlertCircle className="w-4 h-4 text-rose-500" />
                          <span className="text-rose-600 dark:text-rose-300">
                            {t('หมดเวลารับรางวัลแล้ว!', "TIME'S UP — CLAIM EXPIRED!")}
                          </span>
                        </>
                      ) : (
                        <>
                          <Timer
                            className={`w-4 h-4 ${
                              isCountdownUrgent
                                ? 'text-rose-500 animate-spin'
                                : 'text-cyan-600 dark:text-cyan-300 animate-pulse'
                            }`}
                          />
                          <span
                            className={
                              isCountdownUrgent
                                ? 'text-rose-600 dark:text-rose-300'
                                : 'text-cyan-700 dark:text-cyan-300'
                            }
                          >
                            {isCountdownUrgent
                              ? t('นาทีสุดท้าย! กรุณาแสดงตัวด่วน', 'FINAL SECONDS! PLEASE COME TO STAGE')
                              : t('นับถอยหลังยืนยันสิทธิ์รับรางวัล (60 วินาที)', '60-SECOND CLAIM COUNTDOWN')}
                          </span>
                        </>
                      )}
                    </div>

                    <p className="text-sm font-extrabold text-slate-900 dark:text-white mt-1">
                      {countdownSeconds === 0
                        ? t(
                            `ไม่พบผู้มารับรางวัล (${latestWinner.winnerName}) ภายในเวลาที่กำหนด`,
                            `No claim recorded for ${latestWinner.winnerName} within 60 seconds`
                          )
                        : t(
                            `ขอเชิญคุณ ${latestWinner.winnerName} (${latestWinner.employeeId}) ขึ้นรับรางวัลบนเวที`,
                            `${latestWinner.winnerName} (${latestWinner.employeeId}), please claim your prize on stage!`
                          )}
                    </p>

                    <div className="mt-2.5 h-2.5 w-full rounded-full bg-slate-200/80 dark:bg-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          countdownSeconds === 0 || isCountdownUrgent
                            ? 'bg-gradient-to-r from-rose-500 to-red-500'
                            : isCountdownWarning
                            ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                            : 'bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500'
                        }`}
                        style={{ width: `${Math.round(countdownProgress * 100)}%` }}
                      />
                    </div>

                    {isCountdownMinimized && (
                      <div className="mt-3 flex justify-center sm:justify-start">
                        <button
                          type="button"
                          onClick={() => {
                            soundFX.playClick();
                            setIsCountdownMinimized(false);
                          }}
                          className="min-h-[36px] px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-white/15 hover:bg-slate-800 dark:hover:bg-white/25 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                          <span>{t('ขยายเลขนับถอยหลังเต็มจอ', 'Expand Fullscreen Countdown')}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="text-center mt-4 text-[11px] text-zinc-600 dark:text-zinc-300 font-mono tabular-nums">
              {t('จับรางวัลเมื่อ', 'Drawn at')}{' '}
              {new Date(latestWinner.wonAt).toLocaleTimeString(lang === 'en' ? 'en-US' : 'th-TH', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </div>
          </div>
        </div>
      ) : config.isRegistrationOpen ? null : (
        <div className="mb-8 p-8 rounded-3xl bg-white/95 dark:bg-[#140a2b]/95 border-2 border-fuchsia-300/60 dark:border-fuchsia-500/40 text-center shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-fuchsia-500 via-orange-500 to-amber-400 flex items-center justify-center mx-auto mb-3 text-white shadow-lg animate-float">
            <Trophy className="w-8 h-8" />
          </div>
          <h3 className="text-base font-extrabold text-zinc-900 dark:text-white mb-1">
            {t('การสุ่มจับรางวัล Lucky Draw จะเริ่มขึ้นเร็วๆ นี้', 'Lucky Draw Starting Soon')}
          </h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-300 max-w-sm mx-auto leading-relaxed">
            {t(
              'รูปภาพและชื่อของผู้โชคดีที่ลงทะเบียนสำเร็จจะปรากฏขึ้นบนหน้าจอนี้แบบเรียลไทม์ทันทีที่จับรางวัล',
              'Verified winner photos and names will appear live on this screen as soon as each round is drawn.'
            )}
          </p>
        </div>
      )}

      {/* =========================================================================
          REAL-TIME CHECK-IN STATISTICS & LATEST 10 REGISTRATIONS (When registration is OPEN)
      ========================================================================= */}
      {config.isRegistrationOpen && !isAnimatingDraw && (
        <div className="mb-8 space-y-5">
          {/* Registration Stats Card */}
          <div className="rounded-3xl p-[2px] bg-gradient-to-r from-emerald-400 via-cyan-400 to-fuchsia-500 shadow-xl shadow-cyan-500/15">
            <div className="rounded-[22px] bg-white/95 dark:bg-[#140a2b]/95 p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white shadow-md shrink-0">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-300 uppercase tracking-wider">
                      {t('LIVE CHECK-IN STATISTICS', 'LIVE CHECK-IN STATISTICS')}
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-zinc-900 dark:text-white">
                      {t('สถิติการลงทะเบียนเข้างานแบบเรียลไทม์', 'Real-Time Event Check-in Statistics')}
                    </h3>
                  </div>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-400/40 text-xs font-extrabold self-start sm:self-center">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>{t('กำลังเปิดรับลงทะเบียน', 'Registration Open')}</span>
                </div>
              </div>

              {/* 3 KPI Tiles */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-500/15 dark:to-teal-500/10 border border-emerald-300/70 dark:border-emerald-400/40">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-300 mb-1">
                    <span>{t('ลงทะเบียนเข้างานแล้ว', 'Checked In')}</span>
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div className="text-3xl font-black text-emerald-700 dark:text-emerald-300 font-mono tabular-nums">
                    {registrationStats.checkedInCount.toLocaleString()}{' '}
                    <span className="text-xs font-semibold font-sans">{t('คน', 'guests')}</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-500/15 dark:to-blue-500/10 border border-cyan-300/70 dark:border-cyan-400/40">
                  <div className="flex items-center justify-between text-xs font-bold text-cyan-700 dark:text-cyan-300 mb-1">
                    <span>{t('อัตราการเข้าร่วมงาน', 'Check-in Rate')}</span>
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="text-3xl font-black text-cyan-700 dark:text-cyan-300 font-mono tabular-nums">
                    {registrationStats.attendancePercent}%
                    <span className="text-xs font-semibold font-sans ml-1.5 text-cyan-700/80 dark:text-cyan-200/80">
                      ({registrationStats.checkedInCount}/{registrationStats.totalEmployees})
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-gradient-to-br from-fuchsia-50 to-amber-50 dark:from-fuchsia-500/15 dark:to-amber-500/10 border border-fuchsia-300/70 dark:border-fuchsia-400/40">
                  <div className="flex items-center justify-between text-xs font-bold text-fuchsia-700 dark:text-amber-300 mb-1">
                    <span>{t('รายชื่อพนักงานทั้งหมด', 'Total Roster')}</span>
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="text-3xl font-black text-fuchsia-700 dark:text-amber-300 font-mono tabular-nums">
                    {registrationStats.totalEmployees.toLocaleString()}{' '}
                    <span className="text-xs font-semibold font-sans">{t('คน', 'staff')}</span>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex items-center justify-between text-[11px] font-bold text-zinc-600 dark:text-zinc-300 mb-1.5">
                  <span>
                    {t(
                      `ความคืบหน้าการเช็คอินเข้างาน (${registrationStats.attendancePercent}%)`,
                      `Check-in Progress (${registrationStats.attendancePercent}%)`
                    )}
                  </span>
                  <span className="font-mono tabular-nums">
                    {t(
                      `รอลงทะเบียนอีก ${registrationStats.remainingToCheckIn.toLocaleString()} คน`,
                      `${registrationStats.remainingToCheckIn.toLocaleString()} pending`
                    )}
                  </span>
                </div>
                <div className="h-3 w-full rounded-full bg-zinc-200 dark:bg-white/10 overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-fuchsia-500 transition-all duration-500"
                    style={{ width: `${Math.max(registrationStats.checkedInCount > 0 ? 3 : 0, registrationStats.attendancePercent)}%` }}
                  />
                </div>
              </div>

              {/* Top Checked-in Departments */}
              {registrationStats.topDepartments.length > 0 && (
                <div className="mt-4 pt-3.5 border-t border-zinc-200/80 dark:border-white/10 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400">
                    {t('แผนกที่เข้างานสูงสุด:', 'Top Departments:')}
                  </span>
                  {registrationStats.topDepartments.map(([dept, count]) => (
                    <span
                      key={dept}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 dark:bg-cyan-500/15 border border-cyan-300/60 dark:border-cyan-400/30 text-[11px] font-bold text-cyan-800 dark:text-cyan-200"
                    >
                      <span>{dept}</span>
                      <span className="font-mono text-fuchsia-600 dark:text-amber-300">{count}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Latest 10 Checked-in Attendees Feed */}
          <div className="rounded-3xl bg-white/95 dark:bg-[#140a2b]/95 border-2 border-cyan-300/70 dark:border-cyan-400/40 p-5 sm:p-6 shadow-xl">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                <h3 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-white">
                  {t('รายชื่อผู้ลงทะเบียนล่าสุด 10 ลำดับ', 'Latest 10 Checked-in Guests')}
                </h3>
              </div>
              <span className="text-[11px] font-mono font-bold text-cyan-700 dark:text-cyan-300">
                {t(`แสดง ${registrationStats.latestTen.length} รายการล่าสุด`, `Showing latest ${registrationStats.latestTen.length}`)}
              </span>
            </div>

            {registrationStats.latestTen.length > 0 ? (
              <div className="space-y-2.5">
                {registrationStats.latestTen.map((att, idx) => {
                  const isNewest = idx === 0;
                  return (
                    <div
                      key={att.id}
                      className={`p-3 rounded-2xl border flex items-center gap-3 transition-all ${
                        isNewest
                          ? 'bg-gradient-to-r from-emerald-50 via-cyan-50 to-fuchsia-50 dark:from-emerald-500/15 dark:via-cyan-500/15 dark:to-fuchsia-500/15 border-emerald-400 dark:border-emerald-400/60 shadow-md'
                          : 'bg-zinc-50/80 dark:bg-[#0b051c]/80 border-zinc-200 dark:border-purple-500/25'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-black shrink-0 ${
                          isNewest
                            ? 'bg-gradient-to-br from-emerald-500 to-cyan-500 text-white shadow'
                            : 'bg-zinc-200 dark:bg-white/10 text-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        {idx + 1}
                      </div>

                      <div className="w-11 h-12 rounded-xl overflow-hidden bg-zinc-200 dark:bg-zinc-900 border border-fuchsia-300/60 dark:border-cyan-400/40 shrink-0">
                        {att.selfieUrl ? (
                          <img
                            src={att.selfieUrl}
                            alt={att.fullName}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-zinc-500">
                            {att.fullName.slice(0, 2)}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs sm:text-sm font-extrabold text-zinc-900 dark:text-white truncate">
                            {att.fullName}
                          </span>
                          {att.nickname && (
                            <span className="text-xs font-bold text-fuchsia-600 dark:text-amber-300">
                              ({att.nickname})
                            </span>
                          )}
                          <span className="text-[11px] font-mono font-bold text-cyan-700 dark:text-cyan-300">
                            {att.employeeId}
                          </span>
                          {isNewest && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-white text-[9px] font-black tracking-wider uppercase animate-pulse">
                              {t('ล่าสุด', 'NEW')}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-zinc-600 dark:text-zinc-300 truncate mt-0.5">
                          {att.department} · <span className="font-bold text-amber-700 dark:text-amber-300">{att.tableNumber}</span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[11px] font-mono tabular-nums text-zinc-500 dark:text-zinc-400 block">
                          {new Date(att.registeredAt).toLocaleTimeString(lang === 'en' ? 'en-US' : 'th-TH', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          {t('เช็คอินแล้ว', 'Checked In')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-zinc-50 dark:bg-[#0b051c]/70 border border-dashed border-cyan-300/70 dark:border-cyan-500/30 text-center text-xs text-zinc-500 dark:text-zinc-400">
                {t(
                  'ยังไม่มีผู้ลงทะเบียนเข้างาน — รายชื่อผู้เช็คอิน 10 ลำดับล่าสุดจะแสดงขึ้นที่นี่แบบเรียลไทม์ทันทีที่สแกนลงทะเบียน',
                  'No check-ins yet — the latest 10 registered guests will appear here in real time.'
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Prize List & Remaining Status */}
      <div className="mb-8">
        <h3 className="text-sm font-extrabold text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
          <Gift className="w-4 h-4 text-fuchsia-600 dark:text-amber-400" />
          <span>{t('รายการของรางวัลในค่ำคืนนี้', "Tonight's Prize Lineup")}</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {prizes.map((p, idx) => {
            const hasValidImage = p.imageUrl && !brokenImages[p.id];
            const isTargetRound = config.isVipTriggerActive && config.vipActivePrizeId === p.id;
            return (
              <div
                key={p.id}
                className={`p-3.5 rounded-2xl bg-white/95 dark:bg-[#140a2b]/95 border-2 flex items-center gap-3.5 shadow-sm transition ${
                  isTargetRound
                    ? 'border-amber-400 ring-2 ring-amber-400/35 shadow-lg shadow-amber-500/20'
                    : prizeCardBorders[idx % prizeCardBorders.length]
                }`}
              >
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-gradient-to-br from-fuchsia-100 to-cyan-100 dark:from-violet-950 dark:to-zinc-950 border border-fuchsia-200 dark:border-violet-700 shrink-0 flex items-center justify-center">
                  {hasValidImage ? (
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={() => setBrokenImages((prev) => ({ ...prev, [p.id]: true }))}
                    />
                  ) : (
                    <Gift className="w-6 h-6 text-fuchsia-500 dark:text-amber-400" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-zinc-900 dark:text-white truncate">{p.name}</div>
                  <div className="text-[11px] text-zinc-600 dark:text-zinc-300 mt-0.5 truncate">{p.tier}</div>
                  {isTargetRound ? (
                    <div className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-300 truncate mt-0.5">
                      {t('● รางวัลที่กำลังจะจับรอบนี้', '● Active Round Prize')}
                    </div>
                  ) : (
                    p.sponsor && (
                      <div className="text-[10px] text-fuchsia-600 dark:text-amber-300 truncate mt-0.5">
                        {t(`มอบโดย ${p.sponsor}`, `Sponsored by ${p.sponsor}`)}
                      </div>
                    )
                  )}
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`text-xs font-mono tabular-nums font-extrabold ${
                      p.remaining > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400 dark:text-zinc-500'
                    }`}
                  >
                    {p.remaining > 0
                      ? t(`เหลือ ${p.remaining}`, `${p.remaining} left`)
                      : t('ครบแล้ว', 'Claimed')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ALL WINNERS HISTORY LIST */}
      <div>
        <h3 className="text-sm font-extrabold text-zinc-900 dark:text-white mb-3 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span>
              {t(`ทำเนียบผู้โชคดีทั้งหมด (${winners.length} ท่าน)`, `All Winners (${winners.length})`)}
            </span>
          </span>
        </h3>

        {winners.length > 0 ? (
          <div className="space-y-2.5">
            {winners.map((rec, index) => {
              const recPrizeImg =
                rec.prizeImageUrl || prizes.find((p) => p.id === rec.prizeId)?.imageUrl || '';
              return (
              <div
                key={rec.id}
                className="p-3.5 rounded-2xl bg-white/95 dark:bg-[#140a2b]/95 border border-fuchsia-300/50 dark:border-violet-700 hover:border-cyan-400 flex items-center gap-3.5 transition shadow-sm"
              >
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="w-12 h-14 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-950 shrink-0 border-2 border-fuchsia-400">
                    {rec.selfieUrl ? (
                      <img
                        src={rec.selfieUrl}
                        alt={rec.winnerName}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-fuchsia-600 dark:text-amber-400 font-mono font-bold">
                        #{winners.length - index}
                      </div>
                    )}
                  </div>
                  <div className="w-12 h-14 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-950 shrink-0 border-2 border-amber-400 flex items-center justify-center">
                    {recPrizeImg && !brokenImages[`hist_${rec.id}`] ? (
                      <img
                        src={recPrizeImg}
                        alt={rec.prizeName}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setBrokenImages((prev) => ({ ...prev, [`hist_${rec.id}`]: true }))
                        }
                      />
                    ) : (
                      <Gift className="w-5 h-5 text-amber-500 dark:text-amber-300" />
                    )}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-extrabold text-zinc-900 dark:text-white truncate">
                      {rec.winnerName}
                    </span>
                    {rec.nickname && (
                      <span className="text-xs text-fuchsia-600 dark:text-amber-300 font-semibold">
                        ({rec.nickname})
                      </span>
                    )}
                    <span className="text-[11px] font-mono text-cyan-700 dark:text-cyan-300 font-bold">
                      {rec.employeeId}
                    </span>
                  </div>
                  <div className="text-[11px] text-orange-600 dark:text-amber-300 font-bold truncate mt-0.5">
                    {rec.prizeName} <span className="text-zinc-400 dark:text-zinc-500">·</span>{' '}
                    <span className="text-zinc-700 dark:text-zinc-200">{rec.tableNumber}</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono tabular-nums block">
                    {new Date(rec.wonAt).toLocaleTimeString(lang === 'en' ? 'en-US' : 'th-TH', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                    {t('ได้รับรางวัล', 'Winner')}
                  </span>
                </div>
              </div>
              );
            })}
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-white/95 dark:bg-[#140a2b]/95 border-2 border-dashed border-fuchsia-300 dark:border-violet-700 text-center text-xs text-zinc-600 dark:text-zinc-300">
            {t('ยังไม่มีประวัติการแจกรางวัลในระบบ', 'No winners drawn yet.')}
          </div>
        )}
      </div>
    </div>
  );
};
