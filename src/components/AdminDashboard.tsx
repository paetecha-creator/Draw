import React, { useState, useMemo, useRef, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Users,
  Trophy,
  FileSpreadsheet,
  Download,
  Upload,
  Search,
  CheckCircle2,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  ShieldAlert,
  Trash2,
  RotateCcw,
  Plus,
  Volume2,
  VolumeX,
  LogOut,
  Layers,
  Filter,
  Flame,
  Award,
  AlertTriangle,
  Crown,
  Copy,
  ExternalLink,
  Edit,
  Gift,
  Lock,
  Unlock,
  Settings,
  Sliders,
  Calendar,
  MapPin,
  Save,
  Eye,
  Radio,
  Timer,
  Play,
  Square,
  RotateCw,
  Ban,
} from 'lucide-react';
import {
  AttendeeRegistration,
  EmployeeRoster,
  LuckyDrawRecord,
  PartyConfig,
  Prize,
} from '../types/party';
import {
  downloadSampleExcelTemplate,
  exportAttendeesToExcel,
  exportLuckyDrawReportToExcel,
  parseEmployeeExcel,
} from '../utils/excel';
import { soundFX } from '../utils/audio';
import { PrizeManagerModal } from './PrizeManagerModal';
import { NumpadPinModal } from './NumpadPinModal';
import { PartyDialogModal, PartyDialogState, PartyDialogVariant } from './PartyDialogModal';
import { usePreferences } from '../contexts/PreferencesContext';

