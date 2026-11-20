import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Camera,
  ImagePlus,
  RefreshCw,
  Trash2,
  Check,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react';
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
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showSourceChooser, setShowSourceChooser] = useState(false);
  const [showLiveCamera, setShowLiveCamera] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraReady(false);
  };

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  const handleCompressedResult = async (rawDataUrl: string) => {
    setIsProcessing(true);
    setUploadError(null);
    try {
      const compressed = await compressImageDataUrl(rawDataUrl, 240, 300, 0.62, 32000);
      soundFX.playCelebrationChime();
      onCapture(compressed);
    } catch {
      setUploadError(
        t(
          'ไม่สามารถประมวลผลรูปภาพได้ กรุณาลองเลือกรูปอื่น',
          'Could not process this image. Please try another photo.'
        )
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const processSelectedFile = (file: File) => {
    setUploadError(null);
    if (!file.type.startsWith('image/')) {
      setUploadError(
        t(
          'กรุณาเลือกไฟล์รูปภาพเท่านั้น (.jpg, .png, .webp)',
          'Please choose a valid image file (.jpg, .png, .webp)'
        )
      );
      return;
    }

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      if (event.target?.result) {
        await handleCompressedResult(event.target.result as string);
      } else {
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

  const isMobileTouchDevice = () => {
    if (typeof navigator === 'undefined') return false;
    return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  };

  const handleLaunchSelfieCamera = async () => {
    soundFX.playClick();
    setShowSourceChooser(false);
    setUploadError(null);

    // On mobile phones, native capture="user" opens the front selfie camera immediately
    if (isMobileTouchDevice() || !navigator.mediaDevices?.getUserMedia) {
      cameraInputRef.current?.click();
      return;
    }

    // On desktop/tablet browsers with webcam support, open instant live front selfie camera
    try {
      setShowLiveCamera(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 800 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsCameraReady(true);
      }
    } catch {
      stopCameraStream();
      setShowLiveCamera(false);
      // Graceful fallback to native camera/file picker if permission denied or blocked in iframe
      cameraInputRef.current?.click();
    }
  };

  const handleSnapLiveSelfie = async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;
    soundFX.playClick();

    const canvas = document.createElement('canvas');
    const targetW = 360;
    const targetH = 450;
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Center-crop to 4:5 portrait and mirror horizontally for natural selfie orientation
    const srcRatio = video.videoWidth / video.videoHeight;
    const dstRatio = targetW / targetH;
    let sx = 0;
    let sy = 0;
    let sw = video.videoWidth;
    let sh = video.videoHeight;
    if (srcRatio > dstRatio) {
      sw = video.videoHeight * dstRatio;
      sx = (video.videoWidth - sw) / 2;
    } else {
      sh = video.videoWidth / dstRatio;
      sy = (video.videoHeight - sh) / 2;
    }

    ctx.translate(targetW, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, targetW, targetH);

    const rawDataUrl = canvas.toDataURL('image/jpeg', 0.85);
    stopCameraStream();
    setShowLiveCamera(false);
    await handleCompressedResult(rawDataUrl);
  };

  const handleChooseFromGallery = () => {
    soundFX.playClick();
    setShowSourceChooser(false);
    galleryInputRef.current?.click();
  };

  return (
    <div className="w-full flex flex-col items-center justify-center py-2">
      {/* Hidden input 1: Direct Front Selfie Camera on Mobile */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Hidden input 2: Phone Photo Library / File Picker */}
      <input
        ref={galleryInputRef}
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
                setShowSourceChooser(true);
              }}
              title={t('ถ่ายใหม่ / เปลี่ยนรูป', 'Retake / Change Photo')}
              aria-label={t('ถ่ายใหม่ / เปลี่ยนรูป', 'Retake / Change Photo')}
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
        <div className="w-full flex flex-col items-center justify-center">
          <button
            type="button"
            disabled={isProcessing}
            aria-label={t('ถ่ายภาพหรืออัพโหลดรูปภาพเซลฟี่ของคุณ', 'Take or Upload Your Selfie')}
            title={t('ถ่ายภาพหรืออัพโหลดรูปภาพเซลฟี่ของคุณ', 'Take or Upload Your Selfie')}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => {
              soundFX.playClick();
              setShowSourceChooser(true);
            }}
            className={`w-full max-w-xs min-h-[54px] rounded-2xl bg-gradient-to-r from-fuchsia-500 via-orange-500 to-amber-400 p-[2px] shadow-xl shadow-fuchsia-500/25 hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60 ${
              isDragging ? 'scale-[1.02] ring-4 ring-cyan-400/40' : ''
            }`}
          >
            <span className="w-full h-full min-h-[50px] px-5 py-3 rounded-[14px] bg-gradient-to-r from-fuchsia-500 via-rose-500 to-amber-400 hover:brightness-110 flex items-center justify-center gap-2 text-white font-bold text-sm text-center leading-snug transition">
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>{t('กำลังประมวลผลรูปภาพ...', 'Processing photo...')}</span>
                </>
              ) : (
                t('ถ่ายภาพหรืออัพโหลดรูปภาพเซลฟี่ของคุณ', 'Take or Upload Your Selfie')
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

      {/* Source Chooser Modal: Centered in viewport & portaled above all nav bars */}
      {showSourceChooser &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowSourceChooser(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#160b30] border-2 border-fuchsia-300/70 dark:border-fuchsia-500/40 shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-150"
            >
              <div className="h-1.5 bg-gradient-to-r from-fuchsia-500 via-amber-400 to-cyan-400" />
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-base font-extrabold text-zinc-900 dark:text-white">
                    {t('เลือกวิธีแนบรูปภาพเซลฟี่', 'Choose Photo Method')}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowSourceChooser(false)}
                    className="p-1.5 rounded-xl bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-white/20 cursor-pointer"
                    aria-label={t('ปิด', 'Close')}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleLaunchSelfieCamera}
                    className="w-full min-h-[56px] px-4 py-3.5 rounded-2xl bg-gradient-to-r from-fuchsia-600 via-rose-500 to-amber-500 hover:brightness-110 text-white font-extrabold text-sm shadow-lg shadow-fuchsia-500/25 flex items-center gap-3 active:scale-[0.98] transition cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <div>{t('เปิดกล้องถ่ายภาพเซลฟี่ทันที', 'Open Selfie Camera Now')}</div>
                      <div className="text-[11px] font-medium text-white/85">
                        {t('เปิดกล้องหน้าเพื่อถ่ายรูปได้ทันที', 'Snap a selfie directly with your camera')}
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleChooseFromGallery}
                    className="w-full min-h-[56px] px-4 py-3.5 rounded-2xl bg-cyan-50 dark:bg-violet-950/80 hover:bg-cyan-100 dark:hover:bg-violet-900 border-2 border-cyan-300/80 dark:border-cyan-500/40 text-zinc-900 dark:text-white font-extrabold text-sm flex items-center gap-3 active:scale-[0.98] transition cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white flex items-center justify-center shrink-0 shadow">
                      <ImagePlus className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <div>{t('เลือกอัปโหลดรูปจากมือถือ / แกลเลอรี', 'Upload from Phone / Gallery')}</div>
                      <div className="text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
                        {t('เลือกรูปภาพที่มีอยู่ในเครื่องของคุณ', 'Select an existing photo from your device')}
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Live Desktop/Browser Selfie Camera Modal */}
      {showLiveCamera &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-sm rounded-3xl bg-zinc-950 border-2 border-fuchsia-500/60 shadow-2xl overflow-hidden">
              <div className="px-4 py-3 flex items-center justify-between border-b border-white/10">
                <div className="flex items-center gap-2 text-white text-sm font-extrabold">
                  <Camera className="w-4 h-4 text-amber-400" />
                  <span>{t('ถ่ายภาพเซลฟี่', 'Take a Selfie')}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    stopCameraStream();
                    setShowLiveCamera(false);
                  }}
                  className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="relative aspect-[4/5] w-full bg-black overflow-hidden">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover -scale-x-100"
                />
                {!isCameraReady && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/80 text-xs">
                    <Loader2 className="w-7 h-7 animate-spin text-amber-400" />
                    <span>{t('กำลังเปิดกล้องหน้า...', 'Starting front camera...')}</span>
                  </div>
                )}
              </div>

              <div className="p-4 flex items-center justify-center gap-3 bg-zinc-950">
                <button
                  type="button"
                  disabled={!isCameraReady}
                  onClick={handleSnapLiveSelfie}
                  className="w-full min-h-[50px] py-3 px-5 rounded-2xl bg-gradient-to-r from-fuchsia-500 via-rose-500 to-amber-400 hover:brightness-110 disabled:opacity-50 text-white font-extrabold text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition"
                >
                  <Camera className="w-5 h-5" />
                  <span>{t('ถ่ายภาพเลย!', 'Capture Selfie')}</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export const PhotoUploader = CameraCapture;
