import React, { useRef, useState } from 'react';
import { RefreshCw, Trash2, Check, ImagePlus, AlertCircle, Loader2 } from 'lucide-react';
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
          const compressed = await compressImageDataUrl(event.target.result as string, 240, 300, 0.62, 32000);
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

  const handleDrop = (e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  return (
    <div className="w-full flex flex-col items-center justify-center py-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
      />

      {currentPhoto ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`relative w-full max-w-[260px] sm:max-w-[290px] aspect-[4/5] rounded-2xl overflow-hidden shadow-2xl transition-all border-2 ${
            isDragging
              ? 'border-cyan-400 scale-[1.02] ring-4 ring-cyan-400/30'
              : 'border-emerald-400 dark:border-emerald-400 shadow-emerald-500/20'
          }`}
        >
          <img
            src={currentPhoto}
            alt={t('รูปภาพลงทะเบียนสำหรับแสดงผลรางวัล', 'Uploaded check-in photo for Lucky Draw')}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 via-black/35 to-transparent pointer-events-none" />

          <div className="absolute top-3 left-3 w-8 h-8 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-lg">
            <Check className="w-4 h-4" />
          </div>

          <div className="absolute bottom-3 inset-x-3 flex items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                soundFX.playClick();
                fileInputRef.current?.click();
              }}
              title={t('เปลี่ยนรูป', 'Change Photo')}
              aria-label={t('เปลี่ยนรูป', 'Change Photo')}
              className="min-h-[44px] min-w-[44px] p-2.5 bg-gradient-to-r from-fuchsia-500 to-amber-500 hover:from-fuchsia-400 hover:to-amber-400 text-white rounded-xl shadow-lg flex items-center justify-center transition-transform active:scale-95 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
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
        <div className="flex flex-col items-center justify-center">
          <button
            type="button"
            disabled={isProcessing}
            aria-label={t('แนบรูปภาพ', 'Attach photo')}
            title={t('แนบรูปภาพ', 'Attach photo')}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => {
              soundFX.playClick();
              fileInputRef.current?.click();
            }}
            className={`w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-fuchsia-500 via-orange-500 to-amber-400 p-[3px] shadow-xl shadow-fuchsia-500/25 hover:scale-105 active:scale-95 transition-all cursor-pointer disabled:opacity-60 ${
              isDragging ? 'scale-105 ring-4 ring-cyan-400/40' : ''
            }`}
          >
            <span className="w-full h-full rounded-[21px] bg-white/95 dark:bg-zinc-950/95 hover:bg-fuchsia-50 dark:hover:bg-zinc-900 flex items-center justify-center text-fuchsia-600 dark:text-amber-300 transition-colors">
              {isProcessing ? (
                <Loader2 className="w-10 h-10 animate-spin" />
              ) : (
                <ImagePlus className="w-10 h-10 sm:w-11 sm:h-11" />
              )}
            </span>
          </button>

          {uploadError && (
            <div className="mt-3 px-3 py-2 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-600 dark:text-rose-300 text-[11px] font-semibold flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const PhotoUploader = CameraCapture;
