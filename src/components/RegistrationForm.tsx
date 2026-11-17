import React, { useState } from 'react';
import { Image as ImageIcon, CheckCircle2, Lock, Sparkles, User, Phone, AlertCircle } from 'lucide-react';
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
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [matchedEmployee, setMatchedEmployee] = useState<EmployeeRoster | null>(null);

  if (!config.isRegistrationOpen) {
    return (
      <div className="w-full max-w-md mx-auto p-6 sm:p-8 rounded-3xl bg-white/95 dark:bg-zinc-900/90 border-2 border-fuchsia-400/50 dark:border-fuchsia-500/40 text-center shadow-2xl shadow-fuchsia-500/15">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-fuchsia-500 to-amber-400 flex items-center justify-center mx-auto mb-4 text-white shadow-lg">
          <Lock className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
          {t('ระบบลงทะเบียนปิดชั่วคราว', 'Check-in is Currently Closed')}
        </h3>
        <p className="text-xs text-zinc-600 dark:text-zinc-300 mb-6 leading-relaxed">
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
          className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-gradient-to-r from-fuchsia-500 via-orange-500 to-amber-400 hover:brightness-110 text-white font-bold text-xs shadow-lg shadow-fuchsia-500/25 flex items-center justify-center gap-2 active:scale-98 transition cursor-pointer"
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

    const match = roster.find((emp) => emp.id.toUpperCase() === trimmedId) || matchedEmployee;

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
    } catch {
      setFormError(
        t(
          'บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
          'Failed to save registration. Please try again.'
        )
      );
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
        <p className="text-xs sm:text-sm text-zinc-700 dark:text-zinc-300 mt-1.5 max-w-lg mx-auto font-medium">
          {lang === 'en'
            ? 'Enter your Employee ID, Phone Number, and upload your photo from device.'
            : 'กรอกรหัสพนักงาน เบอร์โทรศัพท์ และอัปโหลดรูปภาพจากเครื่องเพื่อใช้แสดงผลรางวัล'}
        </p>
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
          {/* Left Column: Employee ID & Phone Number ONLY */}
          <div className="space-y-4 sm:space-y-5">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-1">
                {t('ข้อมูลลงทะเบียนเข้างาน', 'Attendee Check-in Details')}
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-300">
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
                  className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-fuchsia-50/50 dark:bg-zinc-950/80 border-2 border-fuchsia-200 dark:border-violet-700 focus:border-fuchsia-500 dark:focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-400/25 text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 text-base sm:text-sm font-mono uppercase font-bold tracking-wider transition"
                />
                {matchedEmployee && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('พบในรายชื่อ', 'Matched')}</span>
                  </div>
                )}
              </div>

              {matchedEmployee && (
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

            {/* Desktop Submit CTA */}
            <div className="hidden md:block pt-2">
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

          {/* Right Column: Device Image Upload (Replaces Camera Capture) */}
          <div id="photo-upload-section" className="pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-fuchsia-200 dark:border-violet-800 md:pl-8">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                <span>{t('อัปโหลดรูปภาพของคุณจากเครื่อง', 'Upload Your Photo')}</span>
                <span className="text-rose-500 dark:text-rose-400">*</span>
              </label>
              {uploadedPhoto && (
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{t('พร้อมใช้งาน', 'Ready')}</span>
                </span>
              )}
            </div>

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
    </div>
  );
};
