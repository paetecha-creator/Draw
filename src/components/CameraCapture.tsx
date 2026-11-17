import React, { useRef, useState } from 'react';
import { Upload, RefreshCw, Trash2, Check, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { soundFX } from '../utils/audio';
import { compressImageDataUrl } from '../utils/imageCompress';
import { usePreferences } from '../contexts/PreferencesContext';

interface CameraCaptureProps {
  onCapture: (photoDataUrl: string) => void;
  currentPhoto: string | null;
  onClear: () => void;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({
  onCapture,
  currentPhoto,
  onClear,
}) => {
  const { t } = usePreferences();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const processSelectedFile = (file: File) => {
    setUploadError(null);
    if (!file.type.startsWith('image/')) {
      setUploadError(
        t('กรุณาเลือกไฟล์รูปภาพเท่านั้น (.jpg, .png, .webp)', 'Please choose a valid image file (.jpg, .png, .webp)')
      );
      return;
    }

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        if (event.target?.result) {
          const compressed = await compressImageDataUrl(event.target.result as string, 520, 650, 0.78);
          soundFX.playCelebrationChime();
          onCapture(compressed);
        }
      } catch {
        setUploadError(
          t('ไม่สามารถประมวลผลรูปภาพได้ กรุณาลองเลือกรูปอื่น', 'Could not process this image. Please try another photo.')
        );
      } finally {
        setIsProcessing(false);
      }
    };
    reader.onerror = () => {
      setIsProcessing(false);
      setUploadError(t('เกิดข้อผิดพลาดในการอ่านไฟล์รูปภาพ', 'Failed to read image file.'));
    };
    reader.readAsDataURL(file);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Main Photo Upload & Preview Container */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`relative w-full max-w-[290px] sm:max-w-[330px] aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl transition-all border-2 ${
          isDragging
            ? 'border-cyan-400 scale-[1.02] ring-4 ring-cyan-400/30'
            : currentPhoto
            ? 'border-emerald-400 dark:border-emerald-400 shadow-emerald-500/20'
            : 'border-dashed border-fuchsia-400/70 dark:border-fuchsia-500/60 hover:border-cyan-400'
        } bg-gradient-to-br from-fuchsia-50 via-amber-50 to-cyan-50 dark:from-fuchsia-950/60 dark:via-violet-950/70 dark:to-cyan-950/60`}
      >
        {currentPhoto ? (
          <div className="relative w-full h-full">
            <img
              src={currentPhoto}
              alt={t('รูปภาพลงทะเบียนสำหรับแสดงผลรางวัล', 'Uploaded check-in photo for Lucky Draw')}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none" />

            <div className="absolute top-3 left-3 bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold text-white shadow-lg">
              <Check className="w-4 h-4" />
              <span>{t('อัปโหลดรูปภาพแล้ว', 'Photo Uploaded')}</span>
            </div>

            <div className="absolute bottom-3 inset-x-3 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  soundFX.playClick();
                  fileInputRef.current?.click();
                }}
                className="flex-1 min-h-[44px] py-2.5 px-3 bg-gradient-to-r from-fuchsia-500 to-amber-500 hover:from-fuchsia-400 hover:to-amber-400 text-white text-xs font-bold rounded-xl shadow-lg flex items-center justify-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>{t('เปลี่ยนรูป', 'Change Photo')}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  soundFX.playClick();
                  onClear();
                }}
                className="min-h-[44px] min-w-[44px] p-2.5 bg-zinc-900/90 hover:bg-rose-600 text-white rounded-xl border border-white/20 shadow-lg flex items-center justify-center transition active:scale-95 cursor-pointer"
                title={t('ลบรูปภาพ', 'Remove photo')}
                aria-label={t('ลบรูปภาพ', 'Remove photo')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => !isProcessing && fileInputRef.current?.click()}
            className="p-6 text-center flex flex-col items-center justify-center h-full w-full cursor-pointer group"
          >
            <div className="w-18 h-18 rounded-2xl bg-gradient-to-tr from-fuchsia-500 via-rose-500 to-amber-400 p-[2px] shadow-xl shadow-fuchsia-500/25 mb-4 group-hover:scale-105 transition-transform">
              <div className="w-full h-full rounded-[14px] bg-white dark:bg-zinc-950 flex items-center justify-center text-fuchsia-600 dark:text-fuchsia-400">
                <ImageIcon className="w-8 h-8" />
              </div>
            </div>

            <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-1.5">
              {isProcessing
                ? t('กำลังประมวลผลรูปภาพ...', 'Processing image...')
                : t('อัปโหลดรูปภาพจากเครื่อง', 'Upload Photo from Device')}
            </h4>

            <p className="text-xs text-zinc-700 dark:text-zinc-300 mb-5 max-w-[230px] leading-relaxed">
              {t(
                'เลือกรูปภาพของคุณจากแกลเลอรีหรือไฟล์ในเครื่อง เพื่อนำไปแสดงบนหน้าจอเมื่อได้รับรางวัล Lucky Draw',
                'Select your photo from your gallery or device files to display on stage when you win a Lucky Draw prize.'
              )}
            </p>

            {uploadError && (
              <div className="mb-3 px-3 py-2 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-600 dark:text-rose-300 text-[11px] font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <button
              type="button"
              disabled={isProcessing}
              onClick={(e) => {
                e.stopPropagation();
                soundFX.playClick();
                fileInputRef.current?.click();
              }}
              className="w-full max-w-[220px] min-h-[48px] py-2.5 px-4 rounded-xl bg-gradient-to-r from-fuchsia-500 via-orange-500 to-amber-400 hover:from-fuchsia-400 hover:via-orange-400 hover:to-amber-300 text-white font-bold text-xs shadow-lg shadow-fuchsia-500/25 flex items-center justify-center gap-2 active:scale-95 transition cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>{t('เลือกรูปภาพจากเครื่อง', 'Choose Photo')}</span>
            </button>

            <span className="mt-3 text-[11px] text-zinc-500 dark:text-zinc-400">
              {t('รองรับ JPG, PNG, WebP (หรือลากไฟล์มาวาง)', 'Supports JPG, PNG, WebP (or drag & drop)')}
            </span>
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-300 text-center font-medium">
        {t(
          'รูปภาพที่อัปโหลดจะใช้แสดงบนบัตรเข้างานและหน้าจอประกาศผลรางวัล Lucky Draw',
          'Your uploaded photo will appear on your event pass and on the Lucky Draw winner stage.'
        )}
      </p>
    </div>
  );
};

export const PhotoUploader = CameraCapture;
