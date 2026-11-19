import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Lock, Sparkles, User, Phone, AlertCircle, ShieldCheck } from 'lucide-react';
import { AttendeeRegistration, EmployeeRoster, PartyConfig } from '../types/party';
import { FirestoreService } from '../services/firestoreService';
import { CameraCapture } from './CameraCapture';
import { PartyDialogModal, PartyDialogState } from './PartyDialogModal';
import { soundFX } from '../utils/audio';
import { usePreferences } from '../contexts/PreferencesContext';

interface RegistrationFormProps {
  roster: EmployeeRoster[];
  registrations: AttendeeRegistration[];
  config: PartyConfig;
  onRegisterSuccess: (registration: AttendeeRegistration) => Promise<void> | void;
}

export const RegistrationForm: React.FC<RegistrationFormProps> = ({
  roster,
  registrations,
  config,
  onRegisterSuccess,
}) => {
  const { t, lang } = usePreferences();
  const [employeeId, setEmployeeId] = useState('');
  const [phone, setPhone] = useState('');
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [matchedEmployee, setMatchedEmployee] = useState<EmployeeRoster | null>(null);
  const [remoteDuplicate, setRemoteDuplicate] = useState<AttendeeRegistration | null>(null);
  const lookupCacheRef = useRef<
    Map<string, { roster: EmployeeRoster | null; registration: AttendeeRegistration | null }>
  >(new Map());
  const [dialog, setDialog] = useState<PartyDialogState>({
    isOpen: false,
    mode: 'alert',
    variant: 'warning',
    title: '',
    message: '',
  });

  const duplicateRegistration = useMemo(() => {
    const trimmed = employeeId.trim().toUpperCase();
    if (!trimmed) return null;
    const localDup =
      registrations.find((r) => r.employeeId.trim().toUpperCase() === trimmed) || null;
    if (localDup) return localDup;
    if (remoteDuplicate && remoteDuplicate.employeeId.trim().toUpperCase() === trimmed) {
      return remoteDuplicate;
    }
    return null;
  }, [employeeId, registrations, remoteDuplicate]);

  // Low-quota single-document lookup (max 2 reads per unique Employee ID after user pauses typing)
  useEffect(() => {
    const trimmed = employeeId.trim().toUpperCase();
    if (trimmed.length < 2) {
      setRemoteDuplicate(null);
      return;
    }

    const cached = lookupCacheRef.current.get(trimmed);
    if (cached) {
      if (cached.roster) setMatchedEmployee(cached.roster);
      setRemoteDuplicate(cached.registration);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      const [remoteEmp, remoteReg] = await Promise.all([
        FirestoreService.lookupRosterByEmployeeId(trimmed),
        FirestoreService.lookupRegistrationByEmployeeId(trimmed),
      ]);
      if (cancelled) return;
      lookupCacheRef.current.set(trimmed, { roster: remoteEmp, registration: remoteReg });
      if (remoteEmp) {
        setMatchedEmployee(remoteEmp);
      }
      setRemoteDuplicate(remoteReg);
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [employeeId]);

  if (!config.isRegistrationOpen) {
    return (
      <div className="w-full max-w-md mx-auto p-6 sm:p-8 rounded-3xl bg-white/95 dark:bg-zinc-900/90 border-2 border-fuchsia-400/50 dark:border-fuchsia-500/40 text-center shadow-2xl shadow-fuchsia-500/15">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-fuchsia-500 to-amber-400 flex items-center justify-center mx-auto mb-4 text-white shadow-lg">
          <Lock className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
          {t('ระบบลงทะเบียนปิดชั่วคราว', 'Check-in is Currently Closed')}
        </h3>
        <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
          {t(
            'ผู้ดูแลระบบได้ปิดรับลงทะเบียนเข้างานเรียบร้อยแล้ว ขณะนี้เข้าสู่ช่วงพิธีการและกิจกรรมสุ่มจับรางวัล Lucky Draw กรุณาติดตามผลรางวัลบนหน้าจอใหญ่ภายในงาน',
            'The organizer has closed event registration. Please enjoy the event and watch the Lucky Draw results on the main stage screen.'
          )}
        </p>
      </div>
    );
  }

  const handleEmployeeIdChange = (idVal: string) => {
    setEmployeeId(idVal);
    setFormError(null);
    const trimmed = idVal.trim().toUpperCase();

    if (!trimmed) {
      setMatchedEmployee(null);
      return;
    }

    const match = roster.find((emp) => emp.id.toUpperCase() === trimmed);
    setMatchedEmployee(match || null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setFormError(null);

    const trimmedId = employeeId.trim().toUpperCase();
    const trimmedPhone = phone.trim();

    if (!trimmedId) {
      setFormError(t('กรุณากรอกรหัสพนักงาน', 'Please enter your Employee ID'));
      return;
    }

    const existingLocalReg = registrations.find(
      (r) => r.employeeId.trim().toUpperCase() === trimmedId
    );
    const cachedLookup = lookupCacheRef.current.get(trimmedId);
    let existingReg = existingLocalReg || cachedLookup?.registration || null;
    let latestRosterMatch =
      cachedLookup?.roster ||
      matchedEmployee ||
      roster.find((emp) => emp.id.toUpperCase() === trimmedId) ||
      null;

    if (!existingReg && !cachedLookup) {
      setIsSubmitting(true);
      const [remoteEmp, remoteReg] = await Promise.all([
        FirestoreService.lookupRosterByEmployeeId(trimmedId),
        FirestoreService.lookupRegistrationByEmployeeId(trimmedId),
      ]);
      lookupCacheRef.current.set(trimmedId, { roster: remoteEmp, registration: remoteReg });
      if (remoteEmp) latestRosterMatch = remoteEmp;
      existingReg = remoteReg;
      if (remoteReg) setRemoteDuplicate(remoteReg);
      setIsSubmitting(false);
    }

    if (existingReg) {
      soundFX.playClick();
      const dupMsg = t(
        `รหัสพนักงาน ${trimmedId} (${existingReg.fullName}) ได้ลงทะเบียนเข้างานไปแล้ว — จำกัดสิทธิ์ลงทะเบียนได้เพียง 1 ครั้งต่อ 1 รหัสพนักงานเท่านั้น`,
        `Employee ID ${trimmedId} (${existingReg.fullName}) has already checked in. Registration is strictly limited to 1 time per Employee ID.`
      );
      setFormError(dupMsg);
      setDialog({
        isOpen: true,
        mode: 'alert',
        variant: 'warning',
        title: t('ไม่สามารถลงทะเบียนซ้ำได้', 'Duplicate Check-in Detected'),
        message: dupMsg,
      });
      return;
    }

    if (!trimmedPhone) {
      setFormError(t('กรุณากรอกเบอร์โทรศัพท์', 'Please enter your Phone Number'));
      return;
    }

    if (!uploadedPhoto) {
      setFormError(
        t(
          'กรุณาอัปโหลดรูปภาพจากเครื่องเพื่อใช้แสดงผลเมื่อได้รับรางวัลก่อนกดยืนยัน',
          'Please upload your photo from device before confirming check-in'
        )
      );
      const uploadEl = document.getElementById('photo-upload-section');
      uploadEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const match = latestRosterMatch;

    const newRegistration: AttendeeRegistration = {
      id: `REG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      employeeId: trimmedId,
      fullName: match?.fullName || (lang === 'en' ? `Employee ${trimmedId}` : `พนักงาน ${trimmedId}`),
      nickname: match?.nickname || '',
      department: match?.department || (lang === 'en' ? 'General Staff' : 'พนักงานทั่วไป'),
      tableNumber: match?.tableNumber || (lang === 'en' ? 'Main Hall (Ask Reception)' : 'โต๊ะกลาง (ติดต่อฝ่ายต้อนรับ)'),
      phone: trimmedPhone,
      selfieUrl: uploadedPhoto,
      registeredAt: new Date().toISOString(),
      groupRole: match?.groupRole || 'พนักงานทั่วไป',
      isBlockedFromDraw: !!match?.isBlockedFromDraw,
    };

    try {
      setIsSubmitting(true);
      await onRegisterSuccess(newRegistration);
    } catch (err) {
      const isDup = err instanceof Error && err.message === 'DUPLICATE_REGISTRATION';
      const errMsg = isDup
        ? t(
            `รหัสพนักงาน ${trimmedId} ได้ลงทะเบียนเข้างานไปแล้ว จำกัดสิทธิ์ลงทะเบียนได้เพียง 1 ครั้งต่อ 1 รหัสพนักงาน`,
            `Employee ID ${trimmedId} is already registered. Only 1 check-in per Employee ID is allowed.`
          )
        : t(
            'บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
            'Failed to save registration. Please try again.'
          );
      setFormError(errMsg);
      if (isDup) {
        setDialog({
          isOpen: true,
          mode: 'alert',
          variant: 'warning',
          title: t('ไม่สามารถลงทะเบียนซ้ำได้', 'Duplicate Check-in Detected'),
          message: errMsg,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Vibrant Event Header */}
      <div className="text-center mb-5 sm:mb-8 px-1">
        <p className="text-xs font-bold tracking-wide mb-1 bg-gradient-to-r from-fuchsia-600 via-orange-500 to-cyan-600 dark:from-fuchsia-400 dark:via-amber-300 dark:to-cyan-400 bg-clip-text text-transparent">
          {config.eventSubtitle || t('ลงทะเบียนเข้างานเลี้ยง & ยืนยันตัวตน', 'Event Check-in & Verification')}
          {config.eventDate ? ` · ${config.eventDate}` : ''}
        </p>
        <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-balance bg-gradient-to-r from-violet-700 via-fuchsia-600 to-orange-500 dark:from-amber-300 dark:via-fuchsia-400 dark:to-cyan-300 bg-clip-text text-transparent">
          {config.eventName}
        </h2>
      </div>

      {/* Main Registration Container with Vivid Rainbow Top Accent */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl sm:rounded-3xl bg-white/95 dark:bg-[#140a2b]/95 border-2 border-fuchsia-300/60 dark:border-fuchsia-500/40 p-4 sm:p-8 shadow-2xl shadow-fuchsia-500/15 dark:shadow-fuchsia-950/50 transition-colors relative overflow-hidden"
      >
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-fuchsia-500 via-amber-400 via-emerald-400 to-cyan-400 animate-gradient-flow" />

        {formError && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-700 dark:text-rose-200 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8 items-start pt-1">
          {/* Left Column: Employee ID, Phone Number & Prize Claim Conditions */}
          <div className="space-y-4 sm:space-y-5">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-1">
                {t('ข้อมูลลงทะเบียนเข้างาน', 'Attendee Check-in Details')}
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-300">
                {t(
                  'กรอกเพียงรหัสพนักงานและเบอร์โทรศัพท์ ระบบจะดึงข้อมูลโต๊ะและรายชื่อให้อัตโนมัติ (ลงทะเบียนได้ 1 ครั้งต่อ 1 รหัสพนักงาน)',
                  'Enter only your Employee ID and Phone Number. Limited to 1 check-in per Employee ID.'
                )}
              </p>
            </div>

            {/* Field 1: Employee ID */}
            <div>
              <label
                htmlFor="reg-employee-id"
                className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-2 flex items-center gap-1.5"
              >
                <User className="w-3.5 h-3.5 text-fuchsia-600 dark:text-fuchsia-400" />
                <span>{t('รหัสพนักงาน (Employee ID)', 'Employee ID')}</span>
                <span className="text-rose-500 dark:text-rose-400">*</span>
              </label>

              <div className="relative">
                <input
                  id="reg-employee-id"
                  type="text"
                  required
                  autoComplete="off"
                  autoCapitalize="characters"
                  value={employeeId}
                  onChange={(e) => handleEmployeeIdChange(e.target.value)}
                  placeholder={t('เช่น 7473 หรือ ST20339', 'e.g. 7473 or ST20339')}
                  className={`w-full min-h-[48px] px-4 py-3 rounded-xl bg-fuchsia-50/50 dark:bg-zinc-950/80 border-2 focus:outline-none focus:ring-2 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 text-base sm:text-sm font-mono uppercase font-bold tracking-wider transition ${
                    duplicateRegistration
                      ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-400/25'
                      : 'border-fuchsia-200 dark:border-violet-700 focus:border-fuchsia-500 dark:focus:border-cyan-400 focus:ring-fuchsia-400/25'
                  }`}
                />
                {matchedEmployee && !duplicateRegistration && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('พบในรายชื่อ', 'Matched')}</span>
                  </div>
                )}
              </div>

              {duplicateRegistration && (
                <div className="mt-2.5 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/50 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-200">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="font-extrabold">
                      {t('รหัสพนักงานนี้ลงทะเบียนแล้ว (ห้ามลงทะเบียนซ้ำ)', 'Already Registered (Duplicate Not Allowed)')}
                    </div>
                    <div className="text-[11px] mt-0.5 opacity-90">
                      {t(
                        `${duplicateRegistration.fullName} · ${duplicateRegistration.tableNumber} — จำกัด 1 รหัสพนักงานลงทะเบียนได้ 1 ครั้ง`,
                        `${duplicateRegistration.fullName} · ${duplicateRegistration.tableNumber} — 1 check-in per Employee ID`
                      )}
                    </div>
                  </div>
                </div>
              )}

              {matchedEmployee && !duplicateRegistration && (
                <div className="mt-2.5 p-3.5 rounded-xl bg-gradient-to-r from-emerald-500/15 via-cyan-500/15 to-teal-500/15 border border-emerald-400/50 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                      {matchedEmployee.fullName}
                      {matchedEmployee.nickname ? ` (${matchedEmployee.nickname})` : ''}
                    </div>
                    <div className="text-[11px] text-zinc-700 dark:text-zinc-300 truncate mt-0.5">
                      {matchedEmployee.department}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold">
                      {t('โต๊ะประจำ', 'Table')}
                    </div>
                    <div className="text-sm font-extrabold text-fuchsia-600 dark:text-amber-300 font-mono">
                      {matchedEmployee.tableNumber}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Field 2: Phone Number */}
            <div>
              <label
                htmlFor="reg-phone"
                className="block text-xs font-bold text-zinc-800 dark:text-zinc-200 mb-2 flex items-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span>{t('เบอร์โทรศัพท์ (Phone Number)', 'Phone Number')}</span>
                <span className="text-rose-500 dark:text-rose-400">*</span>
              </label>
              <input
                id="reg-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setFormError(null);
                }}
                placeholder={t('เช่น 081-234-5678', 'e.g. 081-234-5678')}
                className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-cyan-50/50 dark:bg-zinc-950/80 border-2 border-cyan-200 dark:border-violet-700 focus:border-cyan-500 dark:focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/25 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 text-base sm:text-sm font-mono tabular-nums transition"
              />
            </div>

            {/* Prize Claim Conditions Box */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-amber-50 via-orange-50/70 to-rose-50/60 dark:from-amber-500/10 dark:via-orange-500/10 dark:to-rose-500/10 border-2 border-amber-300/80 dark:border-amber-400/40">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-800 dark:text-amber-300 mb-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>{t('เงื่อนไขการรับรางวัล', 'Prize Claim Conditions')}</span>
              </div>
              <ol className="space-y-1 text-[11px] sm:text-xs text-zinc-700 dark:text-zinc-200 leading-relaxed font-medium">
                <li>
                  {t(
                    '1.ต้องแสดงบัตรพนักงานในการรับรางวัล',
                    '1. Winners must present their Employee ID card to claim any prize.'
                  )}
                </li>
                <li>
                  {t(
                    '2.ขอสงวนสิทธิในการจับรางวัลใหม่ กรณีที่ไม่มีผู้โชคดีขึ้นมารับรางวัลบนเวที ตามเวลาที่กำหนด',
                    '2. We reserve the right to conduct a re-draw if a winner does not come on stage to claim their prize within the allotted time.'
                  )}
                </li>
              </ol>
            </div>

            {/* Desktop Submit CTA */}
            <div className="hidden md:block pt-1">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-[52px] py-3.5 px-6 rounded-xl bg-gradient-to-r from-fuchsia-500 via-rose-500 to-amber-400 hover:brightness-110 disabled:opacity-60 text-white font-bold text-sm tracking-wide shadow-xl shadow-fuchsia-500/25 flex items-center justify-center gap-2 active:scale-[0.98] transition cursor-pointer"
              >
                <Sparkles className="w-5 h-5" />
                <span>
                  {isSubmitting
                    ? t('กำลังบันทึกข้อมูล...', 'Submitting...')
                    : t('ยืนยันการลงทะเบียน & รับบัตรเข้างาน', 'Confirm Check-in & Get Pass')}
                </span>
              </button>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 text-center mt-3">
                {t(
                  'รูปภาพและข้อมูลของคุณจะถูกนำไปแสดงผลบนเวทีเมื่อได้รับรางวัล Lucky Draw',
                  'Your uploaded photo and details will appear on stage if you win a Lucky Draw prize.'
                )}
              </p>
            </div>
          </div>

          {/* Right Column: Device Image Upload */}
          <div id="photo-upload-section" className="pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-fuchsia-200 dark:border-violet-800 md:pl-8 flex flex-col items-center justify-center md:self-stretch">
            <CameraCapture
              currentPhoto={uploadedPhoto}
              onCapture={(photoUrl) => {
                setUploadedPhoto(photoUrl);
                setFormError(null);
              }}
              onClear={() => setUploadedPhoto(null)}
            />
          </div>
        </div>

        {/* Mobile Submit CTA */}
        <div className="md:hidden mt-5 pt-4 border-t border-fuchsia-200 dark:border-violet-800">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full min-h-[52px] py-3.5 px-5 rounded-xl bg-gradient-to-r from-fuchsia-500 via-rose-500 to-amber-400 hover:brightness-110 disabled:opacity-60 text-white font-bold text-sm tracking-wide shadow-xl shadow-fuchsia-500/25 flex items-center justify-center gap-2 active:scale-[0.98] transition cursor-pointer"
          >
            <Sparkles className="w-5 h-5 shrink-0" />
            <span>
              {isSubmitting
                ? t('กำลังบันทึกข้อมูล...', 'Submitting...')
                : t('ยืนยันการลงทะเบียน & รับบัตรเข้างาน', 'Confirm Check-in & Get Pass')}
            </span>
          </button>
          <p className="text-[11px] text-zinc-600 dark:text-zinc-400 text-center mt-2.5">
            {t(
              'รูปภาพและข้อมูลของคุณจะถูกนำไปแสดงผลบนเวทีเมื่อได้รับรางวัล Lucky Draw',
              'Your uploaded photo and details will appear on stage if you win a Lucky Draw prize.'
            )}
          </p>
        </div>
      </form>

      <PartyDialogModal
        dialog={dialog}
        onClose={() => setDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};
