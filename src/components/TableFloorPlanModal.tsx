import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, X, ZoomIn, ZoomOut, Loader2, Map as MapIcon, AlertCircle } from 'lucide-react';
import { FloorPlanData, TableMarker } from '../types/party';
import { FirestoreService } from '../services/firestoreService';
import { soundFX } from '../utils/audio';
import { usePreferences } from '../contexts/PreferencesContext';

interface TableFloorPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableNumber: string;
  attendeeName: string;
  eventVenue?: string;
}

function normalizeTableKey(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/^(โต๊ะที่|โต๊ะ|TABLE|TBL|NO\.?|#)\s*/i, '')
    .replace(/[\s\-_]+/g, '')
    .replace(/^([A-Z]*)0+(\d+)$/, '$1$2');
}

function findMatchingMarker(markers: TableMarker[], tableNumber: string): TableMarker | null {
  if (!markers.length || !tableNumber.trim()) return null;
  const exactUpper = tableNumber.trim().toUpperCase();
  const exact = markers.find((m) => m.tableNumber.trim().toUpperCase() === exactUpper);
  if (exact) return exact;

  const normalizedTarget = normalizeTableKey(tableNumber);
  if (!normalizedTarget) return null;

  const exactNorm = markers.find((m) => normalizeTableKey(m.tableNumber) === normalizedTarget);
  if (exactNorm) return exactNorm;

  // Avoid false substring matches on single digits (e.g., "1" matching "10")
  if (/^\d+$/.test(normalizedTarget)) {
    return (
      markers.find((m) => {
        const digits = normalizeTableKey(m.tableNumber).replace(/^[A-Z]+/, '');
        return digits === normalizedTarget;
      }) || null
    );
  }

  return (
    markers.find(
      (m) =>
        normalizeTableKey(m.tableNumber).includes(normalizedTarget) ||
        normalizedTarget.includes(normalizeTableKey(m.tableNumber))
    ) || null
  );
}

export const TableFloorPlanModal: React.FC<TableFloorPlanModalProps> = ({
  isOpen,
  onClose,
  tableNumber,
  attendeeName,
  eventVenue,
}) => {
  const { t } = usePreferences();
  const [floorPlan, setFloorPlan] = useState<FloorPlanData | null>(() =>
    FirestoreService.getCachedFloorPlan()
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setIsZoomed(false);

    const loadPlan = async () => {
      const cached = FirestoreService.getCachedFloorPlan();
      if (cached) setFloorPlan(cached);
      setIsLoading(!cached);
      const fresh = await FirestoreService.fetchFloorPlan();
      if (!cancelled) {
        setFloorPlan(fresh);
        setIsLoading(false);
      }
    };

    loadPlan();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const matchedMarker = useMemo(() => {
    if (!floorPlan?.markers?.length) return null;
    return findMatchingMarker(floorPlan.markers, tableNumber);
  }, [floorPlan, tableNumber]);

  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl max-h-[92vh] rounded-3xl bg-white dark:bg-[#140a2b] border-2 border-fuchsia-400/70 dark:border-fuchsia-500/50 shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="h-1.5 bg-gradient-to-r from-fuchsia-500 via-amber-400 to-cyan-400 shrink-0" />

        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-fuchsia-200/70 dark:border-violet-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-fuchsia-500 via-orange-500 to-amber-400 text-white flex items-center justify-center shrink-0 shadow-md">
              <MapIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-extrabold text-zinc-900 dark:text-white truncate">
                {t('ผังโต๊ะงานเลี้ยงของคุณ', 'Your Banquet Table Map')}
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 truncate">
                {attendeeName} ·{' '}
                <span className="font-mono font-extrabold text-fuchsia-600 dark:text-amber-300">
                  {tableNumber}
                </span>
                {eventVenue ? ` · ${eventVenue}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {floorPlan?.imageUrl && (
              <button
                type="button"
                onClick={() => {
                  soundFX.playClick();
                  setIsZoomed((z) => !z);
                }}
                className="min-h-[40px] px-3 py-1.5 rounded-xl bg-cyan-50 dark:bg-violet-950 border border-cyan-300 dark:border-cyan-500/40 text-cyan-800 dark:text-cyan-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {isZoomed ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
                <span className="hidden sm:inline">
                  {isZoomed ? t('ย่อภาพ', 'Fit Screen') : t('ขยายดูชัดๆ', 'Zoom In')}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                soundFX.playClick();
                onClose();
              }}
              className="min-h-[40px] min-w-[40px] p-2 rounded-xl bg-zinc-100 dark:bg-white/10 hover:bg-zinc-200 dark:hover:bg-white/20 text-zinc-700 dark:text-zinc-200 flex items-center justify-center cursor-pointer"
              aria-label={t('ปิดหน้าต่าง', 'Close')}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Highlight Banner */}
        <div className="px-4 sm:px-6 py-2.5 bg-gradient-to-r from-fuchsia-50 via-amber-50 to-cyan-50 dark:from-fuchsia-950/50 dark:via-violet-950/60 dark:to-cyan-950/50 border-b border-fuchsia-200/60 dark:border-violet-800 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center gap-2 font-bold text-zinc-800 dark:text-zinc-100">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-fuchsia-600 to-rose-500 text-white font-mono font-extrabold shadow">
              <MapPin className="w-3.5 h-3.5" />
              {tableNumber}
            </span>
            <span>
              {matchedMarker
                ? t(
                    'จุดกระพริบสีแดง-ทองบนแผนผังคือตำแหน่งโต๊ะของคุณ',
                    'The pulsing pin on the floor plan marks your exact table location'
                  )
                : floorPlan?.imageUrl
                ? t(
                    'ดูตำแหน่งโต๊ะของคุณได้จากหมายเลขบนแผนผังด้านล่าง',
                    'Locate your table number on the floor plan below'
                  )
                : t(
                    'ยังไม่มีรูปผังโต๊ะในระบบ',
                    'No floor plan uploaded yet'
                  )}
            </span>
          </div>
        </div>

        {/* Map Body */}
        <div className="flex-1 overflow-auto p-3 sm:p-5 bg-zinc-100 dark:bg-[#0b041c] flex items-center justify-center">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center gap-3 text-zinc-600 dark:text-zinc-300 text-xs font-semibold">
              <Loader2 className="w-8 h-8 animate-spin text-fuchsia-500" />
              <span>{t('กำลังโหลดแผนผังโต๊ะ...', 'Loading banquet floor plan...')}</span>
            </div>
          ) : floorPlan?.imageUrl ? (
            <div
              className={`relative inline-block rounded-2xl overflow-hidden shadow-2xl border-2 border-fuchsia-300/60 dark:border-violet-700 bg-white transition-all ${
                isZoomed ? 'w-[170%] max-w-none' : 'max-w-full'
              }`}
            >
              <img
                src={floorPlan.imageUrl}
                alt={t('แผนผังโต๊ะงานเลี้ยง', 'Banquet Table Floor Plan')}
                className="block w-full h-auto max-h-[68vh] object-contain select-none"
                style={isZoomed ? { maxHeight: 'none' } : undefined}
              />

              {/* Subtle markers for other tables (optional visual reference) */}
              {floorPlan.markers.map((marker) => {
                const isMine =
                  matchedMarker &&
                  marker.tableNumber === matchedMarker.tableNumber &&
                  marker.x === matchedMarker.x &&
                  marker.y === matchedMarker.y;
                if (isMine) return null;
                return (
                  <div
                    key={`${marker.tableNumber}-${marker.x}-${marker.y}`}
                    style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-zinc-900/45 border border-white/80" />
                  </div>
                );
              })}

              {/* Highlighted Attendee Table Pin — anchored dead-center on exact table coordinates */}
              {matchedMarker && (
                <div
                  style={{ left: `${matchedMarker.x}%`, top: `${matchedMarker.y}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none"
                >
                  {/* Expanding radar pulse rings centered on the exact table */}
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-rose-500/45 animate-ping" />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-amber-400/55 animate-pulse" />

                  {/* Floating Table Callout directly above the exact center dot */}
                  <div className="absolute left-1/2 bottom-full -translate-x-1/2 mb-2 px-2.5 py-1 rounded-xl bg-gradient-to-r from-rose-600 via-fuchsia-600 to-amber-500 text-white text-[11px] sm:text-xs font-black whitespace-nowrap shadow-xl border-2 border-white animate-bounce">
                    {t('โต๊ะของคุณ', 'YOUR TABLE')}: {tableNumber}
                  </div>

                  {/* Center pin icon sitting right on the table */}
                  <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-rose-600 border-3 border-white text-white flex items-center justify-center shadow-2xl">
                    <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 px-6 text-center max-w-sm">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-400/40 text-amber-600 dark:text-amber-300 flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-extrabold text-zinc-900 dark:text-white mb-1">
                {t('ยังไม่มีผังโต๊ะในระบบ', 'Floor Plan Not Available Yet')}
              </h4>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                {t(
                  'ฝ่ายจัดงานยังไม่ได้อัปโหลดแผนผังโต๊ะงานเลี้ยง กรุณาแสดงหมายเลขโต๊ะของคุณกับเจ้าหน้าที่ต้อนรับหน้างาน',
                  'The event organizer has not uploaded a banquet floor plan yet. Please show your table number to the reception desk.'
                )}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