interface AdminDashboardProps {
  roster: EmployeeRoster[];
  registrations: AttendeeRegistration[];
  prizes: Prize[];
  luckyWinners: LuckyDrawRecord[];
  config: PartyConfig;
  onUpdateConfig: (config: PartyConfig) => void;
  onUpdateRoster: (roster: EmployeeRoster[]) => void;
  onUpdatePrizes: (prizes: Prize[]) => void;
  onAddLuckyWinner: (winner: LuckyDrawRecord) => void;
  onDeleteLuckyWinner: (recordId: string) => void;
  onForfeitAndBlockWinner?: (record: LuckyDrawRecord) => Promise<void> | void;
  onResetAllLuckyDraws: () => void;
  onClearRegistrations?: () => void;
  onStartNewParty?: (newConfig?: Partial<PartyConfig>, options?: { clearRoster?: boolean; clearPrizes?: boolean }) => void;
  onLogout: () => void;
  onOpenVipView?: () => void;
  onOpenLiveView?: () => void;
  onSwitchToUserView?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  roster,
  registrations,
  prizes,
  luckyWinners,
  config,
  onUpdateConfig,
  onUpdateRoster,
  onUpdatePrizes,
  onAddLuckyWinner,
  onDeleteLuckyWinner,
  onForfeitAndBlockWinner,
  onResetAllLuckyDraws,
  onClearRegistrations,
  onStartNewParty,
  onLogout,
  onOpenVipView,
  onOpenLiveView,
  onSwitchToUserView,
}) => {
  const { lang, t } = usePreferences();
  // Navigation tabs inside admin
  const [activeTab, setActiveTab] = useState<'overview' | 'roster' | 'prizes' | 'luckydraw' | 'history' | 'settings'>('luckydraw');

  // Search & Filter state for attendees
  const [attendeeSearch, setAttendeeSearch] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('ALL');

  // Lucky Draw State
  const [selectedPrizeId, setSelectedPrizeId] = useState<string>(
    config.vipActivePrizeId || prizes[0]?.id || ''
  );
  const [isDrawing, setIsDrawing] = useState(false);
  const isDrawingRef = useRef(false);
  const prevWinnerIdRef = useRef<string | null>(luckyWinners[0]?.id ?? null);
  const selfDrawnWinnerIdRef = useRef<string | null>(null);
  const [drawShufflingCandidate, setDrawShufflingCandidate] = useState<AttendeeRegistration | null>(null);
  const [latestWinnerModal, setLatestWinnerModal] = useState<LuckyDrawRecord | null>(null);

  // 60-Second Claim Countdown & Timeout Re-Draw Confirmation State
  const [claimSecondsLeft, setClaimSecondsLeft] = useState<number | null>(null);
  const [expiredWinnerPrompt, setExpiredWinnerPrompt] = useState<LuckyDrawRecord | null>(null);
  const shownTimeoutForWinnerRef = useRef<string | null>(null);

  const [soundMuted, setSoundMuted] = useState(soundFX.getMuted());
  const [dialog, setDialog] = useState<PartyDialogState>({
    isOpen: false,
    mode: 'alert',
    variant: 'warning',
    title: '',
    message: '',
  });

  const showAlertDialog = (opts: {
    variant?: PartyDialogVariant;
    title: string;
    message: string;
    confirmText?: string;
  }) => {
    setDialog({
      isOpen: true,
      mode: 'alert',
      variant: opts.variant || 'warning',
      title: opts.title,
      message: opts.message,
      confirmText: opts.confirmText,
    });
  };

  const showConfirmDialog = (opts: {
    variant?: PartyDialogVariant;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
  }) => {
    setDialog({
      isOpen: true,
      mode: 'confirm',
      variant: opts.variant || 'danger',
      title: opts.title,
      message: opts.message,
      confirmText: opts.confirmText,
      cancelText: opts.cancelText,
      onConfirmAction: opts.onConfirm,
    });
  };
  const [excelImportLoading, setExcelImportLoading] = useState(false);
  const [excelImportMessage, setExcelImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copyLinkNotice, setCopyLinkNotice] = useState(false);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  // Prize Modal Management state
  const [isPrizeModalOpen, setIsPrizeModalOpen] = useState(false);
  const [editingPrize, setEditingPrize] = useState<Prize | null>(null);

  // Hidden Fair-Chance Blocking Panel state (Unlocked via Numpad PIN: 25102612)
  const [isFairChanceUnlocked, setIsFairChanceUnlocked] = useState(false);
  const [isFairChancePinModalOpen, setIsFairChancePinModalOpen] = useState(false);

  // Editable Event Name state
  const [isEditingEventName, setIsEditingEventName] = useState(false);
  const [tempEventName, setTempEventName] = useState(config.eventName);

  // Event Settings Form State
  const [settingsName, setSettingsName] = useState(config.eventName);
  const [settingsSubtitle, setSettingsSubtitle] = useState(config.eventSubtitle || '');
  const [settingsDate, setSettingsDate] = useState(config.eventDate);
  const [settingsVenue, setSettingsVenue] = useState(config.eventVenue);
  const [settingsContact, setSettingsContact] = useState(config.eventContact || '');
  const [settingsTicketTitle, setSettingsTicketTitle] = useState(config.ticketTitle || 'OFFICIAL PARTY PASS & TABLE PASS');
  const [settingsRegSubtitle, setSettingsRegSubtitle] = useState(
    config.registrationSubtitle || 'กรอกรหัสพนักงาน เบอร์โทรศัพท์ และอัปโหลดรูปภาพจากเครื่องเพื่อใช้แสดงผลรางวัล'
  );
  const [settingsSavedNotice, setSettingsSavedNotice] = useState<string | null>(null);

  // Start New Party Modal State
  const [isNewPartyModalOpen, setIsNewPartyModalOpen] = useState(false);
  const [newPartyName, setNewPartyName] = useState('');
  const [newPartyClearRoster, setNewPartyClearRoster] = useState(false);
  const [newPartyClearPrizes, setNewPartyClearPrizes] = useState(false);

  React.useEffect(() => {
    setSettingsName(config.eventName);
    setSettingsSubtitle(config.eventSubtitle || '');
    setSettingsDate(config.eventDate);
    setSettingsVenue(config.eventVenue);
    setSettingsContact(config.eventContact || '');
    setSettingsTicketTitle(config.ticketTitle || 'OFFICIAL PARTY PASS & TABLE PASS');
    setSettingsRegSubtitle(
      config.registrationSubtitle || 'กรอกรหัสพนักงาน เบอร์โทรศัพท์ และอัปโหลดรูปภาพจากเครื่องเพื่อใช้แสดงผลรางวัล'
    );
  }, [config]);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    soundFX.playCelebrationChime();
    onUpdateConfig({
      ...config,
      eventName: settingsName.trim() || t('งานเลี้ยงสังสรรค์ (Party Celebration)', 'Party Celebration Event'),
      eventSubtitle: settingsSubtitle.trim(),
      eventDate: settingsDate.trim(),
      eventVenue: settingsVenue.trim(),
      eventContact: settingsContact.trim(),
      ticketTitle: settingsTicketTitle.trim() || 'OFFICIAL PARTY PASS & TABLE PASS',
      registrationSubtitle:
        settingsRegSubtitle.trim() || 'กรอกรหัสพนักงาน เบอร์โทรศัพท์ และอัปโหลดรูปภาพจากเครื่องเพื่อใช้แสดงผลรางวัล',
    });
    setSettingsSavedNotice(
      t(
        'บันทึกรายละเอียดงานเลี้ยงสำเร็จแล้ว ข้อมูลจะอัปเดตทุกหน้าจอทันที',
        'Event settings saved. All screens have been updated in real time.'
      )
    );
    setTimeout(() => setSettingsSavedNotice(null), 4000);
  };

  const handleApplyPreset = (preset: {
    name: string;
    subtitle: string;
    venue: string;
    ticketTitle: string;
    regSubtitle: string;
  }) => {
    soundFX.playClick();
    setSettingsName(preset.name);
    setSettingsSubtitle(preset.subtitle);
    setSettingsVenue(preset.venue);
    setSettingsTicketTitle(preset.ticketTitle);
    setSettingsRegSubtitle(preset.regSubtitle);
  };

  const handleConfirmClearRegistrations = () => {
    soundFX.playClick();
    showConfirmDialog({
      variant: 'danger',
      title: t('ยืนยันการล้างข้อมูลลงทะเบียน', 'Clear All Registrations?'),
      message: t(
        'คุณแน่ใจหรือไม่ว่าต้องการล้างข้อมูลผู้ลงทะเบียนและประวัติการสุ่มรางวัลทั้งหมดสำหรับงานนี้?\n(รายชื่อพนักงานใน Excel และของรางวัลจะยังคงอยู่)',
        'Are you sure you want to clear all check-ins and Lucky Draw history for this event?\n(Employee Excel roster and prizes will be preserved)'
      ),
      confirmText: t('ล้างข้อมูลลงทะเบียน', 'Clear Registrations'),
      onConfirm: () => {
        if (onClearRegistrations) {
          onClearRegistrations();
        }
        setSettingsSavedNotice(
          t(
            'ล้างข้อมูลผู้ลงทะเบียนและประวัติ Lucky Draw เรียบร้อยแล้ว',
            'Registrations and Lucky Draw history have been cleared.'
          )
        );
        setTimeout(() => setSettingsSavedNotice(null), 4000);
      },
    });
  };

  const handleConfirmNewParty = () => {
    soundFX.playCelebrationChime();
    if (onStartNewParty) {
      onStartNewParty(
        {
          eventName: newPartyName.trim() || settingsName.trim() || 'Party Celebration',
          eventSubtitle: settingsSubtitle.trim(),
          eventDate: settingsDate.trim(),
          eventVenue: settingsVenue.trim(),
          eventContact: settingsContact.trim(),
          ticketTitle: settingsTicketTitle.trim() || 'OFFICIAL PARTY PASS & TABLE PASS',
          registrationSubtitle:
            settingsRegSubtitle.trim() || 'กรอกรหัสพนักงาน เบอร์โทรศัพท์ และอัปโหลดรูปภาพจากเครื่องเพื่อใช้แสดงผลรางวัล',
          isRegistrationOpen: true,
          isVipTriggerActive: false,
        },
        {
          clearRoster: newPartyClearRoster,
          clearPrizes: newPartyClearPrizes,
        }
      );
    }
    setIsNewPartyModalOpen(false);
    setSettingsSavedNotice(
      t(
        'เริ่มต้นงานเลี้ยงใหม่เรียบร้อยแล้ว ระบบเปิดรับลงทะเบียนใหม่พร้อมใช้งาน',
        'New event started! Registration is now open and ready.'
      )
    );
    setTimeout(() => setSettingsSavedNotice(null), 4000);
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleToggleSound = () => {
    const next = !soundMuted;
    setSoundMuted(next);
    soundFX.setMuted(next);
  };

  const handleToggleRegistration = () => {
    soundFX.playClick();
    const nextRegOpen = !config.isRegistrationOpen;
    onUpdateConfig({
      ...config,
      isRegistrationOpen: nextRegOpen,
      isVipTriggerActive: nextRegOpen ? false : config.isVipTriggerActive,
    });
  };

  const allDepartments = useMemo(() => {
    const set = new Set<string>();
    roster.forEach((r) => set.add(r.department));
    registrations.forEach((r) => set.add(r.department));
    return Array.from(set).filter(Boolean);
  }, [roster, registrations]);

  const allGroups = useMemo(() => {
    const set = new Set<string>();
    roster.forEach((r) => {
      if (r.groupRole) set.add(r.groupRole);
    });
    set.add('ผู้บริหาร/กรรมการ');
    set.add('ทีมงานจัดเลี้ยง');
    set.add('พนักงานทั่วไป');
    return Array.from(set).filter(Boolean);
  }, [roster]);

  const handleToggleBlockedGroup = (groupName: string) => {
    soundFX.playClick();
    const current = config.blockedGroups || [];
    const updated = current.includes(groupName)
      ? current.filter((g) => g !== groupName)
      : [...current, groupName];

    onUpdateConfig({
      ...config,
      blockedGroups: updated,
    });
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelImportLoading(true);
    setExcelImportMessage(null);

    try {
      const buffer = await file.arrayBuffer();
      const newRoster = parseEmployeeExcel(buffer);

      if (newRoster.length === 0) {
        throw new Error(t('ไม่พบข้อมูลพนักงานที่ถูกต้องในไฟล์', 'No valid employee rows found in the file'));
      }

      const blockedIds = new Set(
        roster.filter((r) => r.isBlockedFromDraw).map((r) => r.id.trim().toUpperCase())
      );
      const mergedRoster = newRoster.map((emp) => ({
        ...emp,
        isBlockedFromDraw: emp.isBlockedFromDraw || blockedIds.has(emp.id.trim().toUpperCase()),
      }));

      onUpdateRoster(mergedRoster);
      soundFX.playCelebrationChime();
      setExcelImportMessage({
        type: 'success',
        text: t(
          `นำเข้าข้อมูลพนักงานสำเร็จจำนวน ${newRoster.length} รายการเรียบร้อยแล้ว`,
          `Successfully imported ${newRoster.length} employee records`
        ),
      });
    } catch (err: unknown) {
      console.error(err);
      setExcelImportMessage({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : t('เกิดข้อผิดพลาดในการอ่านไฟล์ Excel', 'Error reading the Excel file'),
      });
    } finally {
      setExcelImportLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const filteredAttendees = useMemo(() => {
    return registrations.filter((att) => {
      const q = attendeeSearch.toLowerCase();
      const matchesSearch =
        att.fullName.toLowerCase().includes(q) ||
        att.employeeId.toLowerCase().includes(q) ||
        (att.phone && att.phone.toLowerCase().includes(q)) ||
        (att.nickname && att.nickname.toLowerCase().includes(q)) ||
        att.tableNumber.toLowerCase().includes(q);

      const matchesDept = selectedDeptFilter === 'ALL' || att.department === selectedDeptFilter;
      return matchesSearch && matchesDept;
    });
  }, [registrations, attendeeSearch, selectedDeptFilter]);

  const wonEmployeeIds = useMemo(() => {
    return new Set(luckyWinners.map((w) => w.employeeId.trim().toUpperCase()));
  }, [luckyWinners]);

  const blockedGroupSet = useMemo(() => {
    return new Set(config.blockedGroups || []);
  }, [config.blockedGroups]);

  // Always exclude previous winners and blocked/disqualified attendees
  const eligibleCandidates = useMemo(() => {
    return registrations.filter((att) => {
      const empId = att.employeeId.trim().toUpperCase();

      if (wonEmployeeIds.has(empId)) {
        return false;
      }
      if (att.groupRole && blockedGroupSet.has(att.groupRole)) {
        return false;
      }
      if (att.isBlockedFromDraw) {
        return false;
      }

      const rosterItem = roster.find((r) => r.id.trim().toUpperCase() === empId);
      if (rosterItem?.isBlockedFromDraw) {
        return false;
      }
      if (rosterItem?.groupRole && blockedGroupSet.has(rosterItem.groupRole)) {
        return false;
      }

      return true;
    });
  }, [registrations, wonEmployeeIds, blockedGroupSet, roster]);

  // Real-time 60-second claim countdown watcher + auto-popup when time expires
  useEffect(() => {
    const endAtStr = config.claimCountdownEndAt?.trim();
    if (!endAtStr) {
      setClaimSecondsLeft(null);
      shownTimeoutForWinnerRef.current = null;
      return;
    }

    const endMs = Date.parse(endAtStr);
    if (!Number.isFinite(endMs)) {
      setClaimSecondsLeft(null);
      return;
    }

    const tick = () => {
      const diffMs = endMs - Date.now();
      const secs = Math.max(0, Math.ceil(diffMs / 1000));
      setClaimSecondsLeft(secs);

      if (secs === 0) {
        const targetWinnerId = config.claimCountdownWinnerId;
        const targetWinner =
          luckyWinners.find((w) => w.id === targetWinnerId) || luckyWinners[0] || null;
        if (targetWinner && shownTimeoutForWinnerRef.current !== targetWinner.id) {
          shownTimeoutForWinnerRef.current = targetWinner.id;
          soundFX.playCountdownTick(true);
          setExpiredWinnerPrompt(targetWinner);
        }
      }
    };

    tick();
    const interval = setInterval(tick, 250);
    return () => clearInterval(interval);
  }, [config.claimCountdownEndAt, config.claimCountdownWinnerId, luckyWinners]);

  // Real-time sync: keep selectedPrizeId aligned with config.vipActivePrizeId or next available prize
  useEffect(() => {
    if (config.vipActivePrizeId && prizes.some((p) => p.id === config.vipActivePrizeId)) {
      setSelectedPrizeId(config.vipActivePrizeId);
    } else if (prizes.length > 0 && !prizes.some((p) => p.id === selectedPrizeId)) {
      const nextAvail = prizes.find((p) => p.remaining > 0) || prizes[0];
      if (nextAvail) setSelectedPrizeId(nextAvail.id);
    }
  }, [config.vipActivePrizeId, prizes, selectedPrizeId]);

  // Real-time sync: auto-celebrate and display winner modal when triggered remotely (e.g. Executive VIP button)
  useEffect(() => {
    const newest = luckyWinners[0];
    if (!newest) {
      prevWinnerIdRef.current = null;
      return;
    }

    const isNewArrival = prevWinnerIdRef.current !== newest.id;
    prevWinnerIdRef.current = newest.id;

    if (!isNewArrival) return;
    if (selfDrawnWinnerIdRef.current === newest.id) {
      selfDrawnWinnerIdRef.current = null;
      return;
    }

    if (!isDrawing) {
      setLatestWinnerModal(newest);
      soundFX.playWinnerFanfare();
      confetti({
        particleCount: 160,
        spread: 100,
        origin: { y: 0.5 },
        colors: ['#ec4899', '#fbbf24', '#06b6d4', '#10b981', '#8b5cf6', '#f43f5e'],
      });
    }
  }, [luckyWinners, isDrawing]);

  const currentPrize = useMemo(() => {
    return (
      prizes.find((p) => p.id === selectedPrizeId) ||
      prizes.find((p) => p.remaining > 0) ||
      prizes[0]
    );
  }, [prizes, selectedPrizeId]);

  const handleSavePrize = (savedPrize: Prize) => {
    const existingIndex = prizes.findIndex((p) => p.id === savedPrize.id);
    let updated: Prize[];
    if (existingIndex >= 0) {
      updated = [...prizes];
      updated[existingIndex] = savedPrize;
    } else {
      updated = [...prizes, savedPrize];
    }
    onUpdatePrizes(updated);
  };

  const handleDeletePrize = (prizeId: string) => {
    const updated = prizes.filter((p) => p.id !== prizeId);
    onUpdatePrizes(updated);
    if (selectedPrizeId === prizeId && updated.length > 0) {
      setSelectedPrizeId(updated[0].id);
    }
  };

  const getVipShareUrl = () => {
    const base = window.location.origin + window.location.pathname;
    return `${base}?vip=1`;
  };

  const handleCopyVipLink = () => {
    const url = getVipShareUrl();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
    }
    soundFX.playClick();
    setCopyLinkNotice(true);
    setTimeout(() => setCopyLinkNotice(false), 3000);
  };

  const getTrueRemaining = (prize: Prize | undefined | null): number => {
    if (!prize) return 0;
    const drawnCount = luckyWinners.filter((w) => w.prizeId === prize.id).length;
    return Math.min(prize.remaining, Math.max(0, prize.quantity - drawnCount));
  };

  const handleToggleVipTrigger = () => {
    soundFX.playClick();
    const nextState = !config.isVipTriggerActive;

    if (nextState) {
      if (config.isRegistrationOpen) {
        showAlertDialog({
          variant: 'warning',
          title: t('กรุณาปิดรับลงทะเบียนก่อนเปิดสิทธิ์ผู้บริหาร', 'Close Registration First'),
          message: t(
            'ระบบกำลังเปิดรับลงทะเบียนเข้างานอยู่ จึงยังไม่สามารถเปิดสิทธิ์ปุ่มผู้บริหาร (LUCKY DRAW) ได้\n\nกรุณากดปุ่ม "สถานะ: เปิดลงทะเบียน" ด้านบนขวาให้เป็น "ปิดระบบแล้ว" ก่อนเริ่มเปิดสิทธิ์สุ่มรางวัล',
            'Registration is currently open. Please close check-in registration using the status toggle at the top before unlocking the Executive Lucky Draw button.'
          ),
        });
        return;
      }

      if (eligibleCandidates.length === 0) {
        showAlertDialog({
          variant: 'warning',
          title: t('ยังไม่มีผู้มีสิทธิ์ลุ้นรางวัล', 'No Eligible Candidates'),
          message: t(
            'ยังไม่มีผู้ร่วมงานที่มีสิทธิ์ลุ้นรางวัล (ต้องมีผู้ลงทะเบียนเข้างานแล้วและไม่ติดสถานะบล็อค)',
            'No eligible checked-in candidates available yet (guests must be checked in and unblocked).'
          ),
        });
        return;
      }

      const targetPrize =
        (currentPrize && getTrueRemaining(currentPrize) > 0 ? currentPrize : null) ||
        prizes.find((p) => getTrueRemaining(p) > 0);

      if (!targetPrize) {
        showAlertDialog({
          variant: 'warning',
          title: t('แจกของรางวัลครบทั้งหมดแล้ว', 'All Prizes Claimed'),
          message: t(
            'ของรางวัลทั้งหมดถูกแจกครบแล้ว กรุณาเพิ่มของรางวัลก่อนเปิดสิทธิ์ผู้บริหาร',
            'All prizes have been claimed. Please add prizes before unlocking VIP.'
          ),
        });
        return;
      }

      setSelectedPrizeId(targetPrize.id);
      onUpdateConfig({
        ...config,
        isVipTriggerActive: true,
        vipActivePrizeId: targetPrize.id,
        claimCountdownEndAt: '',
        claimCountdownWinnerId: '',
        claimCountdownPrizeId: '',
      });
      return;
    }

    onUpdateConfig({
      ...config,
      isVipTriggerActive: false,
      vipActivePrizeId: selectedPrizeId,
    });
  };

  const handleStartClaimCountdown = (winnerRecord: LuckyDrawRecord) => {
    soundFX.playClick();
    shownTimeoutForWinnerRef.current = null;
    setExpiredWinnerPrompt(null);
    onUpdateConfig({
      ...config,
      claimCountdownEndAt: new Date(Date.now() + 60000).toISOString(),
      claimCountdownWinnerId: winnerRecord.id,
      claimCountdownPrizeId: winnerRecord.prizeId,
    });
  };

  const handleStopClaimCountdown = () => {
    soundFX.playClick();
    shownTimeoutForWinnerRef.current = null;
    setClaimSecondsLeft(null);
    setExpiredWinnerPrompt(null);
    onUpdateConfig({
      ...config,
      claimCountdownEndAt: '',
      claimCountdownWinnerId: '',
      claimCountdownPrizeId: '',
    });
  };

  const executeDraw = (
    targetPrize: Prize,
    options?: {
      overrideCandidates?: AttendeeRegistration[];
      ignoreStockCheck?: boolean;
    }
  ) => {
    if (isDrawingRef.current) return;

    if (!targetPrize) {
      showAlertDialog({
        variant: 'warning',
        title: t('ยังไม่ได้เลือกของรางวัล', 'No Prize Selected'),
        message: t('กรุณาเลือกรางวัลที่จะทำการสุ่มจับก่อน', 'Please select a prize to draw first.'),
      });
      return;
    }

    if (!options?.ignoreStockCheck && getTrueRemaining(targetPrize) <= 0) {
      showAlertDialog({
        variant: 'warning',
        title: t('ของรางวัลหมดแล้ว', 'Prize Out of Stock'),
        message: t(
          `รางวัล "${targetPrize.name}" ถูกแจกครบตามจำนวนแล้ว ไม่สามารถจับเกินจำนวนได้`,
          `Prize "${targetPrize.name}" has no remaining stock.`
        ),
      });
      return;
    }

    const candidatePool = (options?.overrideCandidates || eligibleCandidates).filter((att) => {
      if (options?.overrideCandidates) return !att.isBlockedFromDraw;
      return !wonEmployeeIds.has(att.employeeId.trim().toUpperCase()) && !att.isBlockedFromDraw;
    });

    if (candidatePool.length === 0) {
      showAlertDialog({
        variant: 'warning',
        title: t('ไม่มีผู้มีสิทธิ์ลุ้นรางวัล', 'No Eligible Candidates'),
        message: t(
          'ไม่มีผู้มีสิทธิ์ลุ้นรางวัลที่ตรงตามเงื่อนไข (อาจแจกครบทุกคนแล้ว หรือถูกตัดสิทธิ์/บล็อคทั้งหมด)',
          'No eligible candidates remain (everyone may have won or is blocked).'
        ),
      });
      return;
    }

    isDrawingRef.current = true;
    setIsDrawing(true);
    setLatestWinnerModal(null);
    setExpiredWinnerPrompt(null);
    shownTimeoutForWinnerRef.current = null;

    // Clear any lingering countdown before drawing next winner
    if (config.claimCountdownEndAt) {
      onUpdateConfig({
        ...config,
        vipActivePrizeId: targetPrize.id,
        claimCountdownEndAt: '',
        claimCountdownWinnerId: '',
        claimCountdownPrizeId: '',
      });
    }

    const stopDrumroll = soundFX.startDrumroll();

    let shuffleCount = 0;
    const maxShuffles = 35;
    const shuffleInterval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * candidatePool.length);
      setDrawShufflingCandidate(candidatePool[randomIndex]);
      shuffleCount++;

      if (shuffleCount >= maxShuffles) {
        clearInterval(shuffleInterval);
        stopDrumroll();

        const finalWinnerIndex = Math.floor(Math.random() * candidatePool.length);
        const winnerAttendee = candidatePool[finalWinnerIndex];

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

        selfDrawnWinnerIdRef.current = winnerRecord.id;
        onAddLuckyWinner(winnerRecord);
        isDrawingRef.current = false;
        setIsDrawing(false);
        setLatestWinnerModal(winnerRecord);

        soundFX.playWinnerFanfare();
        confetti({
          particleCount: 160,
          spread: 100,
          origin: { y: 0.5 },
          colors: ['#ec4899', '#fbbf24', '#06b6d4', '#10b981', '#8b5cf6', '#f43f5e'],
        });
      }
    }, 70);
  };

  const handleConfirmForfeitAndRedraw = async (
    winnerRecord: LuckyDrawRecord
  ) => {
    soundFX.playClick();
    setExpiredWinnerPrompt(null);
    setLatestWinnerModal(null);
    shownTimeoutForWinnerRef.current = null;
    setClaimSecondsLeft(null);

    if (onForfeitAndBlockWinner) {
      await onForfeitAndBlockWinner(winnerRecord);
    } else {
      onDeleteLuckyWinner(winnerRecord.id);
      onUpdateConfig({
        ...config,
        isRegistrationOpen: false,
        isVipTriggerActive: true,
        vipActivePrizeId: winnerRecord.prizeId,
        claimCountdownEndAt: '',
        claimCountdownWinnerId: '',
        claimCountdownPrizeId: '',
      });
    }

    const forfeitedEmpUpper = winnerRecord.employeeId.trim().toUpperCase();
    const targetPrize =
      prizes.find((p) => p.id === winnerRecord.prizeId) || currentPrize;

    if (targetPrize) {
      setSelectedPrizeId(targetPrize.id);
    }

    const nextEligibleCount = eligibleCandidates.filter(
      (att) => att.employeeId.trim().toUpperCase() !== forfeitedEmpUpper
    ).length;

    if (nextEligibleCount === 0) {
      showAlertDialog({
        variant: 'warning',
        title: t('ไม่มีผู้มีสิทธิ์คงเหลือสำหรับจับใหม่', 'No Eligible Candidates Left'),
        message: t(
          'ตัดสิทธิ์ผู้ไม่มารับรางวัลแล้ว แต่ไม่มีผู้มีสิทธิ์ลุ้นรางวัลคงเหลือสำหรับจับใหม่',
          'Winner disqualified & prize returned, but no eligible candidates remain for re-draw.'
        ),
      });
      return;
    }

    soundFX.playCelebrationChime();
    showAlertDialog({
      variant: 'success',
      title: t('เปิดสิทธิ์ผู้บริหารสำหรับจับรางวัลใหม่แล้ว', 'VIP Button Unlocked for Re-Draw'),
      message: t(
        `ตัดสิทธิ์ "${winnerRecord.winnerName}" (${winnerRecord.employeeId}) และคืนสิทธิ์รางวัล "${targetPrize?.name || winnerRecord.prizeName}" เรียบร้อยแล้ว\n\nระบบได้เปิดสิทธิ์ปุ่ม LUCKY DRAW บนหน้าจอผู้บริหารแล้ว กรุณาให้ผู้บริหารกดปุ่มจับรางวัลใหม่ได้เลย`,
        `"${winnerRecord.winnerName}" (${winnerRecord.employeeId}) has been disqualified and "${targetPrize?.name || winnerRecord.prizeName}" stock restored.\n\nThe Executive VIP LUCKY DRAW button is now unlocked for the replacement draw.`
      ),
    });
  };

  const handleStartLuckyDraw = () => {
    executeDraw(currentPrize);
  };

  return (
    <div className="w-full max-w-6xl mx-auto pb-16">
      {/* Top Admin Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 bg-white/95 dark:bg-[#140a2b]/95 border-2 border-fuchsia-300/70 dark:border-fuchsia-500/40 rounded-3xl p-5 sm:p-6 shadow-xl shadow-fuchsia-500/10 relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-fuchsia-500 via-amber-400 to-cyan-400" />
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-purple-300 pt-1">
            <span className="font-extrabold bg-gradient-to-r from-fuchsia-600 to-cyan-600 dark:from-fuchsia-300 dark:to-cyan-300 bg-clip-text text-transparent">
              Admin Console
            </span>
            <span aria-hidden="true">·</span>
            {isEditingEventName ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={tempEventName}
                  onChange={(e) => setTempEventName(e.target.value)}
                  placeholder={t('ระบุชื่องานเลี้ยง...', 'Enter event name...')}
                  className="px-2.5 py-1 text-xs font-semibold bg-fuchsia-50 dark:bg-[#0b051c] border border-fuchsia-400 dark:border-cyan-400 rounded-lg text-slate-900 dark:text-white focus:outline-none"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    if (tempEventName.trim()) {
                      onUpdateConfig({
                        ...config,
                        eventName: tempEventName.trim(),
                      });
                    }
                    setIsEditingEventName(false);
                  }}
                  className="px-2.5 py-1 text-[11px] font-bold bg-gradient-to-r from-fuchsia-600 to-amber-500 text-white rounded-lg hover:from-fuchsia-500 hover:to-amber-400 cursor-pointer"
                >
                  {t('บันทึก', 'Save')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTempEventName(config.eventName);
                    setIsEditingEventName(false);
                  }}
                  className="px-2 py-1 text-[11px] text-slate-500 dark:text-purple-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                >
                  {t('ยกเลิก', 'Cancel')}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-slate-800 dark:text-purple-100 font-semibold">
                <span>{config.eventName}</span>
                <button
                  type="button"
                  onClick={() => {
                    setTempEventName(config.eventName);
                    setIsEditingEventName(true);
                  }}
                  className="text-fuchsia-600 dark:text-cyan-400 hover:text-fuchsia-500 dark:hover:text-cyan-300 p-1 rounded cursor-pointer"
                  title={t('เปลี่ยนชื่องานเลี้ยง', 'Edit event name')}
                >
                  <Edit className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
            {t('แดชบอร์ดบริหารจัดการงานเลี้ยง & Lucky Draw', 'Event Management & Lucky Draw Dashboard')}
          </h2>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleToggleSound}
            className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-fuchsia-50 dark:bg-[#0b051c] text-slate-700 dark:text-purple-200 hover:bg-fuchsia-100 dark:hover:bg-white/10 border border-fuchsia-200 dark:border-fuchsia-500/30 flex items-center justify-center transition cursor-pointer"
            title={soundMuted ? t('เปิดเสียง', 'Unmute') : t('ปิดเสียง', 'Mute')}
          >
            {soundMuted ? <VolumeX className="w-4 h-4 text-rose-500 dark:text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
          </button>

          <button
            type="button"
            onClick={handleToggleRegistration}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 transition active:scale-95 cursor-pointer border-2 ${
              config.isRegistrationOpen
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-400/50 hover:bg-emerald-500/25'
                : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-400/50 hover:bg-rose-500/25'
            }`}
          >
            {config.isRegistrationOpen ? (
              <>
                <ToggleRight className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>{t('สถานะ: เปิดรับลงทะเบียน', 'Status: Check-in Open')}</span>
              </>
            ) : (
              <>
                <ToggleLeft className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                <span>{t('สถานะ: ปิดระบบแล้ว', 'Status: Check-in Closed')}</span>
              </>
            )}
          </button>

          {onSwitchToUserView && (
            <button
              type="button"
              onClick={() => {
                soundFX.playClick();
                onSwitchToUserView();
              }}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 hover:bg-cyan-100 dark:hover:bg-cyan-500/20 text-cyan-800 dark:text-cyan-200 text-xs font-bold border border-cyan-300 dark:border-cyan-400/40 flex items-center gap-1.5 transition cursor-pointer"
              title={t('สลับไปดูหน้าจอลงทะเบียน / บัตรเข้างาน / ผลรางวัลของผู้ร่วมงาน', 'Preview attendee screens')}
            >
              <Eye className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-300" />
              <span>{t('ดูหน้าจอผู้ร่วมงาน', 'Attendee View')}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              soundFX.playClick();
              onLogout();
            }}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-bold border border-rose-200 dark:border-rose-500/30 flex items-center gap-1.5 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t('ออกจากระบบ', 'Log Out')}</span>
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS — DISTINCT VIVID COLORS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-50 via-white to-sky-50 dark:from-cyan-500/15 dark:via-[#140a2b] dark:to-sky-500/10 border-2 border-cyan-300/70 dark:border-cyan-400/40 shadow-md shadow-cyan-500/10">
          <div className="flex items-center justify-between text-cyan-700 dark:text-cyan-300 text-xs font-bold mb-1">
            <span>{t('รายชื่อในระบบ (Sheets/Excel)', 'Total Roster')}</span>
            <Users className="w-4 h-4 text-cyan-600 dark:text-cyan-300" />
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white font-mono tabular-nums">
            {roster.length} <span className="text-xs font-semibold text-cyan-700 dark:text-cyan-300 font-sans">{t('คน', 'staff')}</span>
          </div>
          <div className="text-[11px] text-slate-600 dark:text-purple-200/70 mt-1">
            {t('ฐานข้อมูลจัดโต๊ะพนักงาน', 'Seating & employee database')}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-emerald-500/15 dark:via-[#140a2b] dark:to-teal-500/10 border-2 border-emerald-300/70 dark:border-emerald-400/40 shadow-md shadow-emerald-500/10">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300 text-xs font-bold mb-1">
            <span>{t('ลงทะเบียนเข้างานแล้ว', 'Checked In')}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-300" />
          </div>
          <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300 font-mono tabular-nums">
            {registrations.length} <span className="text-xs font-semibold text-emerald-700/80 dark:text-emerald-200/80 font-sans">{t('คน', 'guests')}</span>
          </div>
          <div className="text-[11px] text-slate-600 dark:text-purple-200/70 mt-1 font-mono tabular-nums">
            {t(
              `คิดเป็น ${roster.length > 0 ? Math.round((registrations.length / roster.length) * 100) : 0}% ของทั้งหมด`,
              `${roster.length > 0 ? Math.round((registrations.length / roster.length) * 100) : 0}% of total roster`
            )}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 via-white to-orange-50 dark:from-amber-500/15 dark:via-[#140a2b] dark:to-orange-500/10 border-2 border-amber-300/80 dark:border-amber-400/40 shadow-md shadow-amber-500/10">
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-300 text-xs font-bold mb-1">
            <span>{t('ผู้มีสิทธิ์ลุ้น Lucky Draw', 'Eligible Candidates')}</span>
            <Flame className="w-4 h-4 text-amber-600 dark:text-amber-300" />
          </div>
          <div className="text-2xl font-black text-amber-700 dark:text-amber-300 font-mono tabular-nums">
            {eligibleCandidates.length} <span className="text-xs font-semibold text-amber-700/80 dark:text-amber-200/80 font-sans">{t('คน', 'eligible')}</span>
          </div>
          <div className="text-[11px] text-slate-600 dark:text-purple-200/70 mt-1">
            {t('เฉพาะผู้ลงทะเบียนและไม่ติดบล็อค', 'Checked-in & unblocked guests')}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-fuchsia-50 via-white to-violet-50 dark:from-fuchsia-500/15 dark:via-[#140a2b] dark:to-violet-500/10 border-2 border-fuchsia-300/80 dark:border-fuchsia-400/40 shadow-md shadow-fuchsia-500/10">
          <div className="flex items-center justify-between text-fuchsia-700 dark:text-fuchsia-300 text-xs font-bold mb-1">
            <span>{t('แจกรางวัลสำเร็จแล้ว', 'Prizes Drawn')}</span>
            <Trophy className="w-4 h-4 text-fuchsia-600 dark:text-fuchsia-300" />
          </div>
          <div className="text-2xl font-black text-fuchsia-700 dark:text-fuchsia-300 font-mono tabular-nums">
            {luckyWinners.length} <span className="text-xs font-semibold text-fuchsia-700/80 dark:text-fuchsia-200/80 font-sans">{t('รางวัล', 'won')}</span>
          </div>
          <div className="text-[11px] text-slate-600 dark:text-purple-200/70 mt-1 font-mono tabular-nums">
            {t(
              `เหลืออีก ${prizes.reduce((acc, p) => acc + getTrueRemaining(p), 0)} รางวัล`,
              `${prizes.reduce((acc, p) => acc + getTrueRemaining(p), 0)} prizes left`
            )}
          </div>
        </div>
      </div>

      {/* PERSISTENT REAL-TIME LUCKY DRAW ↔ VIP ↔ LIVE SYNC BAR (Always active while Admin Dashboard is open) */}
      <div
        className={`mb-5 p-3.5 sm:p-4 rounded-2xl border-2 shadow-lg transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${
          config.isVipTriggerActive
            ? 'bg-gradient-to-r from-emerald-500/15 via-cyan-500/15 to-amber-500/15 border-emerald-400 dark:border-emerald-400/70 shadow-emerald-500/20'
            : 'bg-white/95 dark:bg-[#140a2b]/95 border-violet-300/70 dark:border-purple-500/40 shadow-purple-500/10'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white shadow-md ${
              config.isVipTriggerActive
                ? 'bg-gradient-to-br from-emerald-500 to-cyan-500 animate-pulse'
                : 'bg-gradient-to-br from-fuchsia-600 to-violet-600'
            }`}
          >
            <Radio className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 text-[11px] font-black tracking-wide uppercase ${
                  config.isVipTriggerActive
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-fuchsia-700 dark:text-cyan-300'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    config.isVipTriggerActive ? 'bg-emerald-500 animate-ping' : 'bg-cyan-500 animate-pulse'
                  }`}
                />
                {config.isVipTriggerActive
                  ? t('REAL-TIME SYNC: ปุ่มผู้บริหารเปิดใช้งานอยู่ & จอ LIVE พร้อมรับผล!', 'REAL-TIME SYNC: VIP BUTTON UNLOCKED & LIVE ARMED!')
                  : t('REAL-TIME SYNC: เชื่อมต่อปุ่มผู้บริหาร ↔ จอ LIVE อัตโนมัติ', 'REAL-TIME SYNC: VIP REMOTE ↔ LIVE CONNECTED')}
              </span>
            </div>
            <div className="text-xs text-slate-700 dark:text-purple-100 mt-0.5 truncate">
              {t('รางวัลรอบนี้:', 'Active Prize:')}{' '}
              <span className="font-extrabold text-fuchsia-700 dark:text-amber-300">
                {currentPrize?.name || '-'}
              </span>{' '}
              {currentPrize && (
                <span className="font-mono text-[11px] text-slate-500 dark:text-purple-300">
                  ({t(`เหลือ ${getTrueRemaining(currentPrize)}/${currentPrize.quantity}`, `${getTrueRemaining(currentPrize)}/${currentPrize.quantity} left`)})
                </span>
              )}
              <span className="mx-1.5 text-slate-300 dark:text-purple-500">|</span>
              <span className="font-semibold text-emerald-700 dark:text-emerald-300 font-mono">
                {t(`พร้อมสุ่ม ${eligibleCandidates.length} คน`, `${eligibleCandidates.length} eligible`)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleToggleVipTrigger}
            className={`min-h-[42px] px-4 py-2 rounded-xl font-extrabold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-md ${
              config.isVipTriggerActive
                ? 'bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-400 hover:to-orange-400 text-white'
                : config.isRegistrationOpen
                ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 border border-amber-400/60 shadow-none'
                : 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white'
            }`}
          >
            {config.isVipTriggerActive ? (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>{t('ล็อกปุ่มผู้บริหาร', 'Lock VIP')}</span>
              </>
            ) : config.isRegistrationOpen ? (
              <>
                <Lock className="w-3.5 h-3.5" />
                <span>{t('เปิดสิทธิ์ผู้บริหารกดรอบนี้', 'Unlock VIP Round')}</span>
              </>
            ) : (
              <>
                <Unlock className="w-3.5 h-3.5" />
                <span>{t('เปิดสิทธิ์ผู้บริหารกดรอบนี้', 'Unlock VIP Round')}</span>
              </>
            )}
          </button>

          {onOpenLiveView && (
            <button
              type="button"
              onClick={() => {
                soundFX.playClick();
                onOpenLiveView();
              }}
              className="min-h-[42px] px-3.5 py-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:from-fuchsia-500 hover:to-violet-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>{t('เปิดจอ LIVE', 'Open LIVE')}</span>
            </button>
          )}

          {onOpenVipView && (
            <button
              type="button"
              onClick={onOpenVipView}
              className="min-h-[42px] px-3.5 py-2 rounded-xl bg-amber-100 dark:bg-amber-500/15 hover:bg-amber-200 dark:hover:bg-amber-500/25 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-400/40 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Crown className="w-3.5 h-3.5" />
              <span>{t('หน้าปุ่ม VIP', 'VIP Screen')}</span>
            </button>
          )}
        </div>
      </div>

      {/* 60-SECOND CLAIM COUNTDOWN & RE-DRAW QUICK CONTROLLER (Shown when a winner has been drawn) */}
      {luckyWinners[0] && (
        <div
          className={`mb-5 p-3.5 sm:p-4 rounded-2xl border-2 flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all shadow-md ${
            claimSecondsLeft !== null
              ? claimSecondsLeft <= 10
                ? 'bg-gradient-to-r from-rose-500/15 via-orange-500/15 to-amber-500/15 border-rose-500 dark:border-rose-400 animate-pulse'
                : 'bg-gradient-to-r from-cyan-500/15 via-emerald-500/15 to-teal-500/15 border-cyan-400 dark:border-cyan-400/70'
              : 'bg-white/95 dark:bg-[#140a2b]/95 border-amber-300/80 dark:border-amber-400/40'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white shadow-md ${
                claimSecondsLeft !== null
                  ? claimSecondsLeft <= 10
                    ? 'bg-gradient-to-br from-rose-500 to-red-600'
                    : 'bg-gradient-to-br from-cyan-500 to-emerald-500'
                  : 'bg-gradient-to-br from-amber-500 to-orange-500'
              }`}
            >
              <Timer className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs font-extrabold text-slate-900 dark:text-white">
                <span>
                  {t('ควบคุมการรับรางวัลล่าสุด:', 'Latest Winner Claim Control:')}
                </span>
                <span className="text-fuchsia-700 dark:text-amber-300 truncate">
                  {luckyWinners[0].winnerName} ({luckyWinners[0].employeeId})
                </span>
                <span className="text-[11px] font-semibold text-cyan-700 dark:text-cyan-300">
                  · {luckyWinners[0].prizeName}
                </span>
              </div>

              {claimSecondsLeft !== null ? (
                <div className="text-xs font-bold mt-0.5 flex items-center gap-2">
                  <span
                    className={`font-mono tabular-nums text-sm font-black ${
                      claimSecondsLeft <= 10
                        ? 'text-rose-600 dark:text-rose-300'
                        : 'text-cyan-700 dark:text-cyan-300'
                    }`}
                  >
                    {claimSecondsLeft === 0
                      ? t('หมดเวลา 60 วินาทีแล้ว!', "TIME'S UP (0s)!")
                      : t(`กำลังนับถอยหลังที่หน้า LIVE: เหลือ ${claimSecondsLeft} วินาที`, `LIVE Countdown Running: ${claimSecondsLeft}s left`)}
                  </span>
                </div>
              ) : (
                <div className="text-[11px] text-slate-600 dark:text-purple-200/80 mt-0.5">
                  {t(
                    'กดเริ่มนับถอยหลัง 60 วิ เพื่อให้แสดงเวลารับรางวัลที่หน้า LIVE หรือกดจับใหม่หากผิดกติกา',
                    'Start the 60s claim countdown on LIVE, or forfeit & re-draw if rules are violated.'
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {claimSecondsLeft !== null ? (
              <button
                type="button"
                onClick={handleStopClaimCountdown}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>{t('หยุดเวลาเค้าดาวน์', 'Stop Countdown')}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleStartClaimCountdown(luckyWinners[0])}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{t('เริ่มเค้าดาวน์ 60 วิ (หน้า LIVE)', 'Start 60s Countdown')}</span>
              </button>
            )}

            <button
              type="button"
              disabled={isDrawing}
              onClick={() => {
                soundFX.playClick();
                const latest = luckyWinners[0];
                if (!latest) return;
                showConfirmDialog({
                  variant: 'danger',
                  title: t('ยืนยันการตัดสิทธิ์ & เปิดสิทธิ์ผู้บริหารจับใหม่', 'Confirm Forfeit & Unlock VIP Re-Draw'),
                  message: t(
                    `ยืนยันตัดสิทธิ์ "${latest.winnerName}" (${latest.employeeId}) ออกจากสิทธิ์ลุ้นรางวัลถาวร คืนรางวัล "${latest.prizeName}" และเปิดสิทธิ์ให้ผู้บริหารกดปุ่มจับรางวัลใหม่เองหรือไม่?`,
                    `Permanently disqualify "${latest.winnerName}" (${latest.employeeId}), restore "${latest.prizeName}", and unlock the VIP Executive button for re-draw?`
                  ),
                  confirmText: t('ตัดสิทธิ์ & เปิดสิทธิ์ผู้บริหาร', 'Forfeit & Unlock VIP'),
                  onConfirm: () => handleConfirmForfeitAndRedraw(latest),
                });
              }}
              className="min-h-[42px] px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 border border-amber-400/50 font-extrabold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>{t('สละสิทธิ์ & เปิดสิทธิ์ผู้บริหารจับใหม่', 'Forfeit & Unlock VIP Re-Draw')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Admin Navigation Tabs - Vibrant Segmented Control */}
      <div className="flex items-center gap-1.5 p-1.5 bg-white/95 dark:bg-[#140a2b]/95 border-2 border-fuchsia-200/80 dark:border-purple-500/30 rounded-2xl mb-6 overflow-x-auto shadow-md">
        <button
          type="button"
          onClick={() => {
            soundFX.playClick();
            setActiveTab('luckydraw');
          }}
          className={`min-h-[44px] px-4 py-2 text-xs font-extrabold rounded-xl flex items-center gap-2 whitespace-nowrap shrink-0 transition cursor-pointer ${
            activeTab === 'luckydraw'
              ? 'bg-gradient-to-r from-fuchsia-600 via-rose-500 to-amber-500 text-white shadow-md shadow-fuchsia-500/25'
              : 'text-slate-600 dark:text-purple-200 hover:text-fuchsia-700 dark:hover:text-white hover:bg-fuchsia-50 dark:hover:bg-white/10'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>{t('เวทีสุ่ม Lucky Draw & รีโมทผู้บริหาร', 'Lucky Draw Stage & VIP Remote')}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            soundFX.playClick();
            setActiveTab('prizes');
          }}
          className={`min-h-[44px] px-4 py-2 text-xs font-extrabold rounded-xl flex items-center gap-2 whitespace-nowrap shrink-0 transition cursor-pointer ${
            activeTab === 'prizes'
              ? 'bg-gradient-to-r from-pink-500 to-orange-500 text-white shadow-md shadow-pink-500/25'
              : 'text-slate-600 dark:text-purple-200 hover:text-pink-700 dark:hover:text-white hover:bg-pink-50 dark:hover:bg-white/10'
          }`}
        >
          <Gift className="w-4 h-4" />
          <span>{t(`จัดการของรางวัล & แนบรูป (${prizes.length})`, `Prizes & Images (${prizes.length})`)}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            soundFX.playClick();
            setActiveTab('overview');
          }}
          className={`min-h-[44px] px-4 py-2 text-xs font-extrabold rounded-xl flex items-center gap-2 whitespace-nowrap shrink-0 transition cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25'
              : 'text-slate-600 dark:text-purple-200 hover:text-cyan-700 dark:hover:text-white hover:bg-cyan-50 dark:hover:bg-white/10'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>{t(`รายชื่อผู้ลงทะเบียน (${registrations.length})`, `Checked-in List (${registrations.length})`)}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            soundFX.playClick();
            setActiveTab('roster');
          }}
          className={`min-h-[44px] px-4 py-2 text-xs font-extrabold rounded-xl flex items-center gap-2 whitespace-nowrap shrink-0 transition cursor-pointer ${
            activeTab === 'roster'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/25'
              : 'text-slate-600 dark:text-purple-200 hover:text-emerald-700 dark:hover:text-white hover:bg-emerald-50 dark:hover:bg-white/10'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>{t(`นำเข้าข้อมูล Excel (${roster.length})`, `Import Excel (${roster.length})`)}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            soundFX.playClick();
            setActiveTab('history');
          }}
          className={`min-h-[44px] px-4 py-2 text-xs font-extrabold rounded-xl flex items-center gap-2 whitespace-nowrap shrink-0 transition cursor-pointer ${
            activeTab === 'history'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/25'
              : 'text-slate-600 dark:text-purple-200 hover:text-amber-700 dark:hover:text-white hover:bg-amber-50 dark:hover:bg-white/10'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>{t(`รายงานผลสุ่มรางวัล (${luckyWinners.length})`, `Draw History (${luckyWinners.length})`)}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            soundFX.playClick();
            setActiveTab('settings');
          }}
          className={`min-h-[44px] px-4 py-2 text-xs font-extrabold rounded-xl flex items-center gap-2 whitespace-nowrap shrink-0 transition cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/25'
              : 'text-slate-600 dark:text-purple-200 hover:text-violet-700 dark:hover:text-white hover:bg-violet-50 dark:hover:bg-white/10'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>{t('ตั้งค่างานเลี้ยง & สลับงานใหม่', 'Event Settings & Reset')}</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: LUCKY DRAW ARENA & VIP EXECUTIVE REMOTE CONTROLLER
      ========================================================================= */}
      {activeTab === 'luckydraw' && (
        <div className="space-y-6">
          {/* VIP EXECUTIVE REMOTE LINK & TRIGGER */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white/95 dark:bg-[#140a2b]/95 border-2 border-amber-300/80 dark:border-amber-400/40 shadow-xl shadow-amber-500/10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/30 shrink-0">
                  <Crown className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[11px] font-extrabold text-amber-600 dark:text-amber-300 mb-0.5 uppercase tracking-wide">
                    {t('ระบบรีโมทสำหรับผู้บริหาร (VIP Executive Remote)', 'VIP Executive Mobile Remote')}
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                    {t(
                      'แชร์ลิงก์ให้ผู้บริหารกดปุ่ม "LUCKY DRAW" ได้โดยตรงจากมือถือ',
                      'Share link for executives to trigger "LUCKY DRAW" from their phone'
                    )}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-purple-200/80">
                    {t(
                      'ผู้บริหารไม่ต้องล็อกอิน โดยแอดมินจะต้องกดเปิดปุ่มทุกครั้งที่จะให้กดในแต่ละรอบ และผลจะเด้งที่หน้านี้ + จอ LIVE ทันที',
                      'No login required for VIPs. Admin unlocks per round; results sync here & on LIVE instantly.'
                    )}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyVipLink}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-[#0b051c] hover:bg-amber-100 dark:hover:bg-white/10 text-slate-900 dark:text-white border-2 border-amber-300 dark:border-amber-400/40 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
                >
                  <Copy className="w-3.5 h-3.5 text-amber-600 dark:text-amber-300" />
                  <span>
                    {copyLinkNotice
                      ? t('คัดลอกลิงก์สำเร็จ!', 'Link Copied!')
                      : t('คัดลอกลิงก์ส่งให้ผู้บริหาร', 'Copy VIP Link')}
                  </span>
                </button>

                {onOpenVipView && (
                  <button
                    type="button"
                    onClick={onOpenVipView}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition cursor-pointer whitespace-nowrap"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{t('ทดลองเปิดหน้ารีโมท', 'Preview VIP Screen')}</span>
                  </button>
                )}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50/80 via-fuchsia-50/50 to-cyan-50/80 dark:from-[#0b051c] dark:via-[#170b33] dark:to-[#0b051c] border border-amber-200 dark:border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-white">
                  {t('สถานะปุ่มบนมือถือผู้บริหาร:', 'VIP Mobile Button Status:')}{' '}
                  <span className={config.isVipTriggerActive ? 'text-emerald-600 dark:text-emerald-300 font-extrabold' : 'text-slate-500 dark:text-purple-300/70'}>
                    {config.isVipTriggerActive
                      ? t('เปิดใช้งานอยู่ (รอผู้บริหารกด)', 'Unlocked (Waiting for VIP)')
                      : t('ล็อกอยู่ (ผู้บริหารยังกดไม่ได้)', 'Locked (Standing By)')}
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 dark:text-purple-200/80 mt-0.5">
                  {t('รางวัลที่ผูกกับรอบนี้:', 'Active Round Prize:')}{' '}
                  <span className="font-bold text-fuchsia-700 dark:text-amber-300">{currentPrize?.name}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleVipTrigger}
                className={`min-h-[46px] px-5 py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer shadow-md ${
                  config.isVipTriggerActive
                    ? 'bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-400 hover:to-orange-400 text-white'
                    : config.isRegistrationOpen
                    ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 border-2 border-amber-400/60 shadow-none'
                    : 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white'
                }`}
              >
                {config.isVipTriggerActive ? (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>{t('ล็อกปุ่มผู้บริหารชั่วคราว', 'Lock VIP Button')}</span>
                  </>
                ) : config.isRegistrationOpen ? (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>{t('เปิดสิทธิ์ให้ผู้บริหารกดรอบนี้', 'Unlock VIP Button for Round')}</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4" />
                    <span>{t('เปิดสิทธิ์ให้ผู้บริหารกดรอบนี้', 'Unlock VIP Button for Round')}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* MAIN DRAW STAGE */}
          <div className="rounded-3xl bg-white/95 dark:bg-[#140a2b]/95 border-2 border-fuchsia-300/80 dark:border-fuchsia-500/40 p-5 sm:p-7 shadow-xl shadow-fuchsia-500/10 relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-cyan-400 via-fuchsia-500 to-amber-400" />
            <div className="max-w-2xl mx-auto text-center pt-1">
              <p className="text-xs font-extrabold bg-gradient-to-r from-fuchsia-600 to-cyan-600 dark:from-fuchsia-300 dark:to-cyan-300 bg-clip-text text-transparent mb-1 uppercase tracking-wider">
                {t('เวทีสุ่มจับรางวัล Lucky Draw', 'Lucky Draw Live Stage')}
              </p>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                {t('พร้อมสุ่มผู้โชคดีค่ำคืนนี้', 'Ready to Draw Tonight’s Winner')}
              </h3>
              <p className="text-xs text-slate-600 dark:text-purple-200/80 mt-1">
                {t(
                  'สุ่มเฉพาะผู้ลงทะเบียนสำเร็จ ไม่แจกซ้ำรหัสเดิม และคัดกรองตามกฎความยุติธรรม',
                  'Draws only from checked-in attendees with zero duplicate winners and fair-chance filters.'
                )}
              </p>

              {/* Prize Selection Buttons */}
              <div className="mt-5 mb-5 flex flex-wrap justify-center gap-2">
                {prizes.map((p) => {
                  const isSelected = p.id === selectedPrizeId;
                  const trueRem = getTrueRemaining(p);
                  const isExhausted = trueRem <= 0;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={isDrawing || isExhausted}
                      onClick={() => {
                        soundFX.playClick();
                        setSelectedPrizeId(p.id);
                        onUpdateConfig({
                          ...config,
                          vipActivePrizeId: p.id,
                        });
                      }}
                      className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-extrabold transition flex items-center gap-2 cursor-pointer border-2 ${
                        isSelected
                          ? 'bg-gradient-to-r from-fuchsia-600 via-rose-500 to-amber-500 text-white border-transparent shadow-md shadow-fuchsia-500/25'
                          : isExhausted
                          ? 'bg-slate-100 dark:bg-[#0b051c] text-slate-400 dark:text-purple-300/40 border-slate-200 dark:border-purple-500/15 cursor-not-allowed'
                          : 'bg-fuchsia-50/60 dark:bg-[#0b051c] hover:bg-fuchsia-100 dark:hover:bg-white/10 text-slate-800 dark:text-purple-100 border-fuchsia-200 dark:border-purple-500/30'
                      }`}
                    >
                      <Trophy className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-200' : 'text-fuchsia-600 dark:text-cyan-400'}`} />
                      <span>{p.name}</span>
                      <span
                        className={`text-[11px] font-mono tabular-nums ${
                          isSelected ? 'text-white font-bold' : 'text-slate-500 dark:text-purple-300/70'
                        }`}
                      >
                        ({trueRem})
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Active Prize Info Preview */}
              {currentPrize && (
                <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-fuchsia-50/70 via-white to-cyan-50/70 dark:from-[#0b051c] dark:via-[#180c36] dark:to-[#0b051c] border-2 border-fuchsia-200 dark:border-fuchsia-500/30 flex flex-col sm:flex-row items-center gap-4 text-left">
                  {currentPrize.imageUrl && !brokenImages[currentPrize.id] ? (
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-white dark:bg-[#0b051c] border-2 border-fuchsia-300 dark:border-cyan-400/50 shrink-0 shadow-md">
                      <img
                        src={currentPrize.imageUrl}
                        alt={currentPrize.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={() => setBrokenImages((prev) => ({ ...prev, [currentPrize.id]: true }))}
                      />
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-fuchsia-500 to-amber-500 flex items-center justify-center shrink-0 text-white shadow-md">
                      <Gift className="w-8 h-8" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-extrabold text-fuchsia-600 dark:text-cyan-300 uppercase">
                      {currentPrize.tier}
                    </div>
                    <div className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white truncate">
                      {currentPrize.name}
                    </div>
                    {currentPrize.sponsor && (
                      <div className="text-xs text-slate-600 dark:text-purple-200/80">
                        {t('ผู้สนับสนุน:', 'Sponsor:')} {currentPrize.sponsor}
                      </div>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs text-slate-500 dark:text-purple-300">{t('จำนวนที่เหลือ', 'Remaining')}</div>
                    <div className="text-xl font-black text-amber-600 dark:text-amber-300 font-mono tabular-nums">
                      {getTrueRemaining(currentPrize)} / {currentPrize.quantity}
                    </div>
                  </div>
                </div>
              )}

              {/* SHUFFLE / DRAWING ANIMATION DISPLAY */}
              <div className="w-full max-w-md mx-auto aspect-[16/10] rounded-2xl bg-gradient-to-br from-violet-50 via-fuchsia-50/70 to-cyan-50 dark:from-[#0b051c] dark:via-[#1a0d3b] dark:to-[#0d1c38] border-2 border-cyan-300/70 dark:border-cyan-400/40 p-4 flex flex-col items-center justify-center relative mb-6 shadow-inner">
                {isDrawing && drawShufflingCandidate ? (
                  <div className="flex flex-col items-center animate-bounce">
                    <div className="w-20 h-24 rounded-xl overflow-hidden border-2 border-fuchsia-500 dark:border-cyan-400 mb-2 shadow-lg bg-white dark:bg-[#140a2b]">
                      {drawShufflingCandidate.selfieUrl ? (
                        <img
                          src={drawShufflingCandidate.selfieUrl}
                          alt="shuffling"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">
                          ?
                        </div>
                      )}
                    </div>
                    <div className="text-xl font-black text-fuchsia-600 dark:text-cyan-300 font-mono">
                      {drawShufflingCandidate.employeeId}
                    </div>
                    <div className="text-base font-extrabold text-slate-900 dark:text-white">
                      {drawShufflingCandidate.fullName}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-amber-300 font-bold">
                      {drawShufflingCandidate.tableNumber}
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-fuchsia-500 via-amber-400 to-cyan-400 flex items-center justify-center mx-auto mb-3 text-white shadow-lg shadow-fuchsia-500/30">
                      <Trophy className="w-8 h-8" />
                    </div>
                    <div className="text-sm font-extrabold text-slate-900 dark:text-white">
                      {t('ผู้มีสิทธิ์ลุ้นรางวัลทั้งหมด:', 'Total Eligible Candidates:')}{' '}
                      <span className="text-fuchsia-600 dark:text-amber-300 font-mono tabular-nums text-base">
                        {eligibleCandidates.length}
                      </span>{' '}
                      {t('ท่าน', 'guests')}
                    </div>
                    <p className="text-xs text-slate-600 dark:text-purple-200/80 mt-1 max-w-xs mx-auto">
                      {t(
                        'แอดมินสามารถกดสุ่มจากที่นี่ หรือเปิดสิทธิ์ให้ผู้บริหารกดผ่านมือถือได้ทันที',
                        'Trigger the draw right here or unlock the VIP remote for an executive.'
                      )}
                    </p>
                  </div>
                )}
              </div>

              {/* Big Draw Trigger Button for Admin */}
              <button
                type="button"
                disabled={isDrawing || eligibleCandidates.length === 0 || !currentPrize || getTrueRemaining(currentPrize) <= 0}
                onClick={handleStartLuckyDraw}
                className={`min-h-[56px] px-8 py-3 rounded-2xl font-black text-base shadow-xl flex items-center justify-center gap-3 mx-auto transition-transform active:scale-95 cursor-pointer ${
                  isDrawing
                    ? 'bg-slate-200 dark:bg-purple-900/40 text-slate-500 dark:text-purple-300 cursor-wait'
                    : eligibleCandidates.length === 0 || !currentPrize || getTrueRemaining(currentPrize) <= 0
                    ? 'bg-slate-200 dark:bg-purple-900/40 text-slate-400 dark:text-purple-400/50 cursor-not-allowed'
                    : 'bg-gradient-to-r from-fuchsia-600 via-rose-500 to-amber-500 hover:from-fuchsia-500 hover:via-rose-400 hover:to-amber-400 text-white shadow-fuchsia-500/30 hover:scale-105'
                }`}
              >
                <Sparkles className="w-6 h-6" />
                <span>
                  {isDrawing
                    ? t('กำลังสุ่มรายชื่อ...', 'Drawing Winner...')
                    : t('เริ่มสุ่มจับรางวัล (Admin Trigger)', 'Start Lucky Draw (Admin Trigger)')}
                </span>
              </button>
            </div>
          </div>

        </div>
      )}

      {/* =========================================================================
          TAB 2: PRIZE MANAGEMENT & ATTACH SAMPLE IMAGES
      ========================================================================= */}
      {activeTab === 'prizes' && (
        <div className="space-y-6">
          <div className="p-5 sm:p-6 rounded-3xl bg-white/95 dark:bg-[#140a2b]/95 border-2 border-pink-300/70 dark:border-pink-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Gift className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                <span>{t('จัดการของรางวัล & แนบรูปตัวอย่าง', 'Manage Prizes & Sample Images')}</span>
              </h3>
              <p className="text-xs text-slate-600 dark:text-purple-200/80 mt-0.5">
                {t(
                  'ปรับแต่งเพิ่มลดประเภทของรางวัล แก้ไขจำนวน และอัปโหลดรูปตัวอย่างของรางวัลได้ตามต้องการ',
                  'Add, edit, remove prize tiers, adjust quantities, and upload preview images.'
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingPrize(null);
                setIsPrizeModalOpen(true);
                soundFX.playClick();
              }}
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 hover:from-pink-400 hover:to-amber-400 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-pink-500/25 transition active:scale-95 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{t('เพิ่มของรางวัลใหม่', 'Add New Prize')}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {prizes.map((prize) => {
              const hasValidImage = prize.imageUrl && !brokenImages[prize.id];
              return (
                <div
                  key={prize.id}
                  className="rounded-3xl bg-white/95 dark:bg-[#140a2b]/95 border-2 border-fuchsia-200/80 dark:border-purple-500/30 hover:border-fuchsia-400 dark:hover:border-cyan-400/60 overflow-hidden flex flex-col justify-between transition shadow-md"
                >
                  <div>
                    <div className="relative w-full h-44 bg-gradient-to-br from-fuchsia-50 via-amber-50 to-cyan-50 dark:from-[#0b051c] dark:to-[#180c36] border-b border-fuchsia-200/70 dark:border-purple-500/30 overflow-hidden flex items-center justify-center">
                      {hasValidImage ? (
                        <img
                          src={prize.imageUrl}
                          alt={prize.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                          onError={() => setBrokenImages((prev) => ({ ...prev, [prize.id]: true }))}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-600">
                          <Gift className="w-12 h-12 text-amber-500/50 dark:text-amber-400/50" />
                          <span className="text-[11px] font-medium text-zinc-500 mt-1">
                            {t('ไม่มีรูปภาพแนบ', 'No Image Attached')}
                          </span>
                        </div>
                      )}
                      <div className="absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />
                      <span className="absolute top-2.5 left-3 text-[11px] font-semibold text-amber-300">
                        {prize.tier}
                      </span>
                      <span
                        className={`absolute top-2.5 right-3 text-[11px] font-mono tabular-nums font-bold ${
                          prize.remaining > 0 ? 'text-emerald-300' : 'text-zinc-400'
                        }`}
                      >
                        {t(`เหลือ ${prize.remaining} / ${prize.quantity}`, `Left ${prize.remaining} / ${prize.quantity}`)}
                      </span>
                    </div>

                    <div className="p-4">
                      <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                        {prize.name}
                      </h4>
                      {prize.sponsor && (
                        <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                          {t('ผู้สนับสนุน:', 'Sponsor:')} {prize.sponsor}
                        </p>
                      )}
                      {prize.description && (
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 line-clamp-2">
                          {prize.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="p-3 bg-zinc-50 dark:bg-zinc-950/60 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPrize(prize);
                        setIsPrizeModalOpen(true);
                        soundFX.playClick();
                      }}
                      className="flex-1 min-h-[40px] px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-semibold border border-zinc-300 dark:border-zinc-700 flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span>{t('แก้ไขข้อมูล / รูปภาพ', 'Edit Details / Image')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        soundFX.playClick();
                        showConfirmDialog({
                          variant: 'danger',
                          title: t('ยืนยันการลบของรางวัล', 'Confirm Delete Prize'),
                          message: t(
                            `คุณต้องการลบรางวัล "${prize.name}" ออกจากรายการหรือไม่?`,
                            `Are you sure you want to delete prize "${prize.name}"?`
                          ),
                          confirmText: t('ลบรางวัล', 'Delete Prize'),
                          onConfirm: () => handleDeletePrize(prize.id),
                        });
                      }}
                      className="min-h-[40px] min-w-[40px] p-2 rounded-xl bg-white dark:bg-zinc-900 hover:bg-rose-500/15 dark:hover:bg-rose-500/20 text-zinc-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-300 border border-zinc-200 dark:border-zinc-800 hover:border-rose-500/30 flex items-center justify-center transition cursor-pointer"
                      title={t('ลบรางวัล', 'Delete prize')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: ATTENDEE OVERVIEW & REAL-TIME DASHBOARD
      ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm dark:shadow-none">
            <div className="flex-1 flex flex-col sm:flex-row items-center gap-2">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={attendeeSearch}
                  onChange={(e) => setAttendeeSearch(e.target.value)}
                  placeholder={t('ค้นหารหัส, เบอร์โทร, ชื่อ, โต๊ะ...', 'Search ID, phone, name, table...')}
                  className="w-full min-h-[44px] pl-9 pr-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-amber-500 dark:focus:border-amber-400"
                />
              </div>

              <div className="w-full sm:w-auto flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-zinc-500" />
                <select
                  value={selectedDeptFilter}
                  onChange={(e) => setSelectedDeptFilter(e.target.value)}
                  className="w-full sm:w-auto min-h-[44px] px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-amber-500 dark:focus:border-amber-400 font-medium"
                >
                  <option value="ALL">{t(`ทุกแผนก (${registrations.length})`, `All Departments (${registrations.length})`)}</option>
                  {allDepartments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                soundFX.playClick();
                exportAttendeesToExcel(registrations, luckyWinners);
              }}
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition cursor-pointer shrink-0"
            >
              <Download className="w-4 h-4" />
              <span>{t('ส่งออกรายชื่อลงทะเบียนเป็น Excel (.xlsx)', 'Export Check-ins to Excel (.xlsx)')}</span>
            </button>
          </div>

          {/* Mobile Card View for Attendees */}
          <div className="md:hidden space-y-2.5">
            {filteredAttendees.length > 0 ? (
              filteredAttendees.map((att) => {
                const hasWon = wonEmployeeIds.has(att.employeeId.toUpperCase());
                const isBlocked =
                  att.isBlockedFromDraw ||
                  (att.groupRole && blockedGroupSet.has(att.groupRole));

                return (
                  <div
                    key={att.id}
                    className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center gap-3 shadow-sm dark:shadow-none"
                  >
                    <div className="w-12 h-14 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 shrink-0">
                      {att.selfieUrl ? (
                        <img
                          src={att.selfieUrl}
                          alt={att.fullName}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[9px] text-zinc-500">
                          {t('ไม่มีรูป', 'No Photo')}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400 truncate">
                          {att.employeeId}
                        </span>
                        {hasWon ? (
                          <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 shrink-0">
                            {t('ได้รางวัลแล้ว', 'Won')}
                          </span>
                        ) : isBlocked ? (
                          <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 shrink-0">
                            {t('ถูกบล็อค', 'Blocked')}
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                            {t('พร้อมลุ้น', 'Eligible')}
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                        {att.fullName} {att.nickname ? `(${att.nickname})` : ''}
                      </div>
                      <div className="text-[11px] text-zinc-600 dark:text-zinc-400 truncate mt-0.5 font-mono tabular-nums">
                        {att.phone || '-'} · {att.tableNumber}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center text-xs text-zinc-500">
                {registrations.length === 0
                  ? t('ยังไม่มีพนักงานลงทะเบียนเข้างานในขณะนี้', 'No guests have checked in yet.')
                  : t('ไม่พบรายชื่อที่ตรงกับคำค้นหา', 'No attendees match your search.')}
              </div>
            )}
          </div>

          {/* Desktop Table View for Attendees */}
          <div className="hidden md:block rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm dark:shadow-none">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 text-[11px] font-semibold border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="py-3 px-4">{t('รูปภาพ', 'Photo')}</th>
                    <th className="py-3 px-4">{t('รหัสพนักงาน', 'Employee ID')}</th>
                    <th className="py-3 px-4">{t('เบอร์โทรศัพท์', 'Phone')}</th>
                    <th className="py-3 px-4">{t('ชื่อ - นามสกุล', 'Full Name')}</th>
                    <th className="py-3 px-4">{t('แผนก', 'Department')}</th>
                    <th className="py-3 px-4">{t('หมายเลขโต๊ะ', 'Table')}</th>
                    <th className="py-3 px-4">{t('เวลาลงทะเบียน', 'Checked In At')}</th>
                    <th className="py-3 px-4">{t('สิทธิ์ Lucky Draw', 'Draw Status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/80 text-zinc-700 dark:text-zinc-300">
                  {filteredAttendees.length > 0 ? (
                    filteredAttendees.map((att) => {
                      const hasWon = wonEmployeeIds.has(att.employeeId.toUpperCase());
                      const isBlocked =
                        att.isBlockedFromDraw ||
                        (att.groupRole && blockedGroupSet.has(att.groupRole));

                      return (
                        <tr key={att.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition">
                          <td className="py-2.5 px-4">
                            <div className="w-12 h-14 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700">
                              {att.selfieUrl ? (
                                <img
                                  src={att.selfieUrl}
                                  alt={att.fullName}
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[9px] text-zinc-500">
                                  {t('ไม่มีรูป', 'No Photo')}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-4 font-mono font-bold text-amber-600 dark:text-amber-400">
                            {att.employeeId}
                          </td>
                          <td className="py-2.5 px-4 font-mono tabular-nums text-zinc-800 dark:text-zinc-200">
                            {att.phone || '-'}
                          </td>
                          <td className="py-2.5 px-4">
                            <div className="font-semibold text-zinc-900 dark:text-zinc-100">{att.fullName}</div>
                            {att.nickname && (
                              <div className="text-[11px] text-amber-700 dark:text-amber-300">
                                ({att.nickname})
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-zinc-600 dark:text-zinc-400">
                            {att.department}
                          </td>
                          <td className="py-2.5 px-4 font-mono text-amber-700 dark:text-amber-300 font-semibold">
                            {att.tableNumber}
                          </td>
                          <td className="py-2.5 px-4 text-zinc-600 dark:text-zinc-400 font-mono tabular-nums text-[11px]">
                            {new Date(att.registeredAt).toLocaleTimeString(lang === 'en' ? 'en-US' : 'th-TH', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="py-2.5 px-4">
                            {hasWon ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                                <Trophy className="w-3.5 h-3.5" />
                                <span>{t('ได้รางวัลแล้ว', 'Won')}</span>
                              </span>
                            ) : isBlocked ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                                <ShieldAlert className="w-3.5 h-3.5" />
                                <span>{t('ถูกบล็อค', 'Blocked')}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{t('พร้อมลุ้นรางวัล', 'Eligible')}</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-zinc-500">
                        {registrations.length === 0
                          ? t('ยังไม่มีพนักงานลงทะเบียนเข้างานในขณะนี้', 'No guests have checked in yet.')
                          : t('ไม่พบรายชื่อที่ตรงกับคำค้นหา', 'No attendees match your search.')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* FAIR CHANCE & BLOCKING CONTROLS — Hidden behind small icon in Checked-in List tab until PIN 25102612 is entered */}
          {!isFairChanceUnlocked ? (
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => {
                  soundFX.playClick();
                  setIsFairChancePinModalOpen(true);
                }}
                className="w-9 h-9 rounded-xl bg-white/80 dark:bg-[#140a2b] hover:bg-fuchsia-50 dark:hover:bg-white/10 border border-fuchsia-200 dark:border-purple-500/30 hover:border-fuchsia-400 text-slate-400 dark:text-purple-400/60 hover:text-fuchsia-600 dark:hover:text-cyan-300 flex items-center justify-center transition cursor-pointer"
                title={t('การคัดกรอง & บล็อคกลุ่มผู้ใช้งานเพื่อความยุติธรรม', 'Fair-Chance Filtering & Group Blocking')}
                aria-label={t('เปิดเมนูการคัดกรองสิทธิ์', 'Open Fair-Chance Filter Menu')}
              >
                <ShieldAlert className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="p-5 sm:p-6 rounded-3xl bg-white/95 dark:bg-[#140a2b]/95 border-2 border-fuchsia-300/80 dark:border-fuchsia-500/40 animate-in fade-in duration-200 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h4 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-fuchsia-600 dark:text-cyan-400" />
                    <span>{t('การคัดกรอง & บล็อคกลุ่มผู้ใช้งานเพื่อความยุติธรรม', 'Fair-Chance Filtering & Group Blocking')}</span>
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-purple-200/80 mt-0.5">
                    {t(
                      'ตั้งค่าบล็อคกลุ่ม เช่น คณะผู้บริหาร หรือผู้ที่เคยได้รับรางวัล เพื่อกระจายโอกาส',
                      'Block specific roles/groups or previous winners to keep the draw fair.'
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-300 font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{t('ไม่แจกซ้ำรหัสเดิม: เปิดใช้งานตลอด', 'No Duplicate Winners: Always On')}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.playClick();
                      setIsFairChanceUnlocked(false);
                    }}
                    className="min-h-[36px] px-3 py-1 rounded-lg bg-fuchsia-50 dark:bg-[#0b051c] hover:bg-fuchsia-100 dark:hover:bg-white/10 border border-fuchsia-200 dark:border-purple-500/30 text-[11px] text-slate-600 dark:text-purple-200 font-bold cursor-pointer"
                  >
                    {t('ซ่อนเมนู', 'Hide Menu')}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-purple-100 block">
                  {t('เลือกกลุ่มหรือบทบาทที่ต้องการบล็อคจากการจับรางวัล:', 'Select groups or roles to exclude from the draw:')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {allGroups.map((groupName) => {
                    const isBlocked = blockedGroupSet.has(groupName);
                    return (
                      <button
                        key={groupName}
                        type="button"
                        onClick={() => handleToggleBlockedGroup(groupName)}
                        className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border-2 transition cursor-pointer ${
                          isBlocked
                            ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-400/50'
                            : 'bg-emerald-50/70 dark:bg-[#0b051c] text-slate-800 dark:text-purple-100 border-emerald-200 dark:border-emerald-500/30 hover:bg-emerald-100/70 dark:hover:bg-emerald-500/10'
                        }`}
                      >
                        {isBlocked ? (
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        )}
                        <span>{groupName}</span>
                        <span className="text-[11px] font-mono">
                          {isBlocked ? t('(บล็อคอยู่)', '(Blocked)') : t('(มีสิทธิ์)', '(Eligible)')}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 4: EXCEL ROSTER MANAGEMENT & IMPORT
      ========================================================================= */}
      {activeTab === 'roster' && (
        <div className="space-y-6">
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm dark:shadow-none">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span>{t('นำเข้าข้อมูลพนักงานและหมายเลขโต๊ะผ่านไฟล์ Excel', 'Import Employee Roster & Table Assignments via Excel')}</span>
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                  {t(
                    'รองรับไฟล์ .xlsx และ .csv ระบบจะแทนที่ฐานข้อมูลรายชื่อพนักงานและหมายเลขโต๊ะเดิมทั้งหมดตามไฟล์ที่อัปโหลด (ไม่ลบรายชื่อผู้ลงทะเบียนเข้างานแล้ว)',
                    'Supports .xlsx and .csv files. Importing replaces the entire employee & table roster with the uploaded file (existing check-ins are preserved).'
                  )}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  soundFX.playClick();
                  downloadSampleExcelTemplate(roster);
                }}
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-semibold border border-zinc-300 dark:border-zinc-700 flex items-center justify-center gap-2 transition cursor-pointer shrink-0"
              >
                <Download className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>{t('ดาวน์โหลด Template Excel ตัวอย่าง', 'Download Sample Excel Template')}</span>
              </button>
            </div>

            {excelImportMessage && (
              <div
                className={`mb-4 p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                  excelImportMessage.type === 'success'
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                    : 'bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-300'
                }`}
              >
                {excelImportMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                )}
                <span>{excelImportMessage.text}</span>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleExcelUpload}
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-amber-500/70 dark:hover:border-amber-400/70 rounded-2xl p-6 text-center cursor-pointer bg-zinc-50 dark:bg-zinc-950/60 hover:bg-zinc-100 dark:hover:bg-zinc-950 transition"
            >
              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center mx-auto mb-2 text-amber-600 dark:text-amber-400 shadow-sm dark:shadow-none">
                <Upload className="w-6 h-6" />
              </div>
              <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {excelImportLoading
                  ? t('กำลังอ่านและประมวลผลไฟล์ Excel...', 'Reading and parsing Excel file...')
                  : t('คลิกเพื่อเลือกไฟล์ Excel (.xlsx / .csv) หรือลากไฟล์มาวางที่นี่', 'Click to select an Excel file (.xlsx / .csv) or drop it here')}
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                {t(
                  'คอลัมน์ที่รองรับ: รหัสพนักงาน, ชื่อ-นามสกุล, ชื่อเล่น, แผนก, หมายเลขโต๊ะ, กลุ่ม/บทบาท, เบอร์โทร',
                  'Supported columns: Employee ID, Full Name, Nickname, Department, Table Number, Group/Role, Phone'
                )}
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm dark:shadow-none">
            <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                {t(`รายชื่อพนักงานในระบบทั้งหมด (${roster.length} คน)`, `Total Employees in Roster (${roster.length})`)}
              </div>
            </div>

            {/* Mobile Card List for Roster */}
            <div className="md:hidden divide-y divide-zinc-200 dark:divide-zinc-800/80 max-h-[26rem] overflow-y-auto">
              {roster.map((emp) => (
                <div key={emp.id} className="p-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono font-bold text-amber-600 dark:text-amber-400">{emp.id}</span>
                    </div>
                    <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate mt-0.5">
                      {emp.fullName} {emp.nickname ? `(${emp.nickname})` : ''}
                    </div>
                    <div className="text-[11px] text-zinc-600 dark:text-zinc-400 truncate">
                      {emp.department} · {emp.groupRole || t('พนักงานทั่วไป', 'General Staff')}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-mono font-bold text-amber-700 dark:text-amber-300">
                      {emp.tableNumber}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table for Roster */}
            <div className="hidden md:block overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 text-[11px] font-semibold border-b border-zinc-200 dark:border-zinc-800 sticky top-0">
                  <tr>
                    <th className="py-2.5 px-4">{t('รหัสพนักงาน', 'Employee ID')}</th>
                    <th className="py-2.5 px-4">{t('ชื่อ - นามสกุล', 'Full Name')}</th>
                    <th className="py-2.5 px-4">{t('ชื่อเล่น', 'Nickname')}</th>
                    <th className="py-2.5 px-4">{t('แผนก', 'Department')}</th>
                    <th className="py-2.5 px-4">{t('หมายเลขโต๊ะที่จัดสรร', 'Assigned Table')}</th>
                    <th className="py-2.5 px-4">{t('กลุ่ม / บทบาท', 'Group / Role')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/80 text-zinc-700 dark:text-zinc-300">
                  {roster.map((emp) => (
                    <tr key={emp.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition">
                      <td className="py-2.5 px-4 font-mono font-bold text-amber-600 dark:text-amber-400">
                        {emp.id}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-zinc-900 dark:text-zinc-100">
                        {emp.fullName}
                      </td>
                      <td className="py-2.5 px-4 text-amber-700 dark:text-amber-300">
                        {emp.nickname || '-'}
                      </td>
                      <td className="py-2.5 px-4 text-zinc-600 dark:text-zinc-400">
                        {emp.department}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-amber-700 dark:text-amber-300 font-semibold">
                        {emp.tableNumber}
                      </td>
                      <td className="py-2.5 px-4 text-zinc-600 dark:text-zinc-400">
                        {emp.groupRole || t('พนักงานทั่วไป', 'General Staff')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 5: LUCKY DRAW WINNERS REPORT & EXCEL EXPORT
      ========================================================================= */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm dark:shadow-none">
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <span>{t(`รายงานประวัติการแจกรางวัล Lucky Draw (${luckyWinners.length} รางวัล)`, `Lucky Draw Winners Report (${luckyWinners.length} Prizes)`)}</span>
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                {t(
                  'บันทึกประวัติการสุ่มรางวัลย้อนหลังโดยละเอียด สามารถตรวจสอบและดาวน์โหลดเป็น Excel ได้ทันที',
                  'Detailed historical draw records ready to audit and export to Excel.'
                )}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                disabled={luckyWinners.length === 0}
                onClick={() => {
                  soundFX.playClick();
                  exportLuckyDrawReportToExcel(luckyWinners);
                }}
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{t('ส่งออกรายงานผู้ได้รางวัลเป็น Excel', 'Export Winners to Excel')}</span>
              </button>

              {luckyWinners.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    soundFX.playClick();
                    showConfirmDialog({
                      variant: 'danger',
                      title: t('ยืนยันการรีเซ็ตประวัติรางวัล', 'Reset All Lucky Draws?'),
                      message: t(
                        'คุณแน่ใจหรือไม่ว่าต้องการล้างประวัติการสุ่มรางวัลทั้งหมดและคืนสิทธิ์ให้ผู้เข้าร่วมงานทุกคน?',
                        'Are you sure you want to reset all Lucky Draw history and restore prize stock?'
                      ),
                      confirmText: t('รีเซ็ตทั้งหมด', 'Reset All'),
                      onConfirm: () => onResetAllLuckyDraws(),
                    });
                  }}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>{t('รีเซ็ตรางวัล', 'Reset Draws')}</span>
                </button>
              )}
            </div>
          </div>

          {/* Mobile Card View for Lucky Draw History */}
          <div className="md:hidden space-y-2.5">
            {luckyWinners.length > 0 ? (
              luckyWinners.map((w, index) => (
                <div
                  key={w.id}
                  className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center gap-3 shadow-sm dark:shadow-none"
                >
                  <div className="w-12 h-14 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-950 border border-amber-500/50 dark:border-amber-400/50 shrink-0">
                    {w.selfieUrl ? (
                      <img
                        src={w.selfieUrl}
                        alt={w.winnerName}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-amber-600 dark:text-amber-400 font-mono font-bold">
                        #{luckyWinners.length - index}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-amber-600 dark:text-amber-400 font-bold">
                      <span>#{luckyWinners.length - index}</span>
                      <span className="text-zinc-400 dark:text-zinc-600">·</span>
                      <span>{w.employeeId}</span>
                    </div>
                    <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                      {w.winnerName} {w.nickname ? `(${w.nickname})` : ''}
                    </div>
                    <div className="text-[11px] text-amber-700 dark:text-amber-300 truncate">
                      {w.prizeName} · {w.tableNumber}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.playClick();
                      showConfirmDialog({
                        variant: 'danger',
                        title: t('ยืนยันการยกเลิกผลรางวัล', 'Revoke Prize Result?'),
                        message: t(
                          `ต้องการยกเลิกผลรางวัลของ "${w.winnerName}" หรือไม่? (จะนำของรางวัลกลับเข้าสู่ระบบ)`,
                          `Revoke "${w.winnerName}"'s prize and return it to pool?`
                        ),
                        confirmText: t('ยกเลิกผลรางวัล', 'Revoke Prize'),
                        onConfirm: () => onDeleteLuckyWinner(w.id),
                      });
                    }}
                    className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/15 flex items-center justify-center transition cursor-pointer shrink-0"
                    title={t('สละสิทธิ์ / จับใหม่', 'Forfeit / Re-draw')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            ) : (
              <div className="p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center text-xs text-zinc-500">
                {t('ยังไม่มีประวัติการแจกรางวัลในระบบ', 'No Lucky Draw winners recorded yet.')}
              </div>
            )}
          </div>

          {/* Desktop Table View for Lucky Draw History */}
          <div className="hidden md:block rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm dark:shadow-none">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-50 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 text-[11px] font-semibold border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="py-3 px-4">{t('รอบ', 'Round')}</th>
                    <th className="py-3 px-4">{t('รางวัล', 'Prize')}</th>
                    <th className="py-3 px-4">{t('รูปภาพ', 'Photo')}</th>
                    <th className="py-3 px-4">{t('รหัสพนักงาน', 'Employee ID')}</th>
                    <th className="py-3 px-4">{t('ชื่อผู้โชคดี', 'Winner Name')}</th>
                    <th className="py-3 px-4">{t('แผนก', 'Department')}</th>
                    <th className="py-3 px-4">{t('หมายเลขโต๊ะ', 'Table')}</th>
                    <th className="py-3 px-4">{t('เวลาที่จับได้', 'Drawn At')}</th>
                    <th className="py-3 px-4 text-center">{t('จัดการ', 'Action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800/80 text-zinc-700 dark:text-zinc-300">
                  {luckyWinners.length > 0 ? (
                    luckyWinners.map((w, index) => (
                      <tr key={w.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition">
                        <td className="py-2.5 px-4 font-mono tabular-nums font-bold text-amber-600 dark:text-amber-400">
                          #{luckyWinners.length - index}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100">{w.prizeName}</div>
                          <div className="text-[11px] text-zinc-600 dark:text-zinc-400">{w.prizeTier}</div>
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="w-10 h-12 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-950 border border-amber-500/50 dark:border-amber-400/50">
                            {w.selfieUrl ? (
                              <img
                                src={w.selfieUrl}
                                alt={w.winnerName}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[9px] text-zinc-500">
                                -
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-4 font-mono font-bold text-amber-600 dark:text-amber-400">
                          {w.employeeId}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100">{w.winnerName}</div>
                          {w.nickname && (
                            <div className="text-[11px] text-amber-700 dark:text-amber-300">
                              ({w.nickname})
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-zinc-600 dark:text-zinc-400">{w.department}</td>
                        <td className="py-2.5 px-4 font-mono text-amber-700 dark:text-amber-300 font-semibold">
                          {w.tableNumber}
                        </td>
                        <td className="py-2.5 px-4 font-mono tabular-nums text-[11px] text-zinc-600 dark:text-zinc-400">
                          {new Date(w.wonAt).toLocaleTimeString(lang === 'en' ? 'en-US' : 'th-TH', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              soundFX.playClick();
                              showConfirmDialog({
                                variant: 'danger',
                                title: t('ยืนยันการยกเลิกผลรางวัล', 'Revoke Prize Result?'),
                                message: t(
                                  `ต้องการยกเลิกผลรางวัลของ "${w.winnerName}" หรือไม่? (จะนำของรางวัลกลับเข้าสู่ระบบ)`,
                                  `Revoke "${w.winnerName}"'s prize and return it to pool?`
                                ),
                                confirmText: t('ยกเลิกผลรางวัล', 'Revoke Prize'),
                                onConfirm: () => onDeleteLuckyWinner(w.id),
                              });
                            }}
                            className="p-2 rounded-lg text-zinc-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/15 transition cursor-pointer"
                            title={t('สละสิทธิ์ / จับใหม่', 'Forfeit / Re-draw')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-zinc-500">
                        {t('ยังไม่มีประวัติการแจกรางวัลในระบบ', 'No Lucky Draw winners recorded yet.')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 6: EVENT SETTINGS & START NEW PARTY (CUSTOMIZE FOR ANY EVENT)
      ========================================================================= */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {settingsSavedNotice && (
            <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 flex items-center justify-between animate-in fade-in duration-200">
              <div className="flex items-center gap-2 font-semibold text-xs">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{settingsSavedNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setSettingsSavedNotice(null)}
                className="text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-emerald-100 text-xs font-bold px-2 py-1 cursor-pointer"
              >
                {t('ปิด', 'Close')}
              </button>
            </div>
          )}

          {/* Quick Preset Templates */}
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm dark:shadow-none">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  {t('เทมเพลตตัวอย่างด่วน (Quick Presets)', 'Quick Event Presets')}
                </h3>
              </div>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {t('กดเพื่อเปลี่ยนข้อความตัวอย่างอัตโนมัติ', 'Click to auto-fill sample text')}
              </span>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-3">
              {t(
                'คลิกเทมเพลตด้านล่างเพื่อเติมข้อความตามประเภทงานเลี้ยง แล้วกดแก้ไขหรือกดบันทึกได้ทันที:',
                'Select a template below to pre-fill event details, then customize or save:'
              )}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={() =>
                  handleApplyPreset({
                    name: 'งานเลี้ยงสังสรรค์พนักงานประจำปี 2026',
                    subtitle: 'Together We Shine & Celebrate 2026',
                    venue: 'ห้อง Grand Ballroom โรงแรมพลาซ่า',
                    ticketTitle: 'OFFICIAL ANNUAL PARTY PASS',
                    regSubtitle: 'กรอกรหัสพนักงาน เบอร์โทรศัพท์ และอัปโหลดรูปภาพจากเครื่องเพื่อใช้แสดงผลรางวัล',
                  })
                }
                className="p-3 rounded-xl bg-fuchsia-50/70 dark:bg-[#0b051c] border border-fuchsia-200 dark:border-fuchsia-500/30 hover:border-fuchsia-500 text-left transition text-xs font-bold text-slate-900 dark:text-white cursor-pointer"
              >
                <div className="text-sm mb-0.5">{t('งานเลี้ยงประจำปี', 'Annual Party')}</div>
                <div className="text-[11px] text-slate-500 dark:text-purple-300 font-normal truncate">Annual Staff Party</div>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleApplyPreset({
                    name: 'งานเลี้ยงสังสรรค์ส่งท้ายปีเก่า ต้อนรับปีใหม่',
                    subtitle: 'Happy New Year Celebration & Lucky Night',
                    venue: 'ห้องจัดเลี้ยง ชั้น 3 สโมสรริมน้ำ',
                    ticketTitle: 'NEW YEAR CELEBRATION PASS',
                    regSubtitle: 'กรอกรหัสพนักงาน เบอร์โทรศัพท์ และอัปโหลดรูปภาพจากเครื่องเพื่อลุ้นรางวัล Lucky Draw',
                  })
                }
                className="p-3 rounded-xl bg-cyan-50/70 dark:bg-[#0b051c] border border-cyan-200 dark:border-cyan-500/30 hover:border-cyan-500 text-left transition text-xs font-bold text-slate-900 dark:text-white cursor-pointer"
              >
                <div className="text-sm mb-0.5">{t('งานฉลองปีใหม่', 'New Year Party')}</div>
                <div className="text-[11px] text-slate-500 dark:text-purple-300 font-normal truncate">New Year Party</div>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleApplyPreset({
                    name: 'งานเลี้ยงกระชับมิตร Company Outing & Dinner',
                    subtitle: 'Connecting People, Inspiring Future',
                    venue: 'ริมสระน้ำ / Beachfront Garden Resort',
                    ticketTitle: 'OUTING GALA DINNER PASS',
                    regSubtitle: 'กรอกรหัสพนักงาน เบอร์โทรศัพท์ และอัปโหลดรูปภาพจากเครื่องเพื่อดูหมายเลขโต๊ะ',
                  })
                }
                className="p-3 rounded-xl bg-emerald-50/70 dark:bg-[#0b051c] border border-emerald-200 dark:border-emerald-500/30 hover:border-emerald-500 text-left transition text-xs font-bold text-slate-900 dark:text-white cursor-pointer"
              >
                <div className="text-sm mb-0.5">{t('งาน Outing & กาล่า', 'Outing & Gala')}</div>
                <div className="text-[11px] text-slate-500 dark:text-purple-300 font-normal truncate">Outing Dinner</div>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleApplyPreset({
                    name: 'งานฉลองความสำเร็จและขอบคุณพนักงาน',
                    subtitle: 'Celebrating Excellence & Rewarding Success',
                    venue: 'ห้องประชุมอเนกประสงค์ อาคารสำนักงานใหญ่',
                    ticketTitle: 'AWARDS & APPRECIATION PASS',
                    regSubtitle: 'กรอกรหัสพนักงาน เบอร์โทรศัพท์ และอัปโหลดรูปภาพจากเครื่องเพื่อรับบัตรเข้างาน',
                  })
                }
                className="p-3 rounded-xl bg-amber-50/70 dark:bg-[#0b051c] border border-amber-200 dark:border-amber-500/30 hover:border-amber-500 text-left transition text-xs font-bold text-slate-900 dark:text-white cursor-pointer"
              >
                <div className="text-sm mb-0.5">{t('งานฉลองความสำเร็จ', 'Awards Night')}</div>
                <div className="text-[11px] text-slate-500 dark:text-purple-300 font-normal truncate">Awards &amp; Night</div>
              </button>
            </div>
          </div>

          {/* Settings Form */}
          <form onSubmit={handleSaveSettings} className="p-6 rounded-3xl bg-white/95 dark:bg-[#140a2b]/95 border-2 border-violet-200/80 dark:border-purple-500/30 space-y-5 shadow-md">
            <div className="flex items-center justify-between pb-3 border-b border-fuchsia-200/60 dark:border-purple-500/20">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-violet-600 dark:text-cyan-400" />
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {t('ปรับแต่งรายละเอียดงานเลี้ยง (Event Customization)', 'Event Customization')}
                </h3>
              </div>
              <span className="text-[11px] text-fuchsia-600 dark:text-amber-300 font-bold">
                {t('แอดมินกำหนดเองได้อิสระ', 'Fully customizable')}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  {t('ชื่องานเลี้ยง (Event Name)', 'Event Name')} <span className="text-rose-500 dark:text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={settingsName}
                  onChange={(e) => setSettingsName(e.target.value)}
                  placeholder={t('เช่น งานเลี้ยงพนักงานบริษัทประจำปี 2026...', 'e.g. Annual Company Celebration 2026...')}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 focus:border-amber-500 dark:focus:border-amber-400 focus:outline-none text-sm font-bold text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-950"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  {t('คำโปรย หรือสโลแกนงาน (Slogan / Subtitle)', 'Slogan / Subtitle')}
                </label>
                <input
                  type="text"
                  value={settingsSubtitle}
                  onChange={(e) => setSettingsSubtitle(e.target.value)}
                  placeholder="Together We Shine 2026..."
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 focus:border-amber-500 dark:focus:border-amber-400 focus:outline-none text-xs text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-950"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  {t('วันที่ & เวลาจัดงาน (Event Date & Time)', 'Event Date & Time')}
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    value={settingsDate}
                    onChange={(e) => setSettingsDate(e.target.value)}
                    placeholder={t('เช่น วันศุกร์ที่ 19 ธันวาคม 2569 เวลา 18:00 น.', 'e.g. Friday Dec 19, 2026 · 6:00 PM')}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 focus:border-amber-500 dark:focus:border-amber-400 focus:outline-none text-xs text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-950"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  {t('สถานที่จัดงาน / ห้องจัดเลี้ยง (Venue & Room)', 'Venue & Room')}
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-amber-600 dark:text-amber-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    value={settingsVenue}
                    onChange={(e) => setSettingsVenue(e.target.value)}
                    placeholder={t('เช่น ห้อง Grand Ballroom ชั้น 2 โรงแรมพลาซ่า', 'e.g. Grand Ballroom, 2nd Floor')}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 focus:border-amber-500 dark:focus:border-amber-400 focus:outline-none text-xs text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-950"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  {t('ช่องทางติดต่อทีมงาน / จุดช่วยเหลือ (Helpdesk)', 'Helpdesk / Organizer Contact')}
                </label>
                <input
                  type="text"
                  value={settingsContact}
                  onChange={(e) => setSettingsContact(e.target.value)}
                  placeholder={t('เช่น ฝ่ายบุคคล (HR) หรือ จุดลงทะเบียนหน้าประตู', 'e.g. HR Desk or Main Entrance')}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 focus:border-amber-500 dark:focus:border-amber-400 focus:outline-none text-xs text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-950"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  {t('ข้อความหัวบัตรเข้างาน (Digital Pass Header)', 'Digital Pass Header')}
                </label>
                <input
                  type="text"
                  value={settingsTicketTitle}
                  onChange={(e) => setSettingsTicketTitle(e.target.value)}
                  placeholder="OFFICIAL PARTY PASS & TABLE PASS"
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 focus:border-amber-500 dark:focus:border-amber-400 focus:outline-none text-xs font-mono text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-950"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  {t('คำแนะนำหน้าลงทะเบียน (Registration Subtitle)', 'Registration Subtitle')}
                </label>
                <input
                  type="text"
                  value={settingsRegSubtitle}
                  onChange={(e) => setSettingsRegSubtitle(e.target.value)}
                  placeholder={t('กรอกรหัสพนักงาน เบอร์โทรศัพท์ และอัปโหลดรูปภาพจากเครื่องเพื่อใช้แสดงผลรางวัล', 'Enter Employee ID, Phone & Upload Photo to check in')}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 focus:border-amber-500 dark:focus:border-amber-400 focus:outline-none text-xs text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-950"
                />
              </div>
            </div>

            {/* Live Preview Box */}
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
              <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 mb-2">
                {t('ตัวอย่างการแสดงผลบนหน้าจอพนักงาน (Live Preview):', 'Live Attendee Preview:')}
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    {settingsName || t('ชื่องานเลี้ยง', 'Event Name')}
                  </div>
                  <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                    {settingsSubtitle || t('คำโปรยงาน', 'Event Subtitle')}
                  </div>
                  <div className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5">
                    {settingsVenue} · {settingsDate}
                  </div>
                </div>
                <span className="text-[10px] font-mono text-amber-700 dark:text-amber-300 font-bold shrink-0">
                  {settingsTicketTitle || 'PARTY PASS'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                className="min-h-[48px] px-6 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs flex items-center gap-2 transition active:scale-95 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{t('บันทึกการเปลี่ยนแปลงทั้งหมด', 'Save All Changes')}</span>
              </button>
            </div>
          </form>

          {/* REUSABILITY ZONE */}
          <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4 shadow-sm dark:shadow-none">
            <div className="flex items-center gap-2 pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <AlertTriangle className="w-5 h-5 text-rose-500 dark:text-rose-400" />
              <div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {t('เครื่องมือสลับงานเลี้ยง & รีเซ็ตระบบ (Switch Event & Reset Tools)', 'Switch Event & Reset Tools')}
                </h3>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                  {t(
                    'สำหรับนำระบบนี้ไปใช้กับงานเลี้ยงถัดไป หรือเคลียร์ข้อมูลเพื่อเริ่มงานจริง',
                    'Reuse this app for another event or clear test records before go-live.'
                  )}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-xs mb-1">
                    <RotateCcw className="w-4 h-4" />
                    <span>{t('1. ล้างเฉพาะผู้ลงทะเบียน & ประวัติ Lucky Draw', '1. Clear Registrations & Draw History')}</span>
                  </div>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mb-4 leading-relaxed">
                    {t(
                      'ลบข้อมูลผู้ที่เช็คอินเข้างานและผลการแจกรางวัลทั้งหมด แต่ยังคงรายชื่อพนักงานจากไฟล์ Excel และรายการของรางวัลไว้ตามเดิม',
                      'Removes all check-ins and draw history while keeping your Excel roster and prize list intact.'
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleConfirmClearRegistrations}
                  className="min-h-[44px] w-full px-4 py-2 rounded-xl bg-white dark:bg-zinc-900 hover:bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t(`ล้างเฉพาะผู้ลงทะเบียน (${registrations.length} คน)`, `Clear Check-ins Only (${registrations.length})`)}</span>
                </button>
              </div>

              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-xs mb-1">
                    <Sparkles className="w-4 h-4" />
                    <span>{t('2. เริ่มต้นจัดงานเลี้ยงใหม่ทั้งหมด (Start New Event)', '2. Start Brand-New Event')}</span>
                  </div>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mb-4 leading-relaxed">
                    {t(
                      'สร้างงานเลี้ยงใหม่ ตั้งชื่องานใหม่ พร้อมเลือกว่าจะล้างหรือเก็บรายชื่อพนักงานและของรางวัลไว้สำหรับงานครั้งถัดไป',
                      'Create a fresh event with a new name and choose whether to reset or keep roster and prizes.'
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setNewPartyName(settingsName);
                    setIsNewPartyModalOpen(true);
                  }}
                  className="min-h-[44px] w-full px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t('เริ่มต้นจัดงานเลี้ยงใหม่', 'Start New Event')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* START NEW PARTY MODAL */}
      {isNewPartyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl relative animate-in zoom-in-95 duration-200 space-y-4">
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <Sparkles className="w-6 h-6" />
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {t('เริ่มต้นจัดงานเลี้ยงใหม่ (Start New Event)', 'Start New Event')}
              </h3>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {t(
                'ระบบจะทำการล้างข้อมูลการลงทะเบียนและผล Lucky Draw เดิมทั้งหมด และเปิดระบบรับลงทะเบียนใหม่สำหรับงานเลี้ยงนี้',
                'This will clear existing check-ins and Lucky Draw winners and open registration for your new event.'
              )}
            </p>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                {t('ชื่องานเลี้ยงใหม่', 'New Event Name')}
              </label>
              <input
                type="text"
                value={newPartyName}
                onChange={(e) => setNewPartyName(e.target.value)}
                placeholder={t('ระบุชื่องานเลี้ยงใหม่ เช่น งานเลี้ยงพนักงานส่งท้ายปี 2026', 'e.g. Year-End Celebration 2026')}
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-sm font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500 dark:focus:border-amber-400"
              />
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-3">
              <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                {t('ตัวเลือกเพิ่มเติม:', 'Additional Options:')}
              </div>
              <label className="flex items-start gap-2.5 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newPartyClearRoster}
                  onChange={(e) => setNewPartyClearRoster(e.target.checked)}
                  className="mt-0.5 rounded text-amber-400 focus:ring-amber-400 w-4 h-4 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700"
                />
                <div>
                  <span className="font-bold">{t('ล้างรายชื่อพนักงานเดิมออกทั้งหมด', 'Clear existing employee roster')}</span>
                  <p className="text-[11px] text-zinc-500">
                    {t(
                      'เลือกข้อนี้หากต้องการนำเข้าไฟล์ Excel รายชื่อพนักงานชุดใหม่สำหรับงานนี้',
                      'Check this if you plan to upload a fresh Excel employee list.'
                    )}
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-2.5 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newPartyClearPrizes}
                  onChange={(e) => setNewPartyClearPrizes(e.target.checked)}
                  className="mt-0.5 rounded text-amber-400 focus:ring-amber-400 w-4 h-4 bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700"
                />
                <div>
                  <span className="font-bold">{t('ล้างรายการของรางวัลเดิมทั้งหมด', 'Clear existing prizes')}</span>
                  <p className="text-[11px] text-zinc-500">
                    {t(
                      'เลือกข้อนี้หากต้องการกำหนดรายการของรางวัลใหม่ทั้งหมดตั้งแต่ต้น',
                      'Check this if you want to set up brand-new prizes from scratch.'
                    )}
                  </p>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsNewPartyModalOpen(false)}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold cursor-pointer"
              >
                {t('ยกเลิก', 'Cancel')}
              </button>
              <button
                type="button"
                onClick={handleConfirmNewParty}
                className="min-h-[44px] px-6 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-bold cursor-pointer active:scale-95 transition"
              >
                {t('ยืนยันเริ่มงานเลี้ยงใหม่', 'Confirm Start New Event')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WINNER REVEAL MODAL */}
      {latestWinnerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 dark:bg-[#050212]/85 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#140a2b] border-2 border-fuchsia-400 dark:border-cyan-400/70 p-6 shadow-2xl text-center relative overflow-hidden animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-fuchsia-500 via-amber-400 to-cyan-400" />
            <div className="inline-flex items-center gap-1.5 text-xs font-extrabold bg-gradient-to-r from-fuchsia-600 to-amber-500 dark:from-fuchsia-300 dark:to-amber-300 bg-clip-text text-transparent mb-2 pt-1 uppercase">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>{t('ขอแสดงความยินดีกับผู้โชคดี', 'Congratulations to Our Winner')}</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mb-0.5">
              {latestWinnerModal.prizeName}
            </h3>
            <p className="text-xs text-slate-600 dark:text-purple-200 font-semibold mb-4">
              {latestWinnerModal.prizeTier}
            </p>

            {/* Winner's Uploaded Photo Prominently Shown */}
            <div className="w-32 h-40 mx-auto rounded-2xl overflow-hidden border-4 border-fuchsia-500 dark:border-cyan-400 shadow-xl shadow-fuchsia-500/25 bg-slate-100 dark:bg-[#0b051c] mb-4">
              {latestWinnerModal.selfieUrl ? (
                <img
                  src={latestWinnerModal.selfieUrl}
                  alt={latestWinnerModal.winnerName}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">
                  {t('ไม่มีรูปภาพ', 'No Photo')}
                </div>
              )}
            </div>

            <div className="text-xs font-mono font-extrabold text-fuchsia-600 dark:text-cyan-300">
              {latestWinnerModal.employeeId}
            </div>
            <h4 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
              {latestWinnerModal.winnerName}
            </h4>
            {latestWinnerModal.nickname && (
              <p className="text-sm font-bold text-amber-600 dark:text-amber-300">
                ({latestWinnerModal.nickname})
              </p>
            )}
            <p className="text-xs text-slate-600 dark:text-purple-200/80 mt-1">
              {t('แผนก', 'Dept.')} {latestWinnerModal.department}
            </p>

            <div className="mt-4 p-3 rounded-2xl bg-gradient-to-r from-amber-50 via-fuchsia-50 to-cyan-50 dark:from-[#0b051c] dark:via-[#1e0f42] dark:to-[#0b051c] border-2 border-amber-300/70 dark:border-amber-400/50 text-fuchsia-700 dark:text-amber-300 font-extrabold text-base">
              {t('โต๊ะประจำ:', 'Table:')} {latestWinnerModal.tableNumber}
            </div>

            {/* 60-Second Claim Countdown & Re-Draw Actions right inside Winner Modal */}
            <div className="mt-4 space-y-2">
              {claimSecondsLeft !== null && config.claimCountdownWinnerId === latestWinnerModal.id ? (
                <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-400/50 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-left">
                    <Timer className={`w-5 h-5 ${claimSecondsLeft <= 10 ? 'text-rose-500 animate-spin' : 'text-cyan-600 dark:text-cyan-300'}`} />
                    <div>
                      <div className="text-[11px] font-bold text-slate-600 dark:text-purple-200">
                        {t('กำลังนับถอยหลังหน้า LIVE', 'LIVE Countdown Active')}
                      </div>
                      <div className={`text-lg font-black font-mono tabular-nums ${claimSecondsLeft <= 10 ? 'text-rose-600 dark:text-rose-400' : 'text-cyan-700 dark:text-cyan-300'}`}>
                        {claimSecondsLeft}s
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleStopClaimCountdown}
                    className="min-h-[40px] px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>{t('หยุดเวลาเค้าดาวน์', 'Stop Timer')}</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleStartClaimCountdown(latestWinnerModal)}
                  className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md active:scale-95 transition cursor-pointer"
                >
                  <Timer className="w-4 h-4" />
                  <span>{t('เริ่มนับถอยหลัง 60 วินาที (แสดงที่หน้า LIVE)', 'Start 60s Countdown on LIVE')}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  soundFX.playClick();
                  const target = latestWinnerModal;
                  if (!target) return;
                  showConfirmDialog({
                    variant: 'danger',
                    title: t('ยืนยันการตัดสิทธิ์ & เปิดสิทธิ์ผู้บริหารจับใหม่', 'Confirm Forfeit & Unlock VIP Re-Draw'),
                    message: t(
                      `ต้องการตัดสิทธิ์ "${target.winnerName}" ถาวร คืนรางวัล "${target.prizeName}" และเปิดสิทธิ์ให้ผู้บริหารกดปุ่มจับรางวัลใหม่เองหรือไม่?`,
                      `Permanently disqualify "${target.winnerName}", restore "${target.prizeName}", and unlock VIP Executive button for re-draw?`
                    ),
                    confirmText: t('ตัดสิทธิ์ & เปิดสิทธิ์ผู้บริหาร', 'Forfeit & Unlock VIP'),
                    onConfirm: () => handleConfirmForfeitAndRedraw(target),
                  });
                }}
                className="w-full min-h-[42px] py-2 px-4 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 border border-amber-400/50 font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>{t('สละสิทธิ์ / ผิดกติกา & เปิดสิทธิ์ผู้บริหารจับใหม่', 'Forfeit & Unlock VIP Re-Draw')}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                soundFX.playClick();
                setLatestWinnerModal(null);
              }}
              className="mt-3 w-full min-h-[48px] py-2.5 px-4 rounded-xl bg-gradient-to-r from-fuchsia-600 via-rose-500 to-amber-500 hover:from-fuchsia-500 hover:via-rose-400 hover:to-amber-400 text-white font-extrabold text-sm shadow-lg shadow-fuchsia-500/30 active:scale-95 transition cursor-pointer"
            >
              {t('ตกลงและปิดหน้าต่าง', 'Confirm & Close')}
            </button>
          </div>
        </div>
      )}

      {/* 60-SECOND COUNTDOWN EXPIRED CONFIRMATION POPUP */}
      {expiredWinnerPrompt && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 dark:bg-[#050212]/90 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#140a2b] border-2 border-rose-500 dark:border-rose-400 p-6 shadow-2xl text-center relative overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-rose-500 via-orange-500 to-amber-400" />
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center mx-auto mb-3 text-white shadow-lg shadow-rose-500/30">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="text-xs font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-1">
              {t('หมดเวลา 60 วินาทีแล้ว!', '60-SECOND COUNTDOWN EXPIRED')}
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white">
              {t('ไม่มีผู้มารับรางวัลตามเวลาที่กำหนด', 'Winner Did Not Claim Prize in Time')}
            </h3>

            <div className="my-4 p-3.5 rounded-2xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-300/70 dark:border-rose-500/40 flex items-center gap-3 text-left">
              <div className="w-12 h-14 rounded-xl overflow-hidden border-2 border-rose-400 bg-zinc-200 dark:bg-zinc-900 shrink-0">
                {expiredWinnerPrompt.selfieUrl ? (
                  <img
                    src={expiredWinnerPrompt.selfieUrl}
                    alt={expiredWinnerPrompt.winnerName}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-zinc-500">?</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-mono font-bold text-rose-600 dark:text-rose-300">
                  {expiredWinnerPrompt.employeeId}
                </div>
                <div className="text-sm font-black text-slate-900 dark:text-white truncate">
                  {expiredWinnerPrompt.winnerName}
                </div>
                <div className="text-xs text-slate-600 dark:text-purple-200 truncate">
                  {expiredWinnerPrompt.prizeName} · {expiredWinnerPrompt.tableNumber}
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-purple-200/80 leading-relaxed mb-5">
              {t(
                'กดยืนยันด้านล่างเพื่อนำรายชื่อผู้ที่จับได้แล้วไม่มารับรางวัลออก (ตัดสิทธิ์ไม่ให้ลุ้นรางวัลอีกตลอดงาน) คืนรางวัลเดิม และเปิดสิทธิ์ให้ผู้บริหารกดปุ่มจับรางวัลใหม่เอง',
                'Confirm below to remove this winner, permanently disqualify them from remaining draws, restore the prize, and unlock the VIP Executive button for the replacement draw.'
              )}
            </p>

            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => handleConfirmForfeitAndRedraw(expiredWinnerPrompt)}
                className="w-full min-h-[50px] py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 via-orange-500 to-amber-500 hover:brightness-110 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-rose-500/30 flex items-center justify-center gap-2 active:scale-95 transition cursor-pointer"
              >
                <Ban className="w-4 h-4 shrink-0" />
                <span>
                  {t(
                    'ยืนยัน: ตัดสิทธิ์ออก & เปิดสิทธิ์ผู้บริหารจับใหม่',
                    'Confirm: Disqualify & Unlock VIP Re-Draw'
                  )}
                </span>
              </button>

              <button
                type="button"
                onClick={handleStopClaimCountdown}
                className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-300 border border-emerald-400/50 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {t(
                    'ผู้โชคดีมาแสดงตัวรับรางวัลแล้ว (หยุดเวลา & ปิด)',
                    'Winner Claimed Prize (Stop Timer & Close)'
                  )}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRIZE CRUD MODAL */}
      <PrizeManagerModal
        isOpen={isPrizeModalOpen}
        onClose={() => setIsPrizeModalOpen(false)}
        prizeToEdit={editingPrize}
        onSave={handleSavePrize}
        onDelete={handleDeletePrize}
      />

      {/* FAIR-CHANCE FILTERING NUMPAD PIN MODAL (PIN: 25102612) */}
      <NumpadPinModal
        isOpen={isFairChancePinModalOpen}
        onClose={() => setIsFairChancePinModalOpen(false)}
        onSuccess={() => {
          setIsFairChancePinModalOpen(false);
          setIsFairChanceUnlocked(true);
        }}
        expectedPin="25102612"
        title={t('ปลดล็อคการคัดกรองสิทธิ์', 'Unlock Fair-Chance Filter')}
        subtitle={t(
          'กดรหัส PIN 8 หลักเพื่อแสดงเมนูการคัดกรอง & บล็อคกลุ่ม',
          'Enter 8-digit PIN to show fair-chance filtering & group blocks'
        )}
        icon={<ShieldAlert className="w-6 h-6" />}
      />

      {/* STYLED SYSTEM ALERT & CONFIRM DIALOG */}
      <PartyDialogModal
        dialog={dialog}
        onClose={() => setDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
