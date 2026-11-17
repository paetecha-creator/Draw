/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { Lock, Loader2 } from 'lucide-react';
import {
  AttendeeRegistration,
  EmployeeRoster,
  LuckyDrawRecord,
  PartyConfig,
  Prize,
} from './types/party';
import { FirestoreService } from './services/firestoreService';
import { Navbar } from './components/Navbar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { RegistrationForm } from './components/RegistrationForm';
import { TicketPass } from './components/TicketPass';
import { LiveDrawFeed } from './components/LiveDrawFeed';
import { AdminDashboard } from './components/AdminDashboard';
import { VipDrawScreen } from './components/VipDrawScreen';
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

  // Navigation View State
  const [currentView, setCurrentView] = useState<'register' | 'ticket' | 'livedraw' | 'admin' | 'vip'>(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get('vip') === '1' || searchParams.get('vip') === 'true' || window.location.hash === '#vip') {
        return 'vip';
      }
    }
    return 'register';
  });

  const [myRegistration, setMyRegistration] = useState<AttendeeRegistration | null>(null);

  // Admin Auth State (Unlocked via Numpad PIN: 236248)
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    return sessionStorage.getItem('admin_session_auth') === 'true';
  });
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState(false);

  // Sync my personal pass when registrations update from Firestore
  useEffect(() => {
    const myId = FirestoreService.getMyRegistrationId();
    if (myId) {
      const match = registrations.find((r) => r.id === myId);
      setMyRegistration(match || null);
    } else {
      setMyRegistration(null);
    }
  }, [registrations]);

  // Subscribe to Firebase Firestore collections in real time & seed in background without blocking UI
  useEffect(() => {
    let isMounted = true;

    const unsubs = [
      FirestoreService.subscribeConfig((freshConfig) => {
        if (isMounted) setConfig(freshConfig);
      }),
      FirestoreService.subscribeRoster((freshRoster) => {
        if (isMounted) setRoster(freshRoster);
      }),
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

    return () => {
      isMounted = false;
      unsubs.forEach((unsub) => unsub());
    };
  }, []);

  // Compute eligible candidates for VIP draw trigger
  const eligibleCandidates = useMemo(() => {
    const wonEmployeeIds = new Set(luckyWinners.map((w) => w.employeeId.toUpperCase()));
    const blockedGroupSet = new Set(config.blockedGroups || []);

    return registrations.filter((att) => {
      const empId = att.employeeId.toUpperCase();
      if (config.autoBlockPreviousWinners && wonEmployeeIds.has(empId)) return false;
      if (att.groupRole && blockedGroupSet.has(att.groupRole)) return false;
      if (att.isBlockedFromDraw) return false;

      const rosterItem = roster.find((r) => r.id.toUpperCase() === empId);
      if (rosterItem?.isBlockedFromDraw) return false;
      if (rosterItem?.groupRole && blockedGroupSet.has(rosterItem.groupRole)) return false;

      return true;
    });
  }, [registrations, luckyWinners, config.blockedGroups, config.autoBlockPreviousWinners, roster]);

  // Handlers writing directly to Firestore with optimistic local state updates
  const handleRegisterSuccess = async (newReg: AttendeeRegistration) => {
    const saved = await FirestoreService.addRegistration(newReg);
    setRegistrations((prev) => [saved, ...prev.filter((r) => r.id !== saved.id)]);
    setMyRegistration(saved);
    setCurrentView('ticket');
  };

  const handleUpdateConfig = async (newConfig: PartyConfig) => {
    setConfig(newConfig);
    await FirestoreService.setConfig(newConfig);
  };

  const handleUpdateRoster = async (newRoster: EmployeeRoster[]) => {
    setRoster(newRoster);
    await FirestoreService.setRoster(newRoster);
  };

  const handleUpdatePrizes = async (newPrizes: Prize[]) => {
    setPrizes(newPrizes);
    await FirestoreService.setPrizes(newPrizes);
  };

  const handleAddLuckyWinner = async (newWinner: LuckyDrawRecord) => {
    setLuckyWinners((prev) => [newWinner, ...prev.filter((w) => w.id !== newWinner.id)]);
    setPrizes((prev) =>
      prev.map((p) =>
        p.id === newWinner.prizeId ? { ...p, remaining: Math.max(0, p.remaining - 1) } : p
      )
    );
    setConfig((prev) => ({ ...prev, isVipTriggerActive: false }));
    await FirestoreService.addLuckyWinner(newWinner, config);
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
      await FirestoreService.deleteLuckyWinner(target);
    }
  };

  const handleResetAllLuckyDraws = async () => {
    setLuckyWinners([]);
    setPrizes((prev) => prev.map((p) => ({ ...p, remaining: p.quantity })));
    await FirestoreService.resetAllLuckyDraws(prizes);
  };

  const handleClearRegistrations = async () => {
    setRegistrations([]);
    setLuckyWinners([]);
    setPrizes((prev) => prev.map((p) => ({ ...p, remaining: p.quantity })));
    await FirestoreService.clearRegistrations(prizes);
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
    }));
    await FirestoreService.startNewParty(config, prizes, newConfig, options);
    setMyRegistration(null);
  };

  // VIP EXECUTIVE TRIGGER FUNCTION (No Login Required)
  const handleTriggerFromVipPhone = async () => {
    if (!config.isVipTriggerActive) {
      return;
    }

    const targetPrize =
      prizes.find((p) => p.id === config.vipActivePrizeId && p.remaining > 0) ||
      prizes.find((p) => p.remaining > 0);

    if (!targetPrize || eligibleCandidates.length === 0) {
      return;
    }

    soundFX.playWinnerFanfare();
    confetti({
      particleCount: 150,
      spread: 90,
      origin: { y: 0.5 },
      colors: ['#fbbf24', '#f59e0b', '#34d399', '#818cf8', '#f472b6'],
    });

    const randomIndex = Math.floor(Math.random() * eligibleCandidates.length);
    const winnerAttendee = eligibleCandidates[randomIndex];

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

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col relative selection:bg-amber-400 selection:text-zinc-950 pb-16 md:pb-0 overflow-x-hidden transition-colors">
      {/* Subtle Ambient Background Accents */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[720px] h-[380px] bg-gradient-to-b from-amber-500/10 dark:from-amber-500/8 via-amber-400/5 dark:via-amber-400/3 to-transparent blur-3xl rounded-full" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500/8 dark:bg-indigo-500/5 blur-3xl rounded-full" />
      </div>

      {/* Top Bar Navigation */}
      <Navbar
        currentView={currentView}
        onChangeView={setCurrentView}
        isAdminLoggedIn={isAdminLoggedIn}
        hasMyTicket={!!myRegistration}
        onOpenAdminLogin={() => setIsAdminLoginModalOpen(true)}
      />

      {/* Floating banner when admin is previewing attendee view */}
      {isAdminLoggedIn && currentView !== 'admin' && (
        <div className="w-full bg-white dark:bg-zinc-900 border-b border-amber-500/30 dark:border-amber-400/30 text-zinc-900 dark:text-zinc-100 py-2 px-4 shadow-sm dark:shadow-md sticky top-14 sm:top-16 z-30 flex items-center justify-between gap-2 text-xs transition-colors">
          <div className="font-semibold text-amber-700 dark:text-amber-300 truncate">
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
            className="px-3 py-1.5 rounded-lg bg-amber-400 text-zinc-950 font-bold text-xs hover:bg-amber-300 transition cursor-pointer whitespace-nowrap shrink-0"
          >
            {t('กลับสู่แอดมิน →', 'Back to Admin →')}
          </button>
        </div>
      )}

      {/* Main Viewport Content */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-4 py-5 sm:py-10 relative z-10">
        {isInitialLoading ? (
          <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-zinc-500 dark:text-zinc-400">
            <Loader2 className="w-8 h-8 text-amber-500 dark:text-amber-400 animate-spin" />
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
                config={config}
                onRegisterSuccess={handleRegisterSuccess}
                onViewLiveDraw={() => setCurrentView('livedraw')}
              />
            )}

            {/* VIEW 2: CELEBRATORY TICKET PASS & TABLE NUMBER */}
            {currentView === 'ticket' && (
              <>
                {myRegistration ? (
                  <TicketPass
                    registration={myRegistration}
                    config={config}
                    onViewLiveDraw={() => setCurrentView('livedraw')}
                    onRegisterAnother={() => setCurrentView('register')}
                  />
                ) : (
                  <div className="max-w-md mx-auto text-center p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-lg dark:shadow-xl">
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-4 font-medium">
                      {t(
                        'คุณยังไม่ได้ลงทะเบียนเข้างาน กรุณาลงทะเบียนเพื่อรับบัตรและหมายเลขโต๊ะ',
                        'You have not checked in yet. Please register to get your digital pass and table number.'
                      )}
                    </p>
                    <button
                      type="button"
                      onClick={() => setCurrentView('register')}
                      className="min-h-[48px] px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs shadow-md cursor-pointer"
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
                onTriggerLuckyDraw={handleTriggerFromVipPhone}
                onExitVipView={() => setCurrentView(myRegistration ? 'ticket' : 'register')}
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
                    onResetAllLuckyDraws={handleResetAllLuckyDraws}
                    onClearRegistrations={handleClearRegistrations}
                    onStartNewParty={handleStartNewParty}
                    onLogout={handleAdminLogout}
                    onOpenVipView={() => setCurrentView('vip')}
                    onSwitchToUserView={() => setCurrentView(myRegistration ? 'ticket' : 'register')}
                  />
                ) : (
                  <div className="max-w-sm mx-auto text-center p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-lg dark:shadow-xl">
                    <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                      {t('ต้องเข้าสู่ระบบแอดมินก่อน', 'Admin Login Required')}
                    </h3>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-4">
                      {t(
                        'กรุณากดรหัส PIN เพื่อเข้าใช้งานแดชบอร์ดแอดมิน',
                        'Please enter the Admin PIN to access the management dashboard.'
                      )}
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsAdminLoginModalOpen(true)}
                      className="min-h-[48px] px-6 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs shadow-md cursor-pointer"
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
      {!isAdminLoggedIn && (
        <footer className="w-full py-3 mt-auto text-center z-10 pb-18 md:pb-6">
          <button
            type="button"
            onClick={() => {
              soundFX.playClick();
              setIsAdminLoginModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-600 hover:text-zinc-700 dark:hover:text-zinc-400 font-medium transition cursor-pointer select-none py-1 px-3 rounded-lg hover:bg-zinc-200/60 dark:hover:bg-zinc-900"
            title={t('เข้าสู่ระบบสำหรับทีมงานผู้จัดงาน', 'Organizer Admin Login')}
          >
            <Lock className="w-2.5 h-2.5" />
            <span>{t('ระบบแอดมิน', 'Admin')}</span>
          </button>
        </footer>
      )}

      {/* Mobile Fixed Bottom Navigation */}
      <MobileBottomNav
        currentView={currentView}
        onChangeView={setCurrentView}
        isAdminLoggedIn={isAdminLoggedIn}
        hasMyTicket={!!myRegistration}
        onOpenAdminLogin={() => setIsAdminLoginModalOpen(true)}
      />

      {/* Admin Login Modal (Numpad PIN: 236248) */}
      <AdminLoginModal
        isOpen={isAdminLoginModalOpen}
        onClose={() => setIsAdminLoginModalOpen(false)}
        onSuccess={handleAdminLoginSuccess}
      />
    </div>
  );
}
