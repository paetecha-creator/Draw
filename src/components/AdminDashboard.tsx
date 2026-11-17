import React, { useState, useMemo, useRef } from 'react';
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
  onResetAllLuckyDraws: () => void;
  onClearRegistrations?: () => void;
  onStartNewParty?: (newConfig?: Partial<PartyConfig>, options?: { clearRoster?: boolean; clearPrizes?: boolean }) => void;
  onLogout: () => void;
  onOpenVipView?: () => void;
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
  onResetAllLuckyDraws,
  onClearRegistrations,
  onStartNewParty,
  onLogout,
  onOpenVipView,
  onSwitchToUserView,
}) => {
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
  const [drawShufflingCandidate, setDrawShufflingCandidate] = useState<AttendeeRegistration | null>(null);
  const [latestWinnerModal, setLatestWinnerModal] = useState<LuckyDrawRecord | null>(null);
  const [soundMuted, setSoundMuted] = useState(soundFX.getMuted());
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
    config.registrationSubtitle || 'กรอกรหัสพนักงาน เบอร์โทรศัพท์ และถ่ายรูปเซลฟี่เพื่อยืนยันตัวตน'
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
      config.registrationSubtitle || 'กรอกรหัสพนักงาน เบอร์โทรศัพท์ และถ่ายรูปเซลฟี่เพื่อยืนยันตัวตน'
    );
  }, [config]);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    soundFX.playCelebrationChime();
    onUpdateConfig({
      ...config,
      eventName: settingsName.trim() || 'งานเลี้ยงสังสรรค์ (Party Celebration)',
      eventSubtitle: settingsSubtitle.trim(),
      eventDate: settingsDate.trim(),
      eventVenue: settingsVenue.trim(),
      eventContact: settingsContact.trim(),
      ticketTitle: settingsTicketTitle.trim() || 'OFFICIAL PARTY PASS & TABLE PASS',
      registrationSubtitle:
        settingsRegSubtitle.trim() || 'กรอกรหัสพนักงาน เบอร์โทรศัพท์ และถ่ายรูปเซลฟี่เพื่อยืนยันตัวตน',
    });
    setSettingsSavedNotice('บันทึกรายละเอียดงานเลี้ยงสำเร็จแล้ว ข้อมูลจะอัปเดตทุกหน้าจอทันที');
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
    if (confirm('คุณแน่ใจหรือไม่ว่าต้องการล้างข้อมูลผู้ลงทะเบียนและประวัติการสุ่มรางวัลทั้งหมดสำหรับงานนี้? (รายชื่อพนักงานใน Excel และของรางวัลจะยังคงอยู่)')) {
      soundFX.playClick();
      if (onClearRegistrations) {
        onClearRegistrations();
      }
      setSettingsSavedNotice('ล้างข้อมูลผู้ลงทะเบียนและประวัติ Lucky Draw เรียบร้อยแล้ว');
      setTimeout(() => setSettingsSavedNotice(null), 4000);
    }
  };

  const handleConfirmNewParty = () => {
    soundFX.playCelebrationChime();
    if (onStartNewParty) {
      onStartNewParty(
        {
          eventName: newPartyName.trim() || settingsName.trim() || 'งานเลี้ยงสังสรรค์ (Party Celebration)',
          eventSubtitle: settingsSubtitle.trim(),
          eventDate: settingsDate.trim(),
          eventVenue: settingsVenue.trim(),
          eventContact: settingsContact.trim(),
          ticketTitle: settingsTicketTitle.trim() || 'OFFICIAL PARTY PASS & TABLE PASS',
          registrationSubtitle:
            settingsRegSubtitle.trim() || 'กรอกรหัสพนักงาน เบอร์โทรศัพท์ และถ่ายรูปเซลฟี่เพื่อยืนยันตัวตน',
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
    setSettingsSavedNotice('เริ่มต้นงานเลี้ยงใหม่เรียบร้อยแล้ว ระบบเปิดรับลงทะเบียนใหม่พร้อมใช้งาน');
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
    onUpdateConfig({
      ...config,
      isRegistrationOpen: !config.isRegistrationOpen,
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
        throw new Error('ไม่พบข้อมูลพนักงานที่ถูกต้องในไฟล์');
      }

      onUpdateRoster(newRoster);
      soundFX.playCelebrationChime();
      setExcelImportMessage({
        type: 'success',
        text: `นำเข้าข้อมูลพนักงานสำเร็จจำนวน ${newRoster.length} รายการเรียบร้อยแล้ว`,
      });
    } catch (err: unknown) {
      console.error(err);
      setExcelImportMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการอ่านไฟล์ Excel',
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
    return new Set(luckyWinners.map((w) => w.employeeId.toUpperCase()));
  }, [luckyWinners]);

  const blockedGroupSet = useMemo(() => {
    return new Set(config.blockedGroups || []);
  }, [config.blockedGroups]);

  const eligibleCandidates = useMemo(() => {
    return registrations.filter((att) => {
      const empId = att.employeeId.toUpperCase();

      if (config.autoBlockPreviousWinners && wonEmployeeIds.has(empId)) {
        return false;
      }
      if (att.groupRole && blockedGroupSet.has(att.groupRole)) {
        return false;
      }
      if (att.isBlockedFromDraw) {
        return false;
      }

      const rosterItem = roster.find((r) => r.id.toUpperCase() === empId);
      if (rosterItem?.isBlockedFromDraw) {
        return false;
      }
      if (rosterItem?.groupRole && blockedGroupSet.has(rosterItem.groupRole)) {
        return false;
      }

      return true;
    });
  }, [registrations, wonEmployeeIds, blockedGroupSet, config.autoBlockPreviousWinners, roster]);

  const currentPrize = useMemo(() => {
    return prizes.find((p) => p.id === selectedPrizeId) || prizes[0];
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

  const handleToggleVipTrigger = () => {
    soundFX.playClick();
    const nextState = !config.isVipTriggerActive;
    onUpdateConfig({
      ...config,
      isVipTriggerActive: nextState,
      vipActivePrizeId: selectedPrizeId,
    });
  };

  const executeDraw = (targetPrize: Prize) => {
    if (!targetPrize) {
      alert('กรุณาเลือกรางวัลที่จะทำการสุ่มจับ');
      return;
    }

    if (targetPrize.remaining <= 0) {
      alert(`รางวัล "${targetPrize.name}" ถูกแจกครบตามจำนวนแล้ว`);
      return;
    }

    if (eligibleCandidates.length === 0) {
      alert('ไม่มีผู้มีสิทธิ์ลุ้นรางวัลที่ตรงตามเงื่อนไข (อาจแจกครบทุกคนแล้ว หรือติดเงื่อนไขการบล็อค)');
      return;
    }

    setIsDrawing(true);
    setLatestWinnerModal(null);

    const stopDrumroll = soundFX.startDrumroll();

    let shuffleCount = 0;
    const maxShuffles = 35;
    const shuffleInterval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * eligibleCandidates.length);
      setDrawShufflingCandidate(eligibleCandidates[randomIndex]);
      shuffleCount++;

      if (shuffleCount >= maxShuffles) {
        clearInterval(shuffleInterval);
        stopDrumroll();

        const finalWinnerIndex = Math.floor(Math.random() * eligibleCandidates.length);
        const winnerAttendee = eligibleCandidates[finalWinnerIndex];

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

        onAddLuckyWinner(winnerRecord);
        setIsDrawing(false);
        setLatestWinnerModal(winnerRecord);

        soundFX.playWinnerFanfare();
        confetti({
          particleCount: 150,
          spread: 90,
          origin: { y: 0.5 },
          colors: ['#fbbf24', '#f59e0b', '#34d399', '#818cf8', '#f472b6'],
        });
      }
    }, 70);
  };

  const handleStartLuckyDraw = () => {
    executeDraw(currentPrize);
  };

  return (
    <div className="w-full max-w-6xl mx-auto pb-16">
      {/* Top Admin Control Bar - Dark Theme */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
            <span className="font-semibold text-amber-400">Admin Console</span>
            <span aria-hidden="true">·</span>
            {isEditingEventName ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={tempEventName}
                  onChange={(e) => setTempEventName(e.target.value)}
                  placeholder="ระบุชื่องานเลี้ยง..."
                  className="px-2.5 py-1 text-xs font-semibold bg-zinc-950 border border-amber-400/60 rounded-lg text-zinc-100 focus:outline-none"
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
                  className="px-2.5 py-1 text-[11px] font-bold bg-amber-400 text-zinc-950 rounded-lg hover:bg-amber-300 cursor-pointer"
                >
                  บันทึก
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTempEventName(config.eventName);
                    setIsEditingEventName(false);
                  }}
                  className="px-2 py-1 text-[11px] text-zinc-400 hover:text-zinc-200 cursor-pointer"
                >
                  ยกเลิก
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-zinc-300 font-medium">
                <span>{config.eventName}</span>
                <button
                  type="button"
                  onClick={() => {
                    setTempEventName(config.eventName);
                    setIsEditingEventName(true);
                  }}
                  className="text-amber-400 hover:text-amber-300 p-1 rounded cursor-pointer"
                  title="เปลี่ยนชื่องานเลี้ยง"
                >
                  <Edit className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-zinc-100 mt-1">
            แดชบอร์ดบริหารจัดการงานเลี้ยง &amp; Lucky Draw
          </h2>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleToggleSound}
            className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-zinc-950 text-zinc-200 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-center transition cursor-pointer"
            title={soundMuted ? 'เปิดเสียง' : 'ปิดเสียง'}
          >
            {soundMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          <button
            type="button"
            onClick={handleToggleRegistration}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition active:scale-95 cursor-pointer border ${
              config.isRegistrationOpen
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                : 'bg-rose-500/15 text-rose-300 border-rose-500/30 hover:bg-rose-500/25'
            }`}
          >
            {config.isRegistrationOpen ? (
              <>
                <ToggleRight className="w-5 h-5 text-emerald-400" />
                <span>สถานะ: เปิดรับลงทะเบียน</span>
              </>
            ) : (
              <>
                <ToggleLeft className="w-5 h-5 text-rose-400" />
                <span>สถานะ: ปิดระบบแล้ว</span>
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
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold border border-zinc-800 flex items-center gap-1.5 transition cursor-pointer"
              title="สลับไปดูหน้าจอลงทะเบียน / บัตรเข้างาน / ผลรางวัลของผู้ร่วมงาน"
            >
              <Eye className="w-3.5 h-3.5 text-amber-400" />
              <span>ดูหน้าจอผู้ร่วมงาน</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              soundFX.playClick();
              onLogout();
            }}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 flex items-center gap-1.5 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS - Dark Obsidian Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-semibold mb-1">
            <span>รายชื่อในไฟล์ Excel</span>
            <Users className="w-4 h-4 text-zinc-400" />
          </div>
          <div className="text-2xl font-bold text-zinc-100 font-mono tabular-nums">
            {roster.length} <span className="text-xs font-normal text-zinc-400 font-sans">คน</span>
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            ฐานข้อมูลจัดโต๊ะพนักงาน
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center justify-between text-emerald-400 text-xs font-semibold mb-1">
            <span>ลงทะเบียนเข้างานแล้ว</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-300 font-mono tabular-nums">
            {registrations.length} <span className="text-xs font-normal text-zinc-400 font-sans">คน</span>
          </div>
          <div className="text-[11px] text-zinc-500 mt-1 font-mono tabular-nums">
            คิดเป็น {roster.length > 0 ? Math.round((registrations.length / roster.length) * 100) : 0}% ของทั้งหมด
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center justify-between text-amber-400 text-xs font-semibold mb-1">
            <span>ผู้มีสิทธิ์ลุ้น Lucky Draw</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-300 font-mono tabular-nums">
            {eligibleCandidates.length} <span className="text-xs font-normal text-zinc-400 font-sans">คน</span>
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            เฉพาะผู้ลงทะเบียนและไม่ติดบล็อค
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
          <div className="flex items-center justify-between text-indigo-400 text-xs font-semibold mb-1">
            <span>แจกรางวัลสำเร็จแล้ว</span>
            <Trophy className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-indigo-300 font-mono tabular-nums">
            {luckyWinners.length} <span className="text-xs font-normal text-zinc-400 font-sans">รางวัล</span>
          </div>
          <div className="text-[11px] text-zinc-500 mt-1 font-mono tabular-nums">
            เหลืออีก {prizes.reduce((acc, p) => acc + p.remaining, 0)} รางวัล
          </div>
        </div>
      </div>

      {/* Admin Navigation Tabs - Segmented Dark Control */}
      <div className="flex items-center gap-1.5 p-1.5 bg-zinc-900 border border-zinc-800 rounded-2xl mb-6 overflow-x-auto">
        <button
          type="button"
          onClick={() => {
            soundFX.playClick();
            setActiveTab('luckydraw');
          }}
          className={`min-h-[44px] px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 whitespace-nowrap shrink-0 transition cursor-pointer ${
            activeTab === 'luckydraw'
              ? 'bg-amber-400 text-zinc-950'
              : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>เวทีสุ่ม Lucky Draw &amp; รีโมทผู้บริหาร</span>
        </button>

        <button
          type="button"
          onClick={() => {
            soundFX.playClick();
            setActiveTab('prizes');
          }}
          className={`min-h-[44px] px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 whitespace-nowrap shrink-0 transition cursor-pointer ${
            activeTab === 'prizes'
              ? 'bg-amber-400 text-zinc-950'
              : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
          }`}
        >
          <Gift className="w-4 h-4" />
          <span>จัดการของรางวัล &amp; แนบรูป ({prizes.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            soundFX.playClick();
            setActiveTab('overview');
          }}
          className={`min-h-[44px] px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 whitespace-nowrap shrink-0 transition cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-amber-400 text-zinc-950'
              : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>รายชื่อผู้ลงทะเบียน ({registrations.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            soundFX.playClick();
            setActiveTab('roster');
          }}
          className={`min-h-[44px] px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 whitespace-nowrap shrink-0 transition cursor-pointer ${
            activeTab === 'roster'
              ? 'bg-amber-400 text-zinc-950'
              : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>นำเข้าข้อมูล Excel ({roster.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            soundFX.playClick();
            setActiveTab('history');
          }}
          className={`min-h-[44px] px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 whitespace-nowrap shrink-0 transition cursor-pointer ${
            activeTab === 'history'
              ? 'bg-amber-400 text-zinc-950'
              : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>รายงานผลสุ่มรางวัล ({luckyWinners.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            soundFX.playClick();
            setActiveTab('settings');
          }}
          className={`min-h-[44px] px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 whitespace-nowrap shrink-0 transition cursor-pointer ${
            activeTab === 'settings'
              ? 'bg-amber-400 text-zinc-950'
              : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>ตั้งค่างานเลี้ยง &amp; สลับงานใหม่</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: LUCKY DRAW ARENA & VIP EXECUTIVE REMOTE CONTROLLER
      ========================================================================= */}
      {activeTab === 'luckydraw' && (
        <div className="space-y-6">
          {/* VIP EXECUTIVE REMOTE LINK & TRIGGER */}
          <div className="p-5 sm:p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-lg">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Crown className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-amber-400 mb-0.5">
                    ระบบรีโมทสำหรับผู้บริหาร (VIP Executive Remote)
                  </div>
                  <h3 className="text-lg font-bold text-zinc-100">
                    แชร์ลิงก์ให้ผู้บริหารกดปุ่ม &quot;LUCKY DRAW&quot; ได้โดยตรงจากมือถือ
                  </h3>
                  <p className="text-xs text-zinc-400">
                    ผู้บริหารไม่ต้องล็อกอิน โดยแอดมินจะต้องกดเปิดปุ่มทุกครั้งที่จะให้กดในแต่ละรอบ
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyVipLink}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-zinc-100 border border-zinc-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
                >
                  <Copy className="w-3.5 h-3.5 text-amber-400" />
                  <span>{copyLinkNotice ? 'คัดลอกลิงก์สำเร็จ!' : 'คัดลอกลิงก์ส่งให้ผู้บริหาร'}</span>
                </button>

                {onOpenVipView && (
                  <button
                    type="button"
                    onClick={onOpenVipView}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                    <span>ทดลองเปิดหน้ารีโมท</span>
                  </button>
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-zinc-200">
                  สถานะปุ่มบนมือถือผู้บริหาร:{' '}
                  <span className={config.isVipTriggerActive ? 'text-emerald-400 font-bold' : 'text-zinc-400'}>
                    {config.isVipTriggerActive ? 'เปิดใช้งานอยู่ (รอผู้บริหารกด)' : 'ล็อกอยู่ (ผู้บริหารยังกดไม่ได้)'}
                  </span>
                </div>
                <div className="text-[11px] text-zinc-400 mt-0.5">
                  รางวัลที่ผูกกับรอบนี้: <span className="font-semibold text-amber-400">{currentPrize?.name}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleVipTrigger}
                className={`min-h-[46px] px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer border ${
                  config.isVipTriggerActive
                    ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border-rose-500/30'
                    : 'bg-emerald-400 hover:bg-emerald-300 text-zinc-950 border-emerald-400'
                }`}
              >
                {config.isVipTriggerActive ? (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>ล็อกปุ่มผู้บริหารชั่วคราว</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4" />
                    <span>เปิดสิทธิ์ให้ผู้บริหารกดรอบนี้</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* MAIN DRAW STAGE */}
          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5 sm:p-7 shadow-xl relative overflow-hidden">
            <div className="max-w-2xl mx-auto text-center">
              <p className="text-xs font-semibold text-amber-400 mb-1">
                เวทีสุ่มจับรางวัล Lucky Draw
              </p>
              <h3 className="text-2xl sm:text-3xl font-bold text-zinc-100">
                พร้อมสุ่มผู้โชคดีค่ำคืนนี้
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                สุ่มเฉพาะผู้ลงทะเบียนสำเร็จ ไม่แจกซ้ำรหัสเดิม และคัดกรองตามกฎความยุติธรรม
              </p>

              {/* Prize Selection Buttons */}
              <div className="mt-5 mb-5 flex flex-wrap justify-center gap-2">
                {prizes.map((p) => {
                  const isSelected = p.id === selectedPrizeId;
                  const isExhausted = p.remaining <= 0;
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
                      className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer border ${
                        isSelected
                          ? 'bg-amber-400 text-zinc-950 border-amber-300'
                          : isExhausted
                          ? 'bg-zinc-950 text-zinc-600 border-zinc-800 cursor-not-allowed'
                          : 'bg-zinc-950 hover:bg-zinc-800 text-zinc-200 border-zinc-800'
                      }`}
                    >
                      <Trophy className={`w-3.5 h-3.5 ${isSelected ? 'text-zinc-950' : 'text-amber-400'}`} />
                      <span>{p.name}</span>
                      <span
                        className={`text-[11px] font-mono tabular-nums ${
                          isSelected ? 'text-zinc-900 font-bold' : 'text-zinc-400'
                        }`}
                      >
                        ({p.remaining})
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Active Prize Info Preview */}
              {currentPrize && (
                <div className="mb-6 p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col sm:flex-row items-center gap-4 text-left">
                  {currentPrize.imageUrl && !brokenImages[currentPrize.id] ? (
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 shrink-0">
                      <img
                        src={currentPrize.imageUrl}
                        alt={currentPrize.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={() => setBrokenImages((prev) => ({ ...prev, [currentPrize.id]: true }))}
                      />
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 text-amber-400">
                      <Gift className="w-8 h-8" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold text-amber-400">
                      {currentPrize.tier}
                    </div>
                    <div className="text-base sm:text-lg font-bold text-zinc-100 truncate">
                      {currentPrize.name}
                    </div>
                    {currentPrize.sponsor && (
                      <div className="text-xs text-zinc-400">
                        ผู้สนับสนุน: {currentPrize.sponsor}
                      </div>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs text-zinc-400">จำนวนที่เหลือ</div>
                    <div className="text-xl font-bold text-amber-400 font-mono tabular-nums">
                      {currentPrize.remaining} / {currentPrize.quantity}
                    </div>
                  </div>
                </div>
              )}

              {/* SHUFFLE / DRAWING ANIMATION DISPLAY */}
              <div className="w-full max-w-md mx-auto aspect-[16/10] rounded-2xl bg-zinc-950 border border-zinc-800 p-4 flex flex-col items-center justify-center relative mb-6">
                {isDrawing && drawShufflingCandidate ? (
                  <div className="flex flex-col items-center animate-bounce">
                    <div className="w-20 h-24 rounded-xl overflow-hidden border-2 border-amber-400 mb-2 shadow-lg bg-zinc-900">
                      {drawShufflingCandidate.selfieUrl ? (
                        <img
                          src={drawShufflingCandidate.selfieUrl}
                          alt="shuffling"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-zinc-500">
                          ?
                        </div>
                      )}
                    </div>
                    <div className="text-xl font-bold text-amber-400 font-mono">
                      {drawShufflingCandidate.employeeId}
                    </div>
                    <div className="text-base font-bold text-zinc-100">
                      {drawShufflingCandidate.fullName}
                    </div>
                    <div className="text-xs text-zinc-400 font-medium">
                      {drawShufflingCandidate.tableNumber}
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center mx-auto mb-3 text-amber-400">
                      <Trophy className="w-8 h-8" />
                    </div>
                    <div className="text-sm font-bold text-zinc-100">
                      ผู้มีสิทธิ์ลุ้นรางวัลทั้งหมด:{' '}
                      <span className="text-amber-400 font-mono tabular-nums text-base">
                        {eligibleCandidates.length}
                      </span>{' '}
                      ท่าน
                    </div>
                    <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto">
                      แอดมินสามารถกดสุ่มจากที่นี่ หรือเปิดสิทธิ์ให้ผู้บริหารกดผ่านมือถือได้ทันที
                    </p>
                  </div>
                )}
              </div>

              {/* Big Draw Trigger Button for Admin */}
              <button
                type="button"
                disabled={isDrawing || eligibleCandidates.length === 0 || !currentPrize || currentPrize.remaining <= 0}
                onClick={handleStartLuckyDraw}
                className={`min-h-[56px] px-8 py-3 rounded-xl font-bold text-base shadow-lg flex items-center justify-center gap-3 mx-auto transition-transform active:scale-95 cursor-pointer ${
                  isDrawing
                    ? 'bg-zinc-800 text-zinc-400 cursor-wait'
                    : eligibleCandidates.length === 0 || !currentPrize || currentPrize.remaining <= 0
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                    : 'bg-amber-400 hover:bg-amber-300 text-zinc-950 hover:scale-105'
                }`}
              >
                <Sparkles className="w-6 h-6" />
                <span>{isDrawing ? 'กำลังสุ่มรายชื่อ...' : 'เริ่มสุ่มจับรางวัล (Admin Trigger)'}</span>
              </button>
            </div>
          </div>

          {/* FAIR CHANCE & BLOCKING CONTROLS — Hidden behind small icon until PIN 25102612 is entered */}
          {!isFairChanceUnlocked ? (
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => {
                  soundFX.playClick();
                  setIsFairChancePinModalOpen(true);
                }}
                className="w-9 h-9 rounded-xl bg-zinc-900/70 hover:bg-zinc-800 border border-zinc-800/80 hover:border-amber-400/40 text-zinc-600 hover:text-amber-400 flex items-center justify-center transition cursor-pointer"
                title="การคัดกรอง & บล็อคกลุ่มผู้ใช้งานเพื่อความยุติธรรม"
                aria-label="เปิดเมนูการคัดกรองสิทธิ์"
              >
                <ShieldAlert className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="p-5 sm:p-6 rounded-2xl bg-zinc-900 border border-amber-400/30 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h4 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-amber-400" />
                    <span>การคัดกรอง &amp; บล็อคกลุ่มผู้ใช้งานเพื่อความยุติธรรม</span>
                  </h4>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    ตั้งค่าบล็อคกลุ่ม เช่น คณะผู้บริหาร หรือผู้ที่เคยได้รับรางวัล เพื่อกระจายโอกาส
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>ไม่แจกซ้ำรหัสเดิม: เปิดใช้งานตลอด</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      soundFX.playClick();
                      setIsFairChanceUnlocked(false);
                    }}
                    className="min-h-[36px] px-3 py-1 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-[11px] text-zinc-400 hover:text-zinc-200 font-semibold cursor-pointer"
                  >
                    ซ่อนเมนู
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-300 block">
                  เลือกกลุ่มหรือบทบาทที่ต้องการบล็อคจากการจับรางวัล:
                </label>
                <div className="flex flex-wrap gap-2">
                  {allGroups.map((groupName) => {
                    const isBlocked = blockedGroupSet.has(groupName);
                    return (
                      <button
                        key={groupName}
                        type="button"
                        onClick={() => handleToggleBlockedGroup(groupName)}
                        className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition cursor-pointer ${
                          isBlocked
                            ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                            : 'bg-zinc-950 text-zinc-300 border-zinc-800 hover:bg-zinc-800'
                        }`}
                      >
                        {isBlocked ? (
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                        <span>{groupName}</span>
                        <span className="text-[11px] font-mono">
                          {isBlocked ? '(บล็อคอยู่)' : '(มีสิทธิ์)'}
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
          TAB 2: PRIZE MANAGEMENT & ATTACH SAMPLE IMAGES
      ========================================================================= */}
      {activeTab === 'prizes' && (
        <div className="space-y-6">
          <div className="p-5 sm:p-6 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                <Gift className="w-5 h-5 text-amber-400" />
                <span>จัดการของรางวัล &amp; แนบรูปตัวอย่าง</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                ปรับแต่งเพิ่มลดประเภทของรางวัล แก้ไขจำนวน และอัปโหลดรูปตัวอย่างของรางวัลได้ตามต้องการ
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingPrize(null);
                setIsPrizeModalOpen(true);
                soundFX.playClick();
              }}
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มของรางวัลใหม่</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {prizes.map((prize) => {
              const hasValidImage = prize.imageUrl && !brokenImages[prize.id];
              return (
                <div
                  key={prize.id}
                  className="rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 overflow-hidden flex flex-col justify-between transition"
                >
                  <div>
                    <div className="relative w-full h-44 bg-zinc-950 border-b border-zinc-800 overflow-hidden flex items-center justify-center">
                      {hasValidImage ? (
                        <img
                          src={prize.imageUrl}
                          alt={prize.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                          onError={() => setBrokenImages((prev) => ({ ...prev, [prize.id]: true }))}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-zinc-600">
                          <Gift className="w-12 h-12 text-amber-400/50" />
                          <span className="text-[11px] font-medium text-zinc-500 mt-1">
                            ไม่มีรูปภาพแนบ
                          </span>
                        </div>
                      )}
                      <div className="absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />
                      <span className="absolute top-2.5 left-3 text-[11px] font-semibold text-amber-300">
                        {prize.tier}
                      </span>
                      <span
                        className={`absolute top-2.5 right-3 text-[11px] font-mono tabular-nums font-bold ${
                          prize.remaining > 0 ? 'text-emerald-300' : 'text-zinc-500'
                        }`}
                      >
                        เหลือ {prize.remaining} / {prize.quantity}
                      </span>
                    </div>

                    <div className="p-4">
                      <h4 className="text-base font-bold text-zinc-100 tracking-tight">
                        {prize.name}
                      </h4>
                      {prize.sponsor && (
                        <p className="text-xs text-amber-400 font-medium mt-0.5">
                          ผู้สนับสนุน: {prize.sponsor}
                        </p>
                      )}
                      {prize.description && (
                        <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                          {prize.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="p-3 bg-zinc-950/60 border-t border-zinc-800 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPrize(prize);
                        setIsPrizeModalOpen(true);
                        soundFX.playClick();
                      }}
                      className="flex-1 min-h-[40px] px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold border border-zinc-700 flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5 text-amber-400" />
                      <span>แก้ไขข้อมูล / รูปภาพ</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`คุณต้องการลบรางวัล "${prize.name}" หรือไม่?`)) {
                          handleDeletePrize(prize.id);
                        }
                      }}
                      className="min-h-[40px] min-w-[40px] p-2 rounded-xl bg-zinc-900 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-300 border border-zinc-800 hover:border-rose-500/30 flex items-center justify-center transition cursor-pointer"
                      title="ลบรางวัล"
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
          <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex-1 flex flex-col sm:flex-row items-center gap-2">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={attendeeSearch}
                  onChange={(e) => setAttendeeSearch(e.target.value)}
                  placeholder="ค้นหารหัส, เบอร์โทร, ชื่อ, โต๊ะ..."
                  className="w-full min-h-[44px] pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="w-full sm:w-auto flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-zinc-500" />
                <select
                  value={selectedDeptFilter}
                  onChange={(e) => setSelectedDeptFilter(e.target.value)}
                  className="w-full sm:w-auto min-h-[44px] px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-zinc-200 focus:outline-none focus:border-amber-400 font-medium"
                >
                  <option value="ALL">ทุกแผนก ({registrations.length})</option>
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
              <span>ส่งออกรายชื่อลงทะเบียนเป็น Excel (.xlsx)</span>
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
                    className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center gap-3"
                  >
                    <div className="w-12 h-14 rounded-xl overflow-hidden bg-zinc-950 border border-zinc-700 shrink-0">
                      {att.selfieUrl ? (
                        <img
                          src={att.selfieUrl}
                          alt={att.fullName}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[9px] text-zinc-500">
                          ไม่มีรูป
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono font-bold text-amber-400 truncate">
                          {att.employeeId}
                        </span>
                        {hasWon ? (
                          <span className="text-[10px] font-semibold text-amber-300 shrink-0">ได้รางวัลแล้ว</span>
                        ) : isBlocked ? (
                          <span className="text-[10px] font-semibold text-rose-400 shrink-0">ถูกบล็อค</span>
                        ) : (
                          <span className="text-[10px] font-semibold text-emerald-400 shrink-0">พร้อมลุ้น</span>
                        )}
                      </div>
                      <div className="text-sm font-bold text-zinc-100 truncate">
                        {att.fullName} {att.nickname ? `(${att.nickname})` : ''}
                      </div>
                      <div className="text-[11px] text-zinc-400 truncate mt-0.5 font-mono tabular-nums">
                        {att.phone || '-'} · {att.tableNumber}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 rounded-2xl bg-zinc-900 border border-zinc-800 text-center text-xs text-zinc-500">
                {registrations.length === 0
                  ? 'ยังไม่มีพนักงานลงทะเบียนเข้างานในขณะนี้'
                  : 'ไม่พบรายชื่อที่ตรงกับคำค้นหา'}
              </div>
            )}
          </div>

          {/* Desktop Table View for Attendees */}
          <div className="hidden md:block rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-950 text-zinc-400 text-[11px] font-semibold border-b border-zinc-800">
                  <tr>
                    <th className="py-3 px-4">ภาพเซลฟี่</th>
                    <th className="py-3 px-4">รหัสพนักงาน</th>
                    <th className="py-3 px-4">เบอร์โทรศัพท์</th>
                    <th className="py-3 px-4">ชื่อ - นามสกุล</th>
                    <th className="py-3 px-4">แผนก</th>
                    <th className="py-3 px-4">หมายเลขโต๊ะ</th>
                    <th className="py-3 px-4">เวลาลงทะเบียน</th>
                    <th className="py-3 px-4">สิทธิ์ Lucky Draw</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80 text-zinc-300">
                  {filteredAttendees.length > 0 ? (
                    filteredAttendees.map((att) => {
                      const hasWon = wonEmployeeIds.has(att.employeeId.toUpperCase());
                      const isBlocked =
                        att.isBlockedFromDraw ||
                        (att.groupRole && blockedGroupSet.has(att.groupRole));

                      return (
                        <tr key={att.id} className="hover:bg-zinc-800/40 transition">
                          <td className="py-2.5 px-4">
                            <div className="w-12 h-14 rounded-xl overflow-hidden bg-zinc-950 border border-zinc-700">
                              {att.selfieUrl ? (
                                <img
                                  src={att.selfieUrl}
                                  alt={att.fullName}
                                  className="w-full h-full object-cover"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[9px] text-zinc-500">
                                  ไม่มีรูป
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-4 font-mono font-bold text-amber-400">
                            {att.employeeId}
                          </td>
                          <td className="py-2.5 px-4 font-mono tabular-nums text-zinc-200">
                            {att.phone || '-'}
                          </td>
                          <td className="py-2.5 px-4">
                            <div className="font-semibold text-zinc-100">{att.fullName}</div>
                            {att.nickname && (
                              <div className="text-[11px] text-amber-300">
                                ({att.nickname})
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-zinc-400">
                            {att.department}
                          </td>
                          <td className="py-2.5 px-4 font-mono text-amber-300 font-semibold">
                            {att.tableNumber}
                          </td>
                          <td className="py-2.5 px-4 text-zinc-400 font-mono tabular-nums text-[11px]">
                            {new Date(att.registeredAt).toLocaleTimeString('th-TH', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="py-2.5 px-4">
                            {hasWon ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300">
                                <Trophy className="w-3.5 h-3.5" />
                                <span>ได้รางวัลแล้ว</span>
                              </span>
                            ) : isBlocked ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400">
                                <ShieldAlert className="w-3.5 h-3.5" />
                                <span>ถูกบล็อค</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>พร้อมลุ้นรางวัล</span>
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
                          ? 'ยังไม่มีพนักงานลงทะเบียนเข้างานในขณะนี้'
                          : 'ไม่พบรายชื่อที่ตรงกับคำค้นหา'}
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
          TAB 4: EXCEL ROSTER MANAGEMENT & IMPORT
      ========================================================================= */}
      {activeTab === 'roster' && (
        <div className="space-y-6">
          <div className="p-5 sm:p-6 rounded-2xl bg-zinc-900 border border-zinc-800">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                  <span>นำเข้าข้อมูลพนักงานและหมายเลขโต๊ะผ่านไฟล์ Excel</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-1">
                  รองรับไฟล์ .xlsx และ .csv ระบบจะผูกรหัสพนักงานกับหมายเลขโต๊ะเพื่อแสดงให้พนักงานทราบทันทีหลังลงทะเบียน
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  soundFX.playClick();
                  downloadSampleExcelTemplate();
                }}
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold border border-zinc-700 flex items-center justify-center gap-2 transition cursor-pointer shrink-0"
              >
                <Download className="w-4 h-4 text-amber-400" />
                <span>ดาวน์โหลด Template Excel ตัวอย่าง</span>
              </button>
            </div>

            {excelImportMessage && (
              <div
                className={`mb-4 p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                  excelImportMessage.type === 'success'
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                }`}
              >
                {excelImportMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
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
              className="border-2 border-dashed border-zinc-700 hover:border-amber-400/70 rounded-2xl p-6 text-center cursor-pointer bg-zinc-950/60 hover:bg-zinc-950 transition"
            >
              <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto mb-2 text-amber-400">
                <Upload className="w-6 h-6" />
              </div>
              <div className="text-sm font-bold text-zinc-100">
                {excelImportLoading ? 'กำลังอ่านและประมวลผลไฟล์ Excel...' : 'คลิกเพื่อเลือกไฟล์ Excel (.xlsx / .csv) หรือลากไฟล์มาวางที่นี่'}
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                คอลัมน์ที่รองรับ: รหัสพนักงาน, ชื่อ-นามสกุล, ชื่อเล่น, แผนก, หมายเลขโต๊ะ, กลุ่ม/บทบาท, เบอร์โทร
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden">
            <div className="p-4 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between">
              <div className="text-xs font-bold text-zinc-200">
                รายชื่อพนักงานในระบบทั้งหมด ({roster.length} คน)
              </div>
            </div>

            {/* Mobile Card List for Roster */}
            <div className="md:hidden divide-y divide-zinc-800/80 max-h-[26rem] overflow-y-auto">
              {roster.map((emp) => (
                <div key={emp.id} className="p-3.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono font-bold text-amber-400">{emp.id}</span>
                      {emp.isBlockedFromDraw && (
                        <span className="text-[10px] text-rose-400 font-semibold">บล็อค</span>
                      )}
                    </div>
                    <div className="text-sm font-bold text-zinc-100 truncate mt-0.5">
                      {emp.fullName} {emp.nickname ? `(${emp.nickname})` : ''}
                    </div>
                    <div className="text-[11px] text-zinc-400 truncate">
                      {emp.department} · {emp.groupRole || 'พนักงานทั่วไป'}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-mono font-bold text-amber-300">
                      {emp.tableNumber}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table for Roster */}
            <div className="hidden md:block overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-950 text-zinc-400 text-[11px] font-semibold border-b border-zinc-800 sticky top-0">
                  <tr>
                    <th className="py-2.5 px-4">รหัสพนักงาน</th>
                    <th className="py-2.5 px-4">ชื่อ - นามสกุล</th>
                    <th className="py-2.5 px-4">ชื่อเล่น</th>
                    <th className="py-2.5 px-4">แผนก</th>
                    <th className="py-2.5 px-4">หมายเลขโต๊ะที่จัดสรร</th>
                    <th className="py-2.5 px-4">กลุ่ม / บทบาท</th>
                    <th className="py-2.5 px-4 text-center">สถานะบล็อค</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80 text-zinc-300">
                  {roster.map((emp) => (
                    <tr key={emp.id} className="hover:bg-zinc-800/40 transition">
                      <td className="py-2.5 px-4 font-mono font-bold text-amber-400">
                        {emp.id}
                      </td>
                      <td className="py-2.5 px-4 font-semibold text-zinc-100">
                        {emp.fullName}
                      </td>
                      <td className="py-2.5 px-4 text-amber-300">
                        {emp.nickname || '-'}
                      </td>
                      <td className="py-2.5 px-4 text-zinc-400">
                        {emp.department}
                      </td>
                      <td className="py-2.5 px-4 font-mono text-amber-300 font-semibold">
                        {emp.tableNumber}
                      </td>
                      <td className="py-2.5 px-4 text-zinc-400">
                        {emp.groupRole || 'พนักงานทั่วไป'}
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {emp.isBlockedFromDraw ? (
                          <span className="text-[11px] text-rose-400 font-semibold">
                            บล็อค
                          </span>
                        ) : (
                          <span className="text-[11px] text-zinc-500">
                            ปกติ
                          </span>
                        )}
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
          <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <span>รายงานประวัติการแจกรางวัล Lucky Draw ({luckyWinners.length} รางวัล)</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                บันทึกประวัติการสุ่มรางวัลย้อนหลังโดยละเอียด สามารถตรวจสอบและดาวน์โหลดเป็น Excel ได้ทันที
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
                <span>ส่งออกรายงานผู้ได้รางวัลเป็น Excel</span>
              </button>

              {luckyWinners.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('คุณแน่ใจหรือไม่ว่าต้องการล้างประวัติการสุ่มรางวัลทั้งหมดและคืนสิทธิ์ให้ผู้เข้าร่วมงาน?')) {
                      onResetAllLuckyDraws();
                    }
                  }}
                  className="min-h-[44px] px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>รีเซ็ตรางวัล</span>
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
                  className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center gap-3"
                >
                  <div className="w-12 h-14 rounded-xl overflow-hidden bg-zinc-950 border border-amber-400/50 shrink-0">
                    {w.selfieUrl ? (
                      <img
                        src={w.selfieUrl}
                        alt={w.winnerName}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] text-amber-400 font-mono font-bold">
                        #{luckyWinners.length - index}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-amber-400 font-bold">
                      <span>#{luckyWinners.length - index}</span>
                      <span className="text-zinc-600">·</span>
                      <span>{w.employeeId}</span>
                    </div>
                    <div className="text-sm font-bold text-zinc-100 truncate">
                      {w.winnerName} {w.nickname ? `(${w.nickname})` : ''}
                    </div>
                    <div className="text-[11px] text-amber-300 truncate">
                      {w.prizeName} · {w.tableNumber}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`ต้องการยกเลิกผลรางวัลของ "${w.winnerName}" หรือไม่? (จะนำรางวัลกลับเข้าสู่ระบบ)`)) {
                        onDeleteLuckyWinner(w.id);
                      }
                    }}
                    className="min-h-[44px] min-w-[44px] p-2 rounded-xl text-zinc-400 hover:text-rose-400 hover:bg-rose-500/15 flex items-center justify-center transition cursor-pointer shrink-0"
                    title="สละสิทธิ์ / จับใหม่"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            ) : (
              <div className="p-8 rounded-2xl bg-zinc-900 border border-zinc-800 text-center text-xs text-zinc-500">
                ยังไม่มีประวัติการแจกรางวัลในระบบ
              </div>
            )}
          </div>

          {/* Desktop Table View for Lucky Draw History */}
          <div className="hidden md:block rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-950 text-zinc-400 text-[11px] font-semibold border-b border-zinc-800">
                  <tr>
                    <th className="py-3 px-4">รอบ</th>
                    <th className="py-3 px-4">รางวัล</th>
                    <th className="py-3 px-4">ภาพเซลฟี่</th>
                    <th className="py-3 px-4">รหัสพนักงาน</th>
                    <th className="py-3 px-4">ชื่อผู้โชคดี</th>
                    <th className="py-3 px-4">แผนก</th>
                    <th className="py-3 px-4">หมายเลขโต๊ะ</th>
                    <th className="py-3 px-4">เวลาที่จับได้</th>
                    <th className="py-3 px-4 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80 text-zinc-300">
                  {luckyWinners.length > 0 ? (
                    luckyWinners.map((w, index) => (
                      <tr key={w.id} className="hover:bg-zinc-800/40 transition">
                        <td className="py-2.5 px-4 font-mono tabular-nums font-bold text-amber-400">
                          #{luckyWinners.length - index}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="font-semibold text-zinc-100">{w.prizeName}</div>
                          <div className="text-[11px] text-zinc-400">{w.prizeTier}</div>
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="w-10 h-12 rounded-xl overflow-hidden bg-zinc-950 border border-amber-400/50">
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
                        <td className="py-2.5 px-4 font-mono font-bold text-amber-400">
                          {w.employeeId}
                        </td>
                        <td className="py-2.5 px-4">
                          <div className="font-semibold text-zinc-100">{w.winnerName}</div>
                          {w.nickname && (
                            <div className="text-[11px] text-amber-300">
                              (คุณ{w.nickname})
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-zinc-400">{w.department}</td>
                        <td className="py-2.5 px-4 font-mono text-amber-300 font-semibold">
                          {w.tableNumber}
                        </td>
                        <td className="py-2.5 px-4 font-mono tabular-nums text-[11px] text-zinc-400">
                          {new Date(w.wonAt).toLocaleTimeString('th-TH', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`ต้องการยกเลิกผลรางวัลของ "${w.winnerName}" หรือไม่? (จะนำรางวัลกลับเข้าสู่ระบบ)`)) {
                                onDeleteLuckyWinner(w.id);
                              }
                            }}
                            className="p-2 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/15 transition cursor-pointer"
                            title="สละสิทธิ์ / จับใหม่"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-zinc-500">
                        ยังไม่มีประวัติการแจกรางวัลในระบบ
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
            <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center justify-between animate-in fade-in duration-200">
              <div className="flex items-center gap-2 font-semibold text-xs">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>{settingsSavedNotice}</span>
              </div>
              <button
                type="button"
                onClick={() => setSettingsSavedNotice(null)}
                className="text-emerald-300 hover:text-emerald-100 text-xs font-bold px-2 py-1 cursor-pointer"
              >
                ปิด
              </button>
            </div>
          )}

          {/* Quick Preset Templates */}
          <div className="p-5 rounded-2xl bg-zinc-900 border border-zinc-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold text-zinc-100">
                  เทมเพลตตัวอย่างด่วน (Quick Presets)
                </h3>
              </div>
              <span className="text-[11px] text-zinc-400">กดเพื่อเปลี่ยนข้อความตัวอย่างอัตโนมัติ</span>
            </div>
            <p className="text-xs text-zinc-400 mb-3">
              คลิกเทมเพลตด้านล่างเพื่อเติมข้อความตามประเภทงานเลี้ยง แล้วกดแก้ไขหรือกดบันทึกได้ทันที:
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
                    regSubtitle: 'กรอกรหัสพนักงาน เบอร์โทรศัพท์ และถ่ายรูปเซลฟี่เพื่อยืนยันตัวตน',
                  })
                }
                className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-amber-400/50 text-left transition text-xs font-bold text-zinc-100 cursor-pointer"
              >
                <div className="text-sm mb-0.5">งานเลี้ยงประจำปี</div>
                <div className="text-[11px] text-zinc-400 font-normal truncate">Annual Staff Party</div>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleApplyPreset({
                    name: 'งานเลี้ยงสังสรรค์ส่งท้ายปีเก่า ต้อนรับปีใหม่',
                    subtitle: 'Happy New Year Celebration & Lucky Night',
                    venue: 'ห้องจัดเลี้ยง ชั้น 3 สโมสรริมน้ำ',
                    ticketTitle: 'NEW YEAR CELEBRATION PASS',
                    regSubtitle: 'กรอกรหัสพนักงาน เบอร์โทรศัพท์ และถ่ายรูปเซลฟี่เพื่อลุ้นรางวัล Lucky Draw',
                  })
                }
                className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-amber-400/50 text-left transition text-xs font-bold text-zinc-100 cursor-pointer"
              >
                <div className="text-sm mb-0.5">งานฉลองปีใหม่</div>
                <div className="text-[11px] text-zinc-400 font-normal truncate">New Year Party</div>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleApplyPreset({
                    name: 'งานเลี้ยงกระชับมิตร Company Outing & Dinner',
                    subtitle: 'Connecting People, Inspiring Future',
                    venue: 'ริมสระน้ำ / Beachfront Garden Resort',
                    ticketTitle: 'OUTING GALA DINNER PASS',
                    regSubtitle: 'กรอกรหัสพนักงาน เบอร์โทรศัพท์ และถ่ายรูปเซลฟี่เพื่อดูหมายเลขโต๊ะ',
                  })
                }
                className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-amber-400/50 text-left transition text-xs font-bold text-zinc-100 cursor-pointer"
              >
                <div className="text-sm mb-0.5">งาน Outing &amp; กาล่า</div>
                <div className="text-[11px] text-zinc-400 font-normal truncate">Outing Dinner</div>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleApplyPreset({
                    name: 'งานฉลองความสำเร็จและขอบคุณพนักงาน',
                    subtitle: 'Celebrating Excellence & Rewarding Success',
                    venue: 'ห้องประชุมอเนกประสงค์ อาคารสำนักงานใหญ่',
                    ticketTitle: 'AWARDS & APPRECIATION PASS',
                    regSubtitle: 'กรอกรหัสพนักงาน เบอร์โทรศัพท์ และถ่ายรูปเซลฟี่เพื่อรับบัตรเข้างาน',
                  })
                }
                className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-amber-400/50 text-left transition text-xs font-bold text-zinc-100 cursor-pointer"
              >
                <div className="text-sm mb-0.5">งานฉลองความสำเร็จ</div>
                <div className="text-[11px] text-zinc-400 font-normal truncate">Awards &amp; Night</div>
              </button>
            </div>
          </div>

          {/* Settings Form */}
          <form onSubmit={handleSaveSettings} className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-zinc-100">
                  ปรับแต่งรายละเอียดงานเลี้ยง (Event Customization)
                </h3>
              </div>
              <span className="text-[11px] text-amber-400 font-semibold">
                แอดมินกำหนดเองได้อิสระ
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  ชื่องานเลี้ยง (Event Name) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={settingsName}
                  onChange={(e) => setSettingsName(e.target.value)}
                  placeholder="เช่น งานเลี้ยงพนักงานบริษัทประจำปี 2026..."
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-700 focus:border-amber-400 focus:outline-none text-sm font-bold text-zinc-100 bg-zinc-950"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  คำโปรย หรือสโลแกนงาน (Slogan / Subtitle)
                </label>
                <input
                  type="text"
                  value={settingsSubtitle}
                  onChange={(e) => setSettingsSubtitle(e.target.value)}
                  placeholder="เช่น Together We Shine 2026..."
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-700 focus:border-amber-400 focus:outline-none text-xs text-zinc-100 bg-zinc-950"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  วันที่ &amp; เวลาจัดงาน (Event Date &amp; Time)
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-amber-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    value={settingsDate}
                    onChange={(e) => setSettingsDate(e.target.value)}
                    placeholder="เช่น วันศุกร์ที่ 19 ธันวาคม 2569 เวลา 18:00 น."
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-zinc-700 focus:border-amber-400 focus:outline-none text-xs text-zinc-100 bg-zinc-950"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  สถานที่จัดงาน / ห้องจัดเลี้ยง (Venue &amp; Room)
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-amber-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    type="text"
                    value={settingsVenue}
                    onChange={(e) => setSettingsVenue(e.target.value)}
                    placeholder="เช่น ห้อง Grand Ballroom ชั้น 2 โรงแรมพลาซ่า"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-zinc-700 focus:border-amber-400 focus:outline-none text-xs text-zinc-100 bg-zinc-950"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  ช่องทางติดต่อทีมงาน / จุดช่วยเหลือ (Helpdesk)
                </label>
                <input
                  type="text"
                  value={settingsContact}
                  onChange={(e) => setSettingsContact(e.target.value)}
                  placeholder="เช่น ฝ่ายบุคคล (HR) หรือ จุดลงทะเบียนหน้าประตู"
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-700 focus:border-amber-400 focus:outline-none text-xs text-zinc-100 bg-zinc-950"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  ข้อความหัวบัตรเข้างาน (Digital Pass Header)
                </label>
                <input
                  type="text"
                  value={settingsTicketTitle}
                  onChange={(e) => setSettingsTicketTitle(e.target.value)}
                  placeholder="OFFICIAL PARTY PASS & TABLE PASS"
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-700 focus:border-amber-400 focus:outline-none text-xs font-mono text-zinc-100 bg-zinc-950"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  คำแนะนำหน้าลงทะเบียน (Registration Subtitle)
                </label>
                <input
                  type="text"
                  value={settingsRegSubtitle}
                  onChange={(e) => setSettingsRegSubtitle(e.target.value)}
                  placeholder="กรอกรหัสพนักงาน เบอร์โทรศัพท์ และถ่ายรูปเซลฟี่เพื่อยืนยันตัวตน"
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-700 focus:border-amber-400 focus:outline-none text-xs text-zinc-100 bg-zinc-950"
                />
              </div>
            </div>

            {/* Live Preview Box */}
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800">
              <div className="text-[11px] font-semibold text-amber-400 mb-2">
                ตัวอย่างการแสดงผลบนหน้าจอพนักงาน (Live Preview):
              </div>
              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-zinc-100">{settingsName || 'ชื่องานเลี้ยง'}</div>
                  <div className="text-[11px] text-amber-400 font-medium">{settingsSubtitle || 'คำโปรยงาน'}</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">
                    {settingsVenue} · {settingsDate}
                  </div>
                </div>
                <span className="text-[10px] font-mono text-amber-300 font-bold shrink-0">
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
                <span>บันทึกการเปลี่ยนแปลงทั้งหมด</span>
              </button>
            </div>
          </form>

          {/* REUSABILITY ZONE */}
          <div className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
              <div>
                <h3 className="text-sm font-bold text-zinc-100">
                  เครื่องมือสลับงานเลี้ยง &amp; รีเซ็ตระบบ (Switch Event &amp; Reset Tools)
                </h3>
                <p className="text-[11px] text-zinc-400">
                  สำหรับนำระบบนี้ไปใช้กับงานเลี้ยงถัดไป หรือเคลียร์ข้อมูลเพื่อเริ่มงานจริง
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-rose-400 font-bold text-xs mb-1">
                    <RotateCcw className="w-4 h-4" />
                    <span>1. ล้างเฉพาะผู้ลงทะเบียน &amp; ประวัติ Lucky Draw</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mb-4 leading-relaxed">
                    ลบข้อมูลผู้ที่เช็คอินเข้างานและผลการแจกรางวัลทั้งหมด แต่ยังคงรายชื่อพนักงานจากไฟล์ Excel และรายการของรางวัลไว้ตามเดิม
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleConfirmClearRegistrations}
                  className="min-h-[44px] w-full px-4 py-2 rounded-xl bg-zinc-900 hover:bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>ล้างเฉพาะผู้ลงทะเบียน ({registrations.length} คน)</span>
                </button>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs mb-1">
                    <Sparkles className="w-4 h-4" />
                    <span>2. เริ่มต้นจัดงานเลี้ยงใหม่ทั้งหมด (Start New Event)</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mb-4 leading-relaxed">
                    สร้างงานเลี้ยงใหม่ ตั้งชื่องานใหม่ พร้อมเลือกว่าจะล้างหรือเก็บรายชื่อพนักงานและของรางวัลไว้สำหรับงานครั้งถัดไป
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
                  <span>เริ่มต้นจัดงานเลี้ยงใหม่</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* START NEW PARTY MODAL */}
      {isNewPartyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl relative animate-in zoom-in-95 duration-200 space-y-4">
            <div className="flex items-center gap-2 text-amber-400">
              <Sparkles className="w-6 h-6" />
              <h3 className="text-lg font-bold text-zinc-100">
                เริ่มต้นจัดงานเลี้ยงใหม่ (Start New Event)
              </h3>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              ระบบจะทำการล้างข้อมูลการลงทะเบียนและผล Lucky Draw เดิมทั้งหมด และเปิดระบบรับลงทะเบียนใหม่สำหรับงานเลี้ยงนี้
            </p>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                ชื่องานเลี้ยงใหม่
              </label>
              <input
                type="text"
                value={newPartyName}
                onChange={(e) => setNewPartyName(e.target.value)}
                placeholder="ระบุชื่องานเลี้ยงใหม่ เช่น งานเลี้ยงพนักงานส่งท้ายปี 2026"
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-950 text-sm font-bold text-zinc-100 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
              <div className="text-xs font-bold text-zinc-200">ตัวเลือกเพิ่มเติม:</div>
              <label className="flex items-start gap-2.5 text-xs text-zinc-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newPartyClearRoster}
                  onChange={(e) => setNewPartyClearRoster(e.target.checked)}
                  className="mt-0.5 rounded text-amber-400 focus:ring-amber-400 w-4 h-4 bg-zinc-900 border-zinc-700"
                />
                <div>
                  <span className="font-bold">ล้างรายชื่อพนักงานเดิมออกทั้งหมด</span>
                  <p className="text-[11px] text-zinc-500">
                    เลือกข้อนี้หากต้องการนำเข้าไฟล์ Excel รายชื่อพนักงานชุดใหม่สำหรับงานนี้
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-2.5 text-xs text-zinc-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={newPartyClearPrizes}
                  onChange={(e) => setNewPartyClearPrizes(e.target.checked)}
                  className="mt-0.5 rounded text-amber-400 focus:ring-amber-400 w-4 h-4 bg-zinc-900 border-zinc-700"
                />
                <div>
                  <span className="font-bold">ล้างรายการของรางวัลเดิมทั้งหมด</span>
                  <p className="text-[11px] text-zinc-500">
                    เลือกข้อนี้หากต้องการกำหนดรายการของรางวัลใหม่ทั้งหมดตั้งแต่ต้น
                  </p>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsNewPartyModalOpen(false)}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmNewParty}
                className="min-h-[44px] px-6 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-bold cursor-pointer active:scale-95 transition"
              >
                ยืนยันเริ่มงานเลี้ยงใหม่
              </button>
            </div>
          </div>
        </div>
      )}

      {/* WINNER REVEAL MODAL */}
      {latestWinnerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-zinc-900 border border-amber-400/50 p-6 shadow-2xl text-center relative animate-in zoom-in-95 duration-200">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 mb-2">
              <Sparkles className="w-4 h-4" />
              <span>ขอแสดงความยินดีกับผู้โชคดี</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-bold text-zinc-100 mb-0.5">
              {latestWinnerModal.prizeName}
            </h3>
            <p className="text-xs text-zinc-400 font-medium mb-4">
              {latestWinnerModal.prizeTier}
            </p>

            {/* Winner's Selfie Photo Prominently Shown */}
            <div className="w-32 h-40 mx-auto rounded-2xl overflow-hidden border-2 border-amber-400 shadow-xl bg-zinc-950 mb-4">
              {latestWinnerModal.selfieUrl ? (
                <img
                  src={latestWinnerModal.selfieUrl}
                  alt={latestWinnerModal.winnerName}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-zinc-500">
                  ไม่มีรูปถ่าย
                </div>
              )}
            </div>

            <div className="text-xs font-mono font-bold text-amber-400">
              {latestWinnerModal.employeeId}
            </div>
            <h4 className="text-2xl font-bold text-zinc-100 mt-0.5">
              {latestWinnerModal.winnerName}
            </h4>
            {latestWinnerModal.nickname && (
              <p className="text-sm font-semibold text-amber-300">
                (คุณ{latestWinnerModal.nickname})
              </p>
            )}
            <p className="text-xs text-zinc-400 mt-1">
              แผนก {latestWinnerModal.department}
            </p>

            <div className="mt-4 p-3 rounded-xl bg-zinc-950 border border-amber-400/30 text-amber-300 font-bold text-base">
              โต๊ะประจำ: {latestWinnerModal.tableNumber}
            </div>

            <button
              type="button"
              onClick={() => {
                soundFX.playClick();
                setLatestWinnerModal(null);
              }}
              className="mt-6 w-full min-h-[48px] py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-sm active:scale-95 transition cursor-pointer"
            >
              ตกลงและบันทึกผล
            </button>
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
        title="ปลดล็อคการคัดกรองสิทธิ์"
        subtitle="กดรหัส PIN 8 หลักเพื่อแสดงเมนูการคัดกรอง & บล็อคกลุ่ม"
        icon={<ShieldAlert className="w-6 h-6" />}
      />
    </div>
  );
};
