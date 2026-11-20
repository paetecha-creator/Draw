/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useMemo, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Lock, Loader2 } from 'lucide-react';
import {
  AttendeeRegistration,
  EmployeeRoster,
  LuckyDrawRecord,
  PartyConfig,
  Prize,
} from './types/party';
import { FirestoreService, toSafeDocId } from './services/firestoreService';
import { Navbar } from './components/Navbar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { RegistrationForm } from './components/RegistrationForm';
import { TicketPass } from './components/TicketPass';
import { LiveDrawFeed } from './components/LiveDrawFeed';
import { AdminDashboard } from './components/AdminDashboard';
import { VipDrawScreen } from './components/VipDrawScreen';
import { CheckinDisplayScreen } from './components/CheckinDisplayScreen';
import { AdminLoginModal } from './components/AdminLoginModal';
import { soundFX } from './utils/audio';
import { usePreferences } from './contexts/PreferencesContext';

export default function App() {
  const { t } = usePreferences();
  // Application Data States synced directly from Firebase Firestore (with instant Sheets/cache hydration)
  const [roster, setRoster] = useState<EmployeeRoster[]>(() => FirestoreService.getCachedRoster());
  const [registrations, setRegistrations] = useState<AttendeeRegistration[]>(() =>
    FirestoreService.getCachedRegistrations()
  );
  const [prizes, setPrizes] = useState<Prize[]>(() => FirestoreService.getCachedPrizes());
  const [luckyWinners, setLuckyWinners] = useState<LuckyDrawRecord[]>(() =>
    FirestoreService.getCachedLuckyWinners()
  );
  const [config, setConfig] = useState<PartyConfig>(() => FirestoreService.getCachedConfig());
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [asyncError, setAsyncError] = useState<Error | null>(null);

  // Rethrow async Firestore permission errors into ErrorBoundary
  if (asyncError) {
    throw asyncError;
  }

  // Navigation View State (Supports ?vip=1/#vip, ?live=1/#live, and ?checkin=1/#checkin for Entrance Display)
  const [currentView, setCurrentView] = useState<'register' | 'ticket' | 'livedraw' | 'admin' | 'vip' | 'checkin'>(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get('vip') === '1' || searchParams.get('vip') === 'true' || window.location.hash === '#vip') {
        return 'vip';
      }
      if (searchParams.get('live') === '1' || searchParams.get('live') === 'true' || window.location.hash === '#live') {
        return 'livedraw';
      }
      if (searchParams.get('checkin') === '1' || searchParams.get('checkin') === 'true' || window.location.hash === '#checkin') {
        return 'checkin';
      }
    }
    return 'register';
  });

  const [myRegistration, setMyRegistration] = useState<AttendeeRegistration | null>(() => {
    const cachedPass = FirestoreService.getMyRegistrationCached();
    if (cachedPass) return cachedPass;
    const myId = FirestoreService.getMyRegistrationId();
    if (!myId) return null;
    return FirestoreService.getCachedRegistrations().find((r) => r.id === myId) || null;
  });
  const [liveRosterCount, setLiveRosterCount] = useState<number>(() =>
    FirestoreService.getCachedRoster().length
  );

  // Admin Auth State (Unlocked via Numpad PIN: 236248)
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    return sessionStorage.getItem('admin_session_auth') === 'true';
  });
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState(false);
  const [isCheckinFullscreen, setIsCheckinFullscreen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const searchParams = new URLSearchParams(window.location.search);
    return (
      searchParams.get('checkin') === '1' ||
      searchParams.get('checkin') === 'true' ||
      window.location.hash === '#checkin'
    );
  });
  const isVipDrawingRef = useRef(false);

  useEffect(() => {
    if (currentView !== 'checkin' && isCheckinFullscreen) {
      setIsCheckinFullscreen(false);
    }
  }, [currentView, isCheckinFullscreen]);

  // Automatic full-screen experience across all devices (Desktop, Android, Tablet, TV, iOS)
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    // On mobile browsers (including iOS Safari), collapse URL bar where supported
    const scrollTimer = window.setTimeout(() => {
      if (window.scrollY === 0 && window.innerWidth <= 1024) {
        window.scrollTo(0, 1);
      }
    }, 120);

    // Only auto-trigger native browser Fullscreen API when running top-level (not embedded preview iframe)
    let isEmbedded = false;
    try {
      isEmbedded = window.self !== window.top;
    } catch {
      isEmbedded = true;
    }
    if (isEmbedded) {
      return () => window.clearTimeout(scrollTimer);
    }

    const docEl = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
      msRequestFullscreen?: () => Promise<void> | void;
    };
    const requestFs =
      docEl.requestFullscreen?.bind(docEl) ||
      docEl.webkitRequestFullscreen?.bind(docEl) ||
      docEl.msRequestFullscreen?.bind(docEl);

    if (!requestFs) {
      return () => window.clearTimeout(scrollTimer);
    }

    let attempted = false;
    const tryEnterFullscreen = (e?: Event) => {
      if (attempted || document.fullscreenElement) return;
      // Avoid interrupting text input focus or native camera/gallery file pickers
      const target = e?.target as HTMLElement | null;
      if (target && target.closest('input, textarea, select, label')) {
        return;
      }
      attempted = true;
      try {
        const result = requestFs();
        if (result && typeof (result as Promise<void>).catch === 'function') {
          (result as Promise<void>).catch(() => {});
        }
      } catch {
        // Ignore browser gesture restriction errors
      }
      window.removeEventListener('pointerdown', tryEnterFullscreen, true);
      window.removeEventListener('click', tryEnterFullscreen, true);
    };

    // Attempt immediately (works in kiosk/installed web apps) & fall back to first gesture
    try {
      const immediate = requestFs();
      if (immediate && typeof (immediate as Promise<void>).then === 'function') {
        (immediate as Promise<void>)
          .then(() => {
            attempted = true;
          })
          .catch(() => {
            window.addEventListener('pointerdown', tryEnterFullscreen, true);
            window.addEventListener('click', tryEnterFullscreen, true);
          });
      }
    } catch {
      window.addEventListener('pointerdown', tryEnterFullscreen, true);
      window.addEventListener('click', tryEnterFullscreen, true);
    }

    return () => {
      window.clearTimeout(scrollTimer);
      window.removeEventListener('pointerdown', tryEnterFullscreen, true);
      window.removeEventListener('click', tryEnterFullscreen, true);
    };
  }, []);

  // Keep personal pass synced with cached/live registrations without extra reads
  useEffect(() => {
    const myId = FirestoreService.getMyRegistrationId();
    if (!myId) {
      setMyRegistration(null);
      return;
    }
    const liveMatch = registrations.find((r) => r.id === myId);
    if (liveMatch) {
      setMyRegistration(liveMatch);
      FirestoreService.setMyRegistrationCached(liveMatch);
      return;
    }
    if (!myRegistration) {
      const cachedPass = FirestoreService.getMyRegistrationCached();
      if (cachedPass && cachedPass.id === myId) {
        setMyRegistration(cachedPass);
      } else {
        FirestoreService.fetchMyRegistrationById(myId).then((fetched) => {
          if (fetched) setMyRegistration(fetched);
        });
      }
    }
  }, [registrations]);

  // Core lightweight real-time subscription: ONLY config (1 doc) + local tab BroadcastChannel.
  // Zero polling! Push-only updates exclusively when Firestore documents change.
  useEffect(() => {
    let isMounted = true;
    const unsubs = [
      FirestoreService.subscribeConfig((freshConfig) => {
        if (isMounted) setConfig(freshConfig);
      }),
      FirestoreService.subscribeLocalSync((area) => {
        if (!isMounted) return;
        if (area === 'config' || area === 'all') setConfig(FirestoreService.getCachedConfig());
        if (area === 'roster' || area === 'all') setRoster(FirestoreService.getCachedRoster());
        if (area === 'prizes' || area === 'all') setPrizes(FirestoreService.getCachedPrizes());
        if (area === 'registrations' || area === 'all') setRegistrations(FirestoreService.getCachedRegistrations());
        if (area === 'winners' || area === 'all') setLuckyWinners(FirestoreService.getCachedLuckyWinners());
      }),
    ];

    return () => {
      isMounted = false;
      unsubs.forEach((unsub) => unsub());
    };
  }, []);

  // View-scoped event-driven real-time subscriptions:
  // Regular attendees (register / ticket) NEVER subscribe to full collections — saving >99% Firestore free quota!
  // Admin, LIVE stage projector, and VIP remote use native onSnapshot push updates (only when data changes).
  useEffect(() => {
    const needsLiveCollections =
      currentView === 'admin' || currentView === 'livedraw' || currentView === 'vip';

    if (!needsLiveCollections) {
      return;
    }

    let isMounted = true;
    const unsubs: Array<() => void> = [
      FirestoreService.subscribePrizes((freshPrizes) => {
        if (isMounted) setPrizes(freshPrizes);
      }),
      FirestoreService.subscribeRegistrations((freshRegs) => {
        if (isMounted) setRegistrations(freshRegs);
      }),
      FirestoreService.subscribeLuckyWinners((freshWinners) => {
        if (isMounted) setLuckyWinners(freshWinners);
      }),
    ];

    // Subscribe to full roster only in Admin & VIP; on LIVE projector use a 1-read count query
    if (currentView === 'admin' || currentView === 'vip') {
      unsubs.push(
        FirestoreService.subscribeRoster((freshRoster) => {
          if (isMounted) {
            setRoster(freshRoster);
            setLiveRosterCount(freshRoster.length);
          }
        })
      );
    } else if (currentView === 'livedraw') {
      FirestoreService.fetchRosterCount().then((count) => {
        if (isMounted && count !== null) {
          setLiveRosterCount(count);
        }
      });
    }

    // Only run initial seed check from Admin view so 1,000 attendees never trigger seed checks
    if (currentView === 'admin' && isAdminLoggedIn) {
      FirestoreService.ensureInitialSeed()
        .catch((err) => {
          if (!isMounted) return;
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.toLowerCase().includes('permission')) {
            setAsyncError(err instanceof Error ? err : new Error(msg));
          } else {
            console.warn('Background Firestore seed notice:', msg);
          }
        })
        .finally(() => {
          if (isMounted) setIsInitialLoading(false);
        });
    }

    return () => {
      isMounted = false;
      unsubs.forEach((unsub) => unsub());
    };
  }, [currentView, isAdminLoggedIn]);

  // Compute eligible candidates (strictly exclude ALL previous winners and any disqualified/blocked guests)
  const eligibleCandidates = useMemo(() => {
    const wonEmployeeIds = new Set(luckyWinners.map((w) => w.employeeId.trim().toUpperCase()));
    const blockedGroupSet = new Set(config.blockedGroups || []);

    return registrations.filter((att) => {
      const empId = att.employeeId.trim().toUpperCase();
      if (wonEmployeeIds.has(empId)) return false;
      if (att.groupRole && blockedGroupSet.has(att.groupRole)) return false;
      if (att.isBlockedFromDraw) return false;

      const rosterItem = roster.find((r) => r.id.trim().toUpperCase() === empId);
      if (rosterItem?.isBlockedFromDraw) return false;
      if (rosterItem?.groupRole && blockedGroupSet.has(rosterItem.groupRole)) return false;

      return true;
    });
  }, [registrations, luckyWinners, config.blockedGroups, roster]);

  // Handlers writing directly to Firestore with instant optimistic local state updates
  const handleRegisterSuccess = async (newReg: AttendeeRegistration) => {
    const empIdUpper = newReg.employeeId.trim().toUpperCase();
    const alreadyRegisteredLocal = registrations.some(
      (r) => r.employeeId.trim().toUpperCase() === empIdUpper
    );
    if (alreadyRegisteredLocal) {
      throw new Error('DUPLICATE_REGISTRATION');
    }

    // 1-doc server guard so 1,000 devices enforce 1-per-ID without subscribing to full collection
    const remoteExisting = await FirestoreService.lookupRegistrationByEmployeeId(empIdUpper);
    if (remoteExisting) {
      throw new Error('DUPLICATE_REGISTRATION');
    }

    const docId = toSafeDocId('REG_', empIdUpper);
    const existingRoster = roster.find((r) => r.id.trim().toUpperCase() === empIdUpper);
    const preserveBlocked = Boolean(
      newReg.isBlockedFromDraw || existingRoster?.isBlockedFromDraw
    );

    const saved: AttendeeRegistration = {
      ...newReg,
      id: docId,
      employeeId: empIdUpper,
      isBlockedFromDraw: preserveBlocked,
    };

    // Instant auto-redirect to Digital Ticket Pass without waiting on network latency
    FirestoreService.setMyRegistrationId(docId);
    FirestoreService.setMyRegistrationCached(saved);
    setRegistrations((prev) => [saved, ...prev.filter((r) => r.id !== docId)]);
    setMyRegistration(saved);
    setCurrentView('ticket');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Sync to Firestore in background (already written to localStorage + BroadcastChannel)
    FirestoreService.addRegistration(saved).catch((err) => {
      console.warn('Background registration sync warning:', err);
    });
  };

  const handleUpdateConfig = async (newConfig: PartyConfig) => {
    setConfig(newConfig);
    try {
      await FirestoreService.setConfig(newConfig);
    } catch (err) {
      console.warn('Config update sync warning:', err);
    }
  };

  const handleUpdateRoster = async (newRoster: EmployeeRoster[]) => {
    setRoster(newRoster);
    try {
      await FirestoreService.setRoster(newRoster);
    } catch (err) {
      console.warn('Roster update sync warning:', err);
    }
  };

  const handleUpdatePrizes = async (newPrizes: Prize[]) => {
    setPrizes(newPrizes);
    try {
      await FirestoreService.setPrizes(newPrizes);
    } catch (err) {
      console.warn('Prizes update sync warning:', err);
    }
  };

  const handleAddLuckyWinner = async (newWinner: LuckyDrawRecord) => {
    // Hard guard against duplicate winner or over-drawing prize stock
    const alreadyWon = luckyWinners.some(
      (w) => w.employeeId.trim().toUpperCase() === newWinner.employeeId.trim().toUpperCase()
    );
    if (alreadyWon) return;

    const targetPrize = prizes.find((p) => p.id === newWinner.prizeId);
    const drawnForPrize = luckyWinners.filter((w) => w.prizeId === newWinner.prizeId).length;
    if (targetPrize && (targetPrize.remaining <= 0 || drawnForPrize >= targetPrize.quantity)) {
      return;
    }

    setLuckyWinners((prev) => [newWinner, ...prev.filter((w) => w.id !== newWinner.id)]);
    setPrizes((prev) =>
      prev.map((p) =>
        p.id === newWinner.prizeId ? { ...p, remaining: Math.max(0, p.remaining - 1) } : p
      )
    );
    setConfig((prev) => ({
      ...prev,
      isVipTriggerActive: false,
      claimCountdownEndAt: '',
      claimCountdownWinnerId: '',
      claimCountdownPrizeId: '',
    }));

    try {
      await FirestoreService.addLuckyWinner(newWinner, config);
    } catch (err) {
      console.warn('Add lucky winner sync warning:', err);
    }
  };

  const handleDeleteLuckyWinner = async (recordId: string) => {
    const target = luckyWinners.find((w) => w.id === recordId);
    if (target) {
      setLuckyWinners((prev) => prev.filter((w) => w.id !== recordId));
      setPrizes((prev) =>
        prev.map((p) =>
          p.id === target.prizeId ? { ...p, remaining: Math.min(p.quantity, p.remaining + 1) } : p
        )
      );
      if (config.claimCountdownWinnerId === recordId) {
        setConfig((prev) => ({
          ...prev,
          claimCountdownEndAt: '',
          claimCountdownWinnerId: '',
          claimCountdownPrizeId: '',
        }));
      }
      try {
        await FirestoreService.deleteLuckyWinner(target);
      } catch (err) {
        console.warn('Delete lucky winner sync warning:', err);
      }
    }
  };

  const handleForfeitAndBlockWinner = async (record: LuckyDrawRecord) => {
    const empUpper = record.employeeId.trim().toUpperCase();
    const prizeId = record.prizeId;

    setLuckyWinners((prev) => prev.filter((w) => w.id !== record.id));
    setPrizes((prev) =>
      prev.map((p) =>
        p.id === prizeId ? { ...p, remaining: Math.min(p.quantity, p.remaining + 1) } : p
      )
    );
    setRegistrations((prev) =>
      prev.map((r) =>
        r.employeeId.trim().toUpperCase() === empUpper ? { ...r, isBlockedFromDraw: true } : r
      )
    );
    setRoster((prev) =>
      prev.map((emp) =>
        emp.id.trim().toUpperCase() === empUpper ? { ...emp, isBlockedFromDraw: true } : emp
      )
    );
    const nextConfig: PartyConfig = {
      ...config,
      isRegistrationOpen: false,
      isVipTriggerActive: true,
      vipActivePrizeId: prizeId,
      claimCountdownEndAt: '',
      claimCountdownWinnerId: '',
      claimCountdownPrizeId: '',
    };
    setConfig(nextConfig);

    try {
      await FirestoreService.forfeitWinnerAndBlock(record, roster, registrations, nextConfig);
    } catch (err) {
      console.warn('Forfeit & block sync warning:', err);
    }
  };

  const handleResetAllLuckyDraws = async () => {
    setLuckyWinners([]);
    setPrizes((prev) => prev.map((p) => ({ ...p, remaining: p.quantity })));
    setConfig((prev) => ({
      ...prev,
      claimCountdownEndAt: '',
      claimCountdownWinnerId: '',
      claimCountdownPrizeId: '',
    }));
    try {
      await FirestoreService.resetAllLuckyDraws(prizes);
    } catch (err) {
      console.warn('Reset lucky draws sync warning:', err);
    }
  };

  const handleClearRegistrations = async () => {
    setRegistrations([]);
    setLuckyWinners([]);
    setPrizes((prev) => prev.map((p) => ({ ...p, remaining: p.quantity })));
    setConfig((prev) => ({
      ...prev,
      claimCountdownEndAt: '',
      claimCountdownWinnerId: '',
      claimCountdownPrizeId: '',
    }));
    try {
      await FirestoreService.clearRegistrations(prizes);
    } catch (err) {
      console.warn('Clear registrations sync warning:', err);
    }
    setMyRegistration(null);
  };

  const handleStartNewParty = async (
    newConfig?: Partial<PartyConfig>,
    options?: { clearRoster?: boolean; clearPrizes?: boolean }
  ) => {
    setRegistrations([]);
    setLuckyWinners([]);
    if (options?.clearRoster) setRoster([]);
    if (options?.clearPrizes) {
      setPrizes([]);
    } else {
      setPrizes((prev) => prev.map((p) => ({ ...p, remaining: p.quantity })));
    }
    setConfig((prev) => ({
      ...prev,
      ...newConfig,
      isRegistrationOpen: true,
      isVipTriggerActive: false,
      claimCountdownEndAt: '',
      claimCountdownWinnerId: '',
      claimCountdownPrizeId: '',
    }));
    try {
      await FirestoreService.startNewParty(config, prizes, newConfig, options);
    } catch (err) {
      console.warn('Start new party sync warning:', err);
    }
    setMyRegistration(null);
  };

  // VIP EXECUTIVE TRIGGER FUNCTION (No Login Required)
  const handleTriggerFromVipPhone = async () => {
    if (!config.isVipTriggerActive || isVipDrawingRef.current) {
      return;
    }

    const getTrueRemaining = (p: Prize) => {
      const drawnCount = luckyWinners.filter((w) => w.prizeId === p.id).length;
      return Math.min(p.remaining, Math.max(0, p.quantity - drawnCount));
    };

    const targetPrize =
      prizes.find((p) => p.id === config.vipActivePrizeId && getTrueRemaining(p) > 0) ||
      prizes.find((p) => getTrueRemaining(p) > 0);

    if (!targetPrize || eligibleCandidates.length === 0) {
      return;
    }

    isVipDrawingRef.current = true;
    try {
      soundFX.playWinnerFanfare();
      confetti({
        particleCount: 160,
        spread: 100,
        origin: { y: 0.5 },
        colors: ['#ec4899', '#fbbf24', '#06b6d4', '#10b981', '#8b5cf6', '#f43f5e'],
      });

      const randomIndex = Math.floor(Math.random() * eligibleCandidates.length);
      const winnerAttendee = eligibleCandidates[randomIndex];

      // Final duplicate safety guard
      const alreadyWon = luckyWinners.some(
        (w) => w.employeeId.trim().toUpperCase() === winnerAttendee.employeeId.trim().toUpperCase()
      );
      if (alreadyWon) {
        return;
      }

      const winnerRecord: LuckyDrawRecord = {
        id: `WIN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        prizeId: targetPrize.id,
        prizeName: targetPrize.name,
        prizeTier: targetPrize.tier,
        employeeId: winnerAttendee.employeeId,
        winnerName: winnerAttendee.fullName,
        nickname: winnerAttendee.nickname,
        department: winnerAttendee.department,
        tableNumber: winnerAttendee.tableNumber,
        selfieUrl: winnerAttendee.selfieUrl,
        prizeImageUrl: targetPrize.imageUrl,
        wonAt: new Date().toISOString(),
        round: luckyWinners.length + 1,
      };

      await handleAddLuckyWinner(winnerRecord);
    } finally {
      setTimeout(() => {
        isVipDrawingRef.current = false;
      }, 1000);
    }
  };

  const handleAdminLoginSuccess = () => {
    setIsAdminLoggedIn(true);
    sessionStorage.setItem('admin_session_auth', 'true');
    setIsAdminLoginModalOpen(false);
    setCurrentView('admin');
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    sessionStorage.removeItem('admin_session_auth');
    setCurrentView(myRegistration ? 'ticket' : 'register');
  };

  const hideNavigationChrome = currentView === 'checkin' && isCheckinFullscreen;

  return (
    <div
      className={`min-h-[100dvh] w-full bg-gradient-to-br from-rose-50 via-amber-50/70 to-cyan-50 dark:bg-none dark:bg-[#0b041c] text-slate-900 dark:text-white flex flex-col relative selection:bg-fuchsia-500 selection:text-white overflow-x-hidden transition-colors ${
        hideNavigationChrome ? 'pb-0 pt-safe' : 'pb-16 md:pb-0'
      }`}
    >
      {/* Vibrant Multi-Color Ambient Party Accents */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-36 -left-24 w-[480px] h-[420px] bg-gradient-to-br from-fuchsia-400/25 via-rose-400/20 to-amber-300/20 dark:from-fuchsia-600/20 dark:via-purple-600/15 dark:to-transparent blur-3xl rounded-full" />
        <div className="absolute top-1/3 -right-24 w-[420px] h-[420px] bg-gradient-to-bl from-cyan-400/25 via-teal-300/15 to-emerald-300/20 dark:from-cyan-500/15 dark:via-indigo-500/10 dark:to-transparent blur-3xl rounded-full" />
        <div className="absolute -bottom-32 left-1/3 w-[520px] h-[340px] bg-gradient-to-tr from-amber-300/25 via-pink-300/20 to-violet-400/20 dark:from-amber-500/10 dark:via-fuchsia-600/10 dark:to-transparent blur-3xl rounded-full" />
      </div>

      {/* Top Bar Navigation (Hidden in Check-in Fullscreen Display Mode) */}
      {!hideNavigationChrome && (
        <Navbar
          currentView={currentView}
          onChangeView={setCurrentView}
          isAdminLoggedIn={isAdminLoggedIn}
          hasMyTicket={!!myRegistration}
          onOpenAdminLogin={() => setIsAdminLoginModalOpen(true)}
        />
      )}

      {/* Floating banner when admin is previewing attendee view */}
      {!hideNavigationChrome && isAdminLoggedIn && currentView !== 'admin' && currentView !== 'checkin' && (
        <div className="w-full bg-white/95 dark:bg-[#140a2b]/95 backdrop-blur-md border-b-2 border-fuchsia-300/70 dark:border-fuchsia-500/40 text-slate-900 dark:text-white py-2 px-4 shadow-sm dark:shadow-md sticky top-14 sm:top-16 z-30 flex items-center justify-between gap-2 text-xs transition-colors">
          <div className="font-bold bg-gradient-to-r from-fuchsia-600 to-cyan-600 dark:from-fuchsia-300 dark:to-cyan-300 bg-clip-text text-transparent truncate">
            {t(
              'โหมดทดสอบ: กำลังแสดงมุมมองของผู้ร่วมงาน',
              'Preview Mode: Viewing as Event Attendee'
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              soundFX.playClick();
              setCurrentView('admin');
            }}
            className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-fuchsia-600 via-rose-500 to-amber-500 text-white font-extrabold text-xs hover:from-fuchsia-500 hover:to-amber-400 shadow-md transition cursor-pointer whitespace-nowrap shrink-0"
          >
            {t('กลับสู่แอดมิน →', 'Back to Admin →')}
          </button>
        </div>
      )}

      {/* Main Viewport Content */}
      <main
        className={`flex-1 w-full mx-auto relative z-10 ${
          hideNavigationChrome
            ? 'max-w-7xl px-4 sm:px-8 py-4 sm:py-6 flex flex-col justify-center'
            : 'max-w-6xl px-3 sm:px-4 py-5 sm:py-10'
        }`}
      >
        {isInitialLoading ? (
          <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-slate-600 dark:text-purple-200">
            <Loader2 className="w-8 h-8 text-fuchsia-600 dark:text-cyan-400 animate-spin" />
            <p className="text-xs font-medium">
              {t('กำลังเชื่อมต่อฐานข้อมูล Firebase...', 'Connecting to Firebase database...')}
            </p>
          </div>
        ) : (
          <>
            {/* VIEW 1: REGISTRATION FORM */}
            {currentView === 'register' && (
              <RegistrationForm
                roster={roster}
                registrations={registrations}
                config={config}
                onRegisterSuccess={handleRegisterSuccess}
              />
            )}

            {/* VIEW 2: CELEBRATORY TICKET PASS & TABLE NUMBER */}
            {currentView === 'ticket' && (
              <>
                {myRegistration ? (
                  <TicketPass
                    registration={myRegistration}
                    config={config}
                    onRegisterAnother={() => setCurrentView('register')}
                  />
                ) : (
                  <div className="max-w-md mx-auto text-center p-8 rounded-3xl bg-white/95 dark:bg-[#140a2b]/95 border-2 border-fuchsia-300/70 dark:border-fuchsia-500/40 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-fuchsia-500 via-amber-400 to-cyan-400" />
                    <p className="text-sm text-slate-700 dark:text-purple-100 mb-4 font-semibold pt-1">
                      {t(
                        'คุณยังไม่ได้ลงทะเบียนเข้างาน กรุณาลงทะเบียนเพื่อรับบัตรและหมายเลขโต๊ะ',
                        'You have not checked in yet. Please register to get your digital pass and table number.'
                      )}
                    </p>
                    <button
                      type="button"
                      onClick={() => setCurrentView('register')}
                      className="min-h-[48px] px-6 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-600 via-rose-500 to-amber-500 hover:from-fuchsia-500 hover:to-amber-400 text-white font-extrabold text-xs shadow-lg shadow-fuchsia-500/25 cursor-pointer"
                    >
                      {t('ไปที่หน้าลงทะเบียน', 'Go to Check-in')}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* VIEW 3: LIVE DRAW ARENA FEED */}
            {currentView === 'livedraw' && (
              <LiveDrawFeed
                winners={luckyWinners}
                prizes={prizes}
                config={config}
                candidates={registrations}
                totalRosterCount={liveRosterCount}
                onBackToTicket={() => setCurrentView('ticket')}
                hasMyPass={!!myRegistration}
              />
            )}

            {/* VIEW 4: VIP EXECUTIVE REMOTE TRIGGER SCREEN */}
            {currentView === 'vip' && (
              <VipDrawScreen
                config={config}
                prizes={prizes}
                luckyWinners={luckyWinners}
                eligibleCount={eligibleCandidates.length}
                onTriggerLuckyDraw={handleTriggerFromVipPhone}
                onExitVipView={() => setCurrentView(myRegistration ? 'ticket' : 'register')}
              />
            )}

            {/* VIEW 4.5: ENTRANCE CHECK-IN DISPLAY (QR CODE + LOW-QUOTA REAL-TIME FEED) */}
            {currentView === 'checkin' && (
              <CheckinDisplayScreen
                config={config}
                isAdminLoggedIn={isAdminLoggedIn}
                isFullscreen={isCheckinFullscreen}
                onFullscreenChange={setIsCheckinFullscreen}
                onBackToAdmin={() => {
                  setIsCheckinFullscreen(false);
                  setCurrentView('admin');
                }}
              />
            )}

            {/* VIEW 5: ADMIN DASHBOARD */}
            {currentView === 'admin' && (
              <>
                {isAdminLoggedIn ? (
                  <AdminDashboard
                    roster={roster}
                    registrations={registrations}
                    prizes={prizes}
                    luckyWinners={luckyWinners}
                    config={config}
                    onUpdateConfig={handleUpdateConfig}
                    onUpdateRoster={handleUpdateRoster}
                    onUpdatePrizes={handleUpdatePrizes}
                    onAddLuckyWinner={handleAddLuckyWinner}
                    onDeleteLuckyWinner={handleDeleteLuckyWinner}
                    onForfeitAndBlockWinner={handleForfeitAndBlockWinner}
                    onResetAllLuckyDraws={handleResetAllLuckyDraws}
                    onClearRegistrations={handleClearRegistrations}
                    onStartNewParty={handleStartNewParty}
                    onLogout={handleAdminLogout}
                    onOpenVipView={() => setCurrentView('vip')}
                    onOpenLiveView={() => setCurrentView('livedraw')}
                    onOpenCheckinDisplay={() => setCurrentView('checkin')}
                    onSwitchToUserView={() => setCurrentView(myRegistration ? 'ticket' : 'register')}
                  />
                ) : (
                  <div className="max-w-sm mx-auto text-center p-8 rounded-3xl bg-white/95 dark:bg-[#140a2b]/95 border-2 border-fuchsia-300/70 dark:border-fuchsia-500/40 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-fuchsia-500 via-amber-400 to-cyan-400" />
                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-2 pt-1">
                      {t('ต้องเข้าสู่ระบบแอดมินก่อน', 'Admin Login Required')}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-purple-200/80 mb-4">
                      {t(
                        'กรุณากดรหัส PIN เพื่อเข้าใช้งานแดชบอร์ดแอดมิน',
                        'Please enter the Admin PIN to access the management dashboard.'
                      )}
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsAdminLoginModalOpen(true)}
                      className="min-h-[48px] px-6 py-2 rounded-xl bg-gradient-to-r from-fuchsia-600 via-rose-500 to-amber-500 hover:from-fuchsia-500 hover:to-amber-400 text-white font-extrabold text-xs shadow-lg shadow-fuchsia-500/25 cursor-pointer"
                    >
                      {t('เข้าสู่ระบบแอดมิน', 'Admin Login')}
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* Discreet bottom admin link - Not prominent, small text at screen bottom */}
      {!isAdminLoggedIn && !hideNavigationChrome && (
        <footer className="w-full py-3 mt-auto text-center z-10 pb-18 md:pb-6">
          <button
            type="button"
            onClick={() => {
              soundFX.playClick();
              setIsAdminLoginModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-purple-300/50 hover:text-fuchsia-600 dark:hover:text-cyan-300 font-medium transition cursor-pointer select-none py-1 px-3 rounded-lg hover:bg-white/60 dark:hover:bg-white/5"
            title={t('เข้าสู่ระบบสำหรับทีมงานผู้จัดงาน', 'Organizer Admin Login')}
          >
            <Lock className="w-2.5 h-2.5" />
            <span>{t('ระบบแอดมิน', 'Admin')}</span>
          </button>
        </footer>
      )}

      {/* Mobile Fixed Bottom Navigation */}
      {!hideNavigationChrome && (
        <MobileBottomNav
          currentView={currentView}
          onChangeView={setCurrentView}
          isAdminLoggedIn={isAdminLoggedIn}
          hasMyTicket={!!myRegistration}
          onOpenAdminLogin={() => setIsAdminLoginModalOpen(true)}
        />
      )}

      {/* Admin Login Modal (Numpad PIN: 236248) */}
      <AdminLoginModal
        isOpen={isAdminLoginModalOpen}
        onClose={() => setIsAdminLoginModalOpen(false)}
        onSuccess={handleAdminLoginSuccess}
      />
    </div>
  );
}
