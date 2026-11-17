import React, { useState } from 'react';
import { Camera, CheckCircle2, Lock, Sparkles, User, Phone, AlertCircle } from 'lucide-react';
import { AttendeeRegistration, EmployeeRoster, PartyConfig } from '../types/party';
import { CameraCapture } from './CameraCapture';
import { soundFX } from '../utils/audio';
import { usePreferences } from '../contexts/PreferencesContext';

interface RegistrationFormProps {
  roster: EmployeeRoster[];
  config: PartyConfig;
  onRegisterSuccess: (registration: AttendeeRegistration) => Promise<void> | void;
  onViewLiveDraw: () => void;
}

export const RegistrationForm: React.FC<RegistrationFormProps> = ({
  roster,
  config,
  onRegisterSuccess,
  onViewLiveDraw,
}) => {
  const { t, lang } = usePreferences();
  const [employeeId, setEmployeeId] = useState('');
  const [phone, setPhone] = useState('');
  const [selfiePhoto, setSelfiePhoto] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [matchedEmployee, setMatchedEmployee] = useState<EmployeeRoster | null>(null);

  if (!config.isRegistrationOpen) {
    return (
      <div className="w-full max-w-md mx-auto p-6 sm:p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4 text-amber-600 dark:text-amber-400">
          <Lock className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
          {t('ระบบลงทะเบียนปิดชั่วคราว', 'Check-in is Currently Closed')}
        </h3>
        <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed">
          {t(
            'ผู้ดูแลระบบได้ปิดรับลงทะเบียนเข้างานเรียบร้อยแล้ว ขณะนี้เข้าสู่ช่วงพิธีการและกิจกรรมสุ่มจับรางวัล Lucky Draw',
            'The organizer has closed event registration. Please head over to watch the LIVE Lucky Draw results.'
          )}
        </p>

        <button
          type="button"
          onClick={() => {
            soundFX.playClick();
            onViewLiveDraw();
          }}
          className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs shadow-lg flex items-center justify-center gap-2 active:scale-98 transition cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>{t('ติดตามผลรางวัล LIVE', 'Watch LIVE Results')}</span>
        </button>
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

    if (!trimmedPhone) {
      setFormError(t('กรุณากรอกเบอร์โทรศัพท์', 'Please enter your Phone Number'));
      return;
    }

    if (!selfiePhoto) {
      setFormError(
        t(
          'กรุณาถ่ายรูปเซลฟี่เพื่อยืนยันตัวตนก่อนกดยืนยันการลงทะเบียน',
          'Please take or upload a selfie photo before confirming check-in'
        )
      );
      const cameraEl = document.getElementById('camera-section');
      cameraEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const match = roster.find((emp) => emp.id.toUpperCase() === trimmedId) || matchedEmployee;

    const newRegistration: AttendeeRegistration = {
      id: `REG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      employeeId: trimmedId,
      fullName: match?.fullName || (lang === 'en' ? `Employee ${trimmedId}` : `พนักงาน ${trimmedId}`),
      nickname: match?.nickname || '',
      department: match?.department || (lang === 'en' ? 'General Staff' : 'พนักงานทั่วไป'),
      tableNumber: match?.tableNumber || (lang === 'en' ? 'Main Hall (Ask Reception)' : 'โต๊ะกลาง (ติดต่อฝ่ายต้อนรับ)'),
      phone: trimmedPhone,
      selfieUrl: selfiePhoto,
      registeredAt: new Date().toISOString(),
      groupRole: match?.groupRole || 'พนักงานทั่วไป',
      isBlockedFromDraw: !!match?.isBlockedFromDraw,
    };

    try {
      setIsSubmitting(true);
      await onRegisterSuccess(newRegistration);
    } catch {
      setFormError(
        t(
          'บันทึกข้อมูลลง Firebase ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
          'Failed to save registration. Please try again.'
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Event Header */}
      <div className="text-center mb-5 sm:mb-8 px-1">
        <p className="text-xs font-medium text-amber-600 dark:text-amber-400 tracking-wide mb-1">
          {config.eventSubtitle || t('ลงทะเบียนเข้างานเลี้ยง & ยืนยันตัวตน', 'Event Check-in & Identity Verification')}
          {config.eventDate ? ` · ${config.eventDate}` : ''}
        </p>
        <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 text-balance">
          {config.eventName}
        </h2>
        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1.5 max-w-lg mx-auto">
          {lang === 'en'
            ? 'Enter your Employee ID, Phone Number, and take a verification selfie.'
            : config.registrationSubtitle || 'กรอกรหัสพนักงาน เบอร์โทรศัพท์ และถ่ายรูปเซลฟี่เพื่อยืนยันตัวตน'}
        </p>
      </div>

      {/* Main Registration Container */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl sm:rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 sm:p-8 shadow-xl dark:shadow-2xl transition-colors"
      >
        {formError && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-8 items-start">
          {/* Left Column: Employee ID & Phone Number ONLY */}
          <div className="space-y-4 sm:space-y-5">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                {t('ข้อมูลยืนยันตัวตน', 'Attendee Verification')}
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                {t(
                  'กรอกเพียงรหัสพนักงานและเบอร์โทรศัพท์ ระบบจะดึงข้อมูลโต๊ะและรายชื่อให้อัตโนมัติ',
                  'Enter only your Employee ID and Phone Number. Your table and details will be matched automatically.'
                )}
              </p>
            </div>

            {/* Field 1: Employee ID */}
            <div>
              <label
                htmlFor="reg-employee-id"
                className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2 flex items-center gap-1.5"
              >
                <User className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
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
                  className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 focus:border-amber-500 dark:focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 text-base sm:text-sm font-mono uppercase font-bold tracking-wider transition"
                />
                {matchedEmployee && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('พบในรายชื่อ', 'Matched')}</span>
                  </div>
                )}
              </div>

              {matchedEmployee && (
                <div className="mt-2.5 p-3.5 rounded-xl bg-amber-50/70 dark:bg-zinc-950/80 border border-amber-400/40 dark:border-amber-400/30 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                      {matchedEmployee.fullName}
                      {matchedEmployee.nickname ? ` (${matchedEmployee.nickname})` : ''}
                    </div>
                    <div className="text-[11px] text-zinc-600 dark:text-zinc-400 truncate mt-0.5">
                      {matchedEmployee.department}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      {t('โต๊ะประจำ', 'Table')}
                    </div>
                    <div className="text-xs font-bold text-amber-600 dark:text-amber-400 font-mono">
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
                className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2 flex items-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
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
                className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 focus:border-amber-500 dark:focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 text-base sm:text-sm font-mono tabular-nums transition"
              />
            </div>

            {/* Desktop Submit CTA */}
            <div className="hidden md:block pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-[52px] py-3.5 px-6 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-zinc-950 font-bold text-sm tracking-wide shadow-lg shadow-amber-500/15 flex items-center justify-center gap-2 active:scale-[0.98] transition cursor-pointer"
              >
                <Sparkles className="w-5 h-5" />
                <span>
                  {isSubmitting
                    ? t('กำลังบันทึกข้อมูล...', 'Submitting...')
                    : t('ยืนยันการลงทะเบียน & รับบัตรเข้างาน', 'Confirm Check-in & Get Pass')}
                </span>
              </button>
              <p className="text-[11px] text-zinc-500 text-center mt-3">
                {t(
                  'รูปเซลฟี่และข้อมูลของคุณจะถูกนำไปแสดงผลบนเวทีเมื่อได้รับรางวัล Lucky Draw',
                  'Your selfie and details will appear on stage if you win a Lucky Draw prize.'
                )}
              </p>
            </div>
          </div>

          {/* Right Column: Mandatory Selfie Camera */}
          <div id="camera-section" className="pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-zinc-200 dark:border-zinc-800 md:pl-8">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>{t('ถ่ายรูปเซลฟี่ยืนยันตัวตน', 'Selfie Verification')}</span>
                <span className="text-rose-500 dark:text-rose-400">*</span>
              </label>
              {selfiePhoto && (
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{t('พร้อมใช้งาน', 'Ready')}</span>
                </span>
              )}
            </div>

            <CameraCapture
              currentPhoto={selfiePhoto}
              onCapture={(photoUrl) => {
                setSelfiePhoto(photoUrl);
                setFormError(null);
              }}
              onClear={() => setSelfiePhoto(null)}
            />
          </div>
        </div>

        {/* Mobile Submit CTA */}
        <div className="md:hidden mt-5 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full min-h-[52px] py-3.5 px-5 rounded-xl bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-zinc-950 font-bold text-sm tracking-wide shadow-lg shadow-amber-500/15 flex items-center justify-center gap-2 active:scale-[0.98] transition cursor-pointer"
          >
            <Sparkles className="w-5 h-5 shrink-0" />
            <span>
              {isSubmitting
                ? t('กำลังบันทึกข้อมูล...', 'Submitting...')
                : t('ยืนยันการลงทะเบียน & รับบัตรเข้างาน', 'Confirm Check-in & Get Pass')}
            </span>
          </button>
          <p className="text-[11px] text-zinc-500 text-center mt-2.5">
            {t(
              'รูปเซลฟี่และข้อมูลของคุณจะถูกนำไปแสดงผลบนเวทีเมื่อได้รับรางวัล Lucky Draw',
              'Your selfie and details will appear on stage if you win a Lucky Draw prize.'
            )}
          </p>
        </div>
      </form>
    </div>
  );
};
