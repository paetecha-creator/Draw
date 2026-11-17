import React, { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, SwitchCamera, Upload, Check } from 'lucide-react';
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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isFlashing, setIsFlashing] = useState<boolean>(false);
  const [hasMultipleCameras, setHasMultipleCameras] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then((devices) => {
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setHasMultipleCameras(videoInputs.length > 1);
      }).catch(() => {});
    }
  }, []);

  const stopStream = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  };

  const startCamera = async (mode: 'user' | 'environment' = facingMode) => {
    setCameraError(null);
    stopStream();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(
        t(
          'เบราว์เซอร์ไม่รองรับกล้อง กรุณาอัปโหลดรูปเซลฟี่แทน',
          'Camera is not supported on this browser. Please upload a selfie photo instead.'
        )
      );
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: mode,
          width: { ideal: 720 },
          height: { ideal: 960 },
        },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      setIsCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch((err) => console.warn('Play error:', err));
      }
    } catch (err: unknown) {
      console.warn('Camera access denied or failed:', err);
      setCameraError(
        t(
          'ไม่สามารถเข้าถึงกล้องได้ (โปรดอนุญาตสิทธิ์ หรืออัปโหลดรูปภาพใบหน้า)',
          'Unable to access camera. Please grant permission or upload a selfie photo.'
        )
      );
      setIsCameraActive(false);
    }
  };

  useEffect(() => {
    if (!currentPhoto) {
      startCamera(facingMode);
    }
    return () => {
      stopStream();
    };
  }, [currentPhoto, facingMode]);

  const toggleFacingMode = () => {
    soundFX.playClick();
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  const takeSnapshot = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    setIsFlashing(true);
    soundFX.playCameraShutter();
    setTimeout(() => setIsFlashing(false), 200);

    const srcW = video.videoWidth || 640;
    const srcH = video.videoHeight || 480;
    const ratio = Math.min(480 / srcW, 600 / srcH, 1);

    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(srcW * ratio));
    canvas.height = Math.max(1, Math.round(srcH * ratio));

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.save();
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      ctx.restore();
      const dataUrl = canvas.toDataURL('image/jpeg', 0.72);

      stopStream();
      onCapture(dataUrl);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        if (event.target?.result) {
          const compressed = await compressImageDataUrl(event.target.result as string, 480, 600, 0.72);
          stopStream();
          soundFX.playCameraShutter();
          onCapture(compressed);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <canvas ref={canvasRef} className="hidden" />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Main Viewport Container */}
      <div className="relative w-full max-w-[270px] sm:max-w-[330px] aspect-[4/5] rounded-2xl overflow-hidden bg-zinc-900 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 shadow-2xl">
        {isFlashing && (
          <div className="absolute inset-0 bg-white z-50 pointer-events-none animate-ping" />
        )}

        {currentPhoto ? (
          <div className="relative w-full h-full">
            <img
              src={currentPhoto}
              alt={t('เซลฟี่ลงทะเบียนยืนยันตัวตน', 'Check-in verification selfie')}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none" />

            <div className="absolute top-3 left-3 bg-zinc-950/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-emerald-500/40 flex items-center gap-1.5 text-xs font-semibold text-emerald-300 shadow-md">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{t('ยืนยันภาพเซลฟี่แล้ว', 'Selfie Verified')}</span>
            </div>

            <div className="absolute bottom-3 inset-x-3 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  soundFX.playClick();
                  onClear();
                }}
                className="flex-1 min-h-[44px] py-2.5 px-4 bg-zinc-900/95 hover:bg-zinc-800 text-zinc-100 text-xs font-semibold rounded-xl backdrop-blur-md border border-zinc-700 shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 text-amber-400" />
                <span>{t('ถ่ายรูปใหม่', 'Retake Photo')}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="relative w-full h-full flex flex-col items-center justify-center">
            {isCameraActive ? (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  autoPlay
                  muted
                  className={`w-full h-full object-cover ${
                    facingMode === 'user' ? 'scale-x-[-1]' : ''
                  }`}
                />

                <div className="absolute inset-x-10 inset-y-12 border-2 border-dashed border-amber-400/70 rounded-[48%] pointer-events-none flex flex-col items-center justify-start pt-3">
                  <span className="text-[11px] font-semibold text-amber-200 bg-zinc-950/80 px-3 py-1 rounded-lg backdrop-blur-xs border border-amber-400/20">
                    {t('จัดใบหน้าให้อยู่ในกรอบ', 'Center your face')}
                  </span>
                </div>

                <div className="absolute top-3 right-3 flex items-center gap-2">
                  {hasMultipleCameras && (
                    <button
                      type="button"
                      onClick={toggleFacingMode}
                      className="min-h-[44px] min-w-[44px] p-2 rounded-xl bg-zinc-950/80 hover:bg-zinc-900 text-zinc-100 backdrop-blur-md border border-zinc-700 flex items-center justify-center transition active:scale-90 shadow-md cursor-pointer"
                      title={t('สลับกล้องหน้า/หลัง', 'Switch Camera')}
                      aria-label={t('สลับกล้องหน้าและหลัง', 'Switch Camera')}
                    >
                      <SwitchCamera className="w-5 h-5 text-amber-400" />
                    </button>
                  )}
                </div>

                <div className="absolute bottom-4 inset-x-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-zinc-950/80 hover:bg-zinc-900 text-zinc-200 backdrop-blur-md border border-zinc-700 flex items-center justify-center active:scale-95 text-xs shadow-md cursor-pointer"
                    title={t('เลือกรูปจากอัลบั้ม', 'Choose from gallery')}
                  >
                    <Upload className="w-4 h-4 text-amber-400" />
                  </button>

                  <button
                    type="button"
                    onClick={takeSnapshot}
                    className="min-h-[64px] min-w-[64px] rounded-full p-1 bg-gradient-to-tr from-amber-400 to-amber-500 shadow-xl shadow-amber-500/25 hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                    aria-label={t('กดถ่ายรูปเซลฟี่', 'Capture Selfie')}
                  >
                    <div className="w-14 h-14 rounded-full bg-zinc-950 flex items-center justify-center border-2 border-amber-300">
                      <Camera className="w-6 h-6 text-amber-400" />
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => startCamera(facingMode)}
                    className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-zinc-950/80 hover:bg-zinc-900 text-zinc-200 backdrop-blur-md border border-zinc-700 flex items-center justify-center active:scale-95 shadow-md cursor-pointer"
                    title={t('รีเฟรชกล้อง', 'Refresh Camera')}
                  >
                    <RefreshCw className="w-4 h-4 text-amber-400" />
                  </button>
                </div>
              </>
            ) : (
              <div className="p-6 text-center flex flex-col items-center justify-center h-full bg-zinc-100 dark:bg-zinc-900/90 w-full">
                <div className="w-16 h-16 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center mb-3 text-amber-600 dark:text-amber-400">
                  <Camera className="w-8 h-8" />
                </div>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                  {t('เปิดกล้องเพื่อถ่ายรูปเซลฟี่', 'Open Camera for Selfie')}
                </h4>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-5 max-w-[240px] leading-relaxed">
                  {cameraError ||
                    t(
                      'ระบบใช้รูปเซลฟี่เพื่อยืนยันตัวตนและแสดงผลบนหน้าจอเมื่อได้รับรางวัล',
                      'Your selfie is used for check-in verification and Lucky Draw winner display.'
                    )}
                </p>

                <div className="flex flex-col gap-2.5 w-full max-w-[210px]">
                  <button
                    type="button"
                    onClick={() => startCamera(facingMode)}
                    className="min-h-[44px] py-2 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold text-xs shadow-md active:scale-95 transition cursor-pointer"
                  >
                    {t('เปิดใช้งานกล้อง', 'Enable Camera')}
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="min-h-[44px] py-2 px-4 rounded-xl bg-white dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-xs border border-zinc-300 dark:border-zinc-700 flex items-center justify-center gap-1.5 active:scale-95 transition cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>{t('อัปโหลดรูปเซลฟี่', 'Upload Selfie Photo')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400 text-center">
        {t(
          'ภาพถ่ายเซลฟี่จะใช้แสดงบนบัตรเข้างานและหน้าจอประกาศรางวัล Lucky Draw',
          'Your selfie will appear on your digital pass and on the Lucky Draw winner screen.'
        )}
      </p>
    </div>
  );
};
