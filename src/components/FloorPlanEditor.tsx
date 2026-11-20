import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Map as MapIcon,
  MapPin,
  Upload,
  Save,
  Trash2,
  CheckCircle2,
  Loader2,
  Plus,
  RotateCcw,
  ScanSearch,
  AlertCircle,
} from 'lucide-react';
import { EmployeeRoster, FloorPlanData, PartyConfig, TableMarker } from '../types/party';
import { FirestoreService } from '../services/firestoreService';
import { compressImageDataUrl } from '../utils/imageCompress';
import { soundFX } from '../utils/audio';
import { usePreferences } from '../contexts/PreferencesContext';

interface FloorPlanEditorProps {
  roster: EmployeeRoster[];
  config: PartyConfig;
  onUpdateConfig: (config: PartyConfig) => Promise<void> | void;
}

export const FloorPlanEditor: React.FC<FloorPlanEditorProps> = ({
  roster,
  config,
  onUpdateConfig,
}) => {
  const { t } = usePreferences();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageContainerRef = useRef<HTMLDivElement | null>(null);

  const [imageUrl, setImageUrl] = useState<string>('');
  const [markers, setMarkers] = useState<TableMarker[]>([]);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [customTableInput, setCustomTableInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [unmatchedTables, setUnmatchedTables] = useState<string[]>([]);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Extract unique sorted table numbers from Excel roster
  const rosterTables = useMemo(() => {
    const set = new Set<string>();
    roster.forEach((emp) => {
      const tbl = emp.tableNumber?.trim();
      if (tbl) set.add(tbl);
    });
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [roster]);

  const allKnownTables = useMemo(() => {
    const set = new Set<string>(rosterTables);
    markers.forEach((m) => {
      if (m.tableNumber.trim()) set.add(m.tableNumber.trim());
    });
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [rosterTables, markers]);

  const pinnedSet = useMemo(
    () => new Set(markers.map((m) => m.tableNumber.trim().toUpperCase())),
    [markers]
  );

  // Load existing floor plan from Firestore once on Settings tab open
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const cached = FirestoreService.getCachedFloorPlan();
      if (cached) {
        setImageUrl(cached.imageUrl);
        setMarkers(cached.markers);
      }
      const fresh = await FirestoreService.fetchFloorPlan();
      if (!cancelled) {
        if (fresh) {
          setImageUrl(fresh.imageUrl);
          setMarkers(fresh.markers);
        }
        setIsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Default selected table to first unpinned table
  useEffect(() => {
    if (!selectedTable && allKnownTables.length > 0) {
      const firstUnpinned =
        allKnownTables.find((tbl) => !pinnedSet.has(tbl.toUpperCase())) || allKnownTables[0];
      setSelectedTable(firstUnpinned);
    }
  }, [allKnownTables, selectedTable, pinnedSet]);

  const runAutoDetectTables = async (targetImageUrl: string, autoSaveAfterDetect: boolean) => {
    if (!targetImageUrl || isDetecting) return;
    setIsDetecting(true);
    setNotice(null);
    setUnmatchedTables([]);

    try {
      const response = await fetch('/api/floor-plan/detect-tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageDataUrl: targetImageUrl,
          rosterTables,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          data?.error ||
            t(
              'ไม่สามารถสแกนอ่านตัวอักษรและตัวเลขบนรูปผังโต๊ะได้ในขณะนี้',
              'Could not scan table numbers from the floor plan image right now.'
            )
        );
      }

      const detectedMarkers: TableMarker[] = Array.isArray(data?.markers)
        ? data.markers
            .filter(
              (m: { tableNumber?: unknown; x?: unknown; y?: unknown }) =>
                typeof m?.tableNumber === 'string' &&
                m.tableNumber.trim().length > 0 &&
                Number.isFinite(Number(m.x)) &&
                Number.isFinite(Number(m.y))
            )
            .map((m: { tableNumber: string; x: number; y: number }) => ({
              tableNumber: m.tableNumber.trim(),
              x: Math.min(99, Math.max(1, Number(Number(m.x).toFixed(2)))),
              y: Math.min(99, Math.max(1, Number(Number(m.y).toFixed(2)))),
            }))
        : [];

      const missing: string[] = Array.isArray(data?.unmatchedTables) ? data.unmatchedTables : [];
      setUnmatchedTables(missing);

      if (detectedMarkers.length === 0) {
        setNotice({
          type: 'error',
          text: t(
            'ไม่พบหมายเลขโต๊ะที่ชัดเจนบนรูปภาพนี้ กรุณาตรวจสอบความคมชัดของรูป หรือคลิกปักหมุดตำแหน่งโต๊ะด้วยตนเองด้านล่าง',
            'No clear table labels were detected on this image. Please check image sharpness or click the map below to pin tables manually.'
          ),
        });
        return;
      }

      setMarkers(detectedMarkers);
      if (missing.length > 0) {
        setSelectedTable(missing[0]);
      }

      if (autoSaveAfterDetect) {
        const payload: FloorPlanData = {
          imageUrl: targetImageUrl,
          markers: detectedMarkers,
          updatedAt: new Date().toISOString(),
        };
        await FirestoreService.saveFloorPlan(payload);
        if (!config.hasFloorPlan) {
          await onUpdateConfig({ ...config, hasFloorPlan: true });
        }
      }

      soundFX.playCelebrationChime();
      const matchedSummary =
        rosterTables.length > 0
          ? t(
              `อ่านตัวอักษรและตัวเลขบนรูปสำเร็จ! ปักหมุดอัตโนมัติ ${detectedMarkers.length} โต๊ะ (ตรงกับไฟล์ Excel ${data.matchedCount ?? detectedMarkers.length}/${rosterTables.length} โต๊ะ)${autoSaveAfterDetect ? ' และบันทึกเรียบร้อยแล้ว' : ''}`,
              `Detected & pinned ${detectedMarkers.length} tables from image (${data.matchedCount ?? detectedMarkers.length}/${rosterTables.length} matched with Excel roster)${autoSaveAfterDetect ? ' and auto-saved.' : '.'}`
            )
          : t(
              `อ่านตัวอักษรและตัวเลขบนรูปสำเร็จ! ปักหมุดอัตโนมัติ ${detectedMarkers.length} โต๊ะ${autoSaveAfterDetect ? ' และบันทึกเรียบร้อยแล้ว' : ''}`,
              `Detected & pinned ${detectedMarkers.length} tables from image${autoSaveAfterDetect ? ' and auto-saved.' : '.'}`
            );

      setNotice({ type: 'success', text: matchedSummary });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : t('เกิดข้อผิดพลาดระหว่างอ่านผังโต๊ะอัตโนมัติ', 'Error while scanning floor plan.');
      setNotice({ type: 'error', text: msg });
    } finally {
      setIsDetecting(false);
    }
  };

  const handleUploadFloorPlanFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNotice(null);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      if (ev.target?.result) {
        // High enough clarity to read table labels on phones, compressed under 360KB for Firestore
        const compressed = await compressImageDataUrl(
          ev.target.result as string,
          1280,
          960,
          0.8,
          360000
        );
        setImageUrl(compressed);
        setMarkers([]);
        soundFX.playClick();
        // Automatically read letters/numbers on image & cross-reference with imported Excel tables
        await runAutoDetectTables(compressed, true);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current) return;
    const activeTable = (customTableInput.trim() || selectedTable).trim();
    if (!activeTable) {
      setNotice({
        type: 'error',
        text: t('กรุณาเลือกหรือพิมพ์หมายเลขโต๊ะก่อนคลิกปักหมุดบนแผนผัง', 'Please select or enter a table number before clicking on the floor plan.'),
      });
      return;
    }

    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = Math.min(99, Math.max(1, Number((((e.clientX - rect.left) / rect.width) * 100).toFixed(2))));
    const y = Math.min(99, Math.max(1, Number((((e.clientY - rect.top) / rect.height) * 100).toFixed(2))));

    soundFX.playClick();
    setNotice(null);

    const nextMarkers = [
      ...markers.filter((m) => m.tableNumber.trim().toUpperCase() !== activeTable.toUpperCase()),
      { tableNumber: activeTable, x, y },
    ];
    setMarkers(nextMarkers);
    setUnmatchedTables((prev) =>
      prev.filter((tbl) => tbl.trim().toUpperCase() !== activeTable.toUpperCase())
    );

    if (customTableInput.trim()) {
      setCustomTableInput('');
    } else {
      // Auto-advance to the next unpinned table for effortless batch pinning
      const nextPinned = new Set(nextMarkers.map((m) => m.tableNumber.trim().toUpperCase()));
      const currentIdx = allKnownTables.findIndex(
        (tbl) => tbl.toUpperCase() === activeTable.toUpperCase()
      );
      const afterCurrent = allKnownTables
        .slice(currentIdx + 1)
        .find((tbl) => !nextPinned.has(tbl.toUpperCase()));
      const anyUnpinned = allKnownTables.find((tbl) => !nextPinned.has(tbl.toUpperCase()));
      if (afterCurrent || anyUnpinned) {
        setSelectedTable(afterCurrent || anyUnpinned || activeTable);
      }
    }
  };

  const handleRemoveMarker = (tableNumber: string) => {
    soundFX.playClick();
    setMarkers((prev) =>
      prev.filter((m) => m.tableNumber.trim().toUpperCase() !== tableNumber.trim().toUpperCase())
    );
  };

  const handleSaveFloorPlan = async () => {
    if (!imageUrl) return;
    soundFX.playClick();
    setIsSaving(true);
    setNotice(null);
    try {
      const payload: FloorPlanData = {
        imageUrl,
        markers,
        updatedAt: new Date().toISOString(),
      };
      await FirestoreService.saveFloorPlan(payload);
      if (!config.hasFloorPlan) {
        await onUpdateConfig({ ...config, hasFloorPlan: true });
      }
      setNotice({
        type: 'success',
        text: t(
          `บันทึกผังโต๊ะงานเลี้ยงและตำแหน่งหมุด (${markers.length} โต๊ะ) เรียบร้อยแล้ว`,
          `Saved banquet floor plan with ${markers.length} table pins.`
        ),
      });
    } catch {
      setNotice({
        type: 'error',
        text: t('บันทึกผังโต๊ะไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', 'Failed to save floor plan. Please try again.'),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteFloorPlan = async () => {
    soundFX.playClick();
    setIsSaving(true);
    setNotice(null);
    try {
      await FirestoreService.deleteFloorPlan();
      setImageUrl('');
      setMarkers([]);
      if (config.hasFloorPlan) {
        await onUpdateConfig({ ...config, hasFloorPlan: false });
      }
      setNotice({
        type: 'success',
        text: t('ลบผังโต๊ะงานเลี้ยงเรียบร้อยแล้ว', 'Floor plan removed.'),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-5 sm:p-6 rounded-3xl bg-white/95 dark:bg-[#140a2b]/95 border-2 border-cyan-300/70 dark:border-cyan-500/35 space-y-4 shadow-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-cyan-200/70 dark:border-purple-500/20">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white flex items-center justify-center shadow shrink-0">
            <MapIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
              {t('อัปโหลดผังโต๊ะงานเลี้ยง & ปักหมุดตำแหน่งโต๊ะ', 'Banquet Table Floor Plan & Pin Positions')}
            </h3>
            <p className="text-xs text-slate-600 dark:text-purple-200/80">
              {t(
                'เมื่อผู้เข้าร่วมงานลงทะเบียนสำเร็จ สามารถกด "ดูผังโต๊ะของคุณ" เพื่อดูสัญลักษณ์ชี้ตำแหน่งโต๊ะของตนเองบนรูปผังนี้ได้ทันที',
                'Attendees can tap "View Your Table Map" on their digital pass to see an animated pin marking their exact table.'
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleUploadFloorPlanFile}
            className="hidden"
          />
          {imageUrl && (
            <button
              type="button"
              disabled={isDetecting || isSaving}
              onClick={() => {
                soundFX.playClick();
                runAutoDetectTables(imageUrl, true);
              }}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-gradient-to-r from-fuchsia-600 via-rose-500 to-amber-500 hover:brightness-110 disabled:opacity-60 text-white text-xs font-extrabold flex items-center gap-1.5 shadow cursor-pointer"
            >
              {isDetecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ScanSearch className="w-4 h-4" />
              )}
              <span>
                {isDetecting
                  ? t('กำลังอ่านเลขโต๊ะจากรูป...', 'Scanning table numbers...')
                  : t('สแกนอ่านเลขโต๊ะอัตโนมัติ (อ้างอิง Excel)', 'Auto-Read Tables from Image')}
              </span>
            </button>
          )}
          <button
            type="button"
            disabled={isDetecting}
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 disabled:opacity-60 text-white text-xs font-bold flex items-center gap-1.5 shadow cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>
              {imageUrl
                ? t('เปลี่ยนรูปผังโต๊ะ', 'Replace Map Image')
                : t('อัปโหลดรูปผังโต๊ะ', 'Upload Floor Plan')}
            </span>
          </button>
        </div>
      </div>

      {isDetecting && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-fuchsia-500/15 via-amber-500/15 to-cyan-500/15 border border-fuchsia-400/50 text-fuchsia-800 dark:text-amber-200 text-xs font-bold flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-fuchsia-600 dark:text-amber-300 shrink-0" />
          <div>
            <div>
              {t(
                'ระบบกำลังอ่านตัวอักษรและตัวเลขบนรูปผังโต๊ะ พร้อมเทียบตำแหน่งกับเลขโต๊ะในไฟล์ Excel...',
                'Reading table numbers/letters on the floor plan image and matching with your Excel roster...'
              )}
            </div>
            <div className="text-[11px] font-medium opacity-80 mt-0.5">
              {t(
                `อ้างอิงรายชื่อโต๊ะจากไฟล์ Excel ทั้งหมด ${rosterTables.length} โต๊ะ`,
                `Cross-referencing ${rosterTables.length} unique tables from imported Excel file`
              )}
            </div>
          </div>
        </div>
      )}

      {notice && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
            notice.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-500/15 border-rose-500/35 text-rose-700 dark:text-rose-300'
          }`}
        >
          {notice.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{notice.text}</span>
        </div>
      )}

      {unmatchedTables.length > 0 && !isDetecting && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-400/45 text-xs space-y-2">
          <div className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              {t(
                `โต๊ะจากไฟล์ Excel ที่ยังไม่พบในรูป (${unmatchedTables.length} โต๊ะ) — คลิกชื่อโต๊ะแล้วแตะตำแหน่งบนแผนผังเพื่อปักเพิ่มได้:`,
                `${unmatchedTables.length} Excel table(s) were not auto-detected — click a table below then tap the map to pin it:`
              )}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {unmatchedTables.map((tbl) => (
              <button
                key={tbl}
                type="button"
                onClick={() => {
                  soundFX.playClick();
                  setSelectedTable(tbl);
                  setCustomTableInput('');
                }}
                className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold border transition cursor-pointer ${
                  selectedTable.toUpperCase() === tbl.toUpperCase()
                    ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow'
                    : 'bg-white dark:bg-zinc-900 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-500/40 hover:bg-amber-100 dark:hover:bg-amber-500/20'
                }`}
              >
                {tbl}
              </button>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="py-8 flex items-center justify-center gap-2 text-xs text-zinc-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{t('กำลังโหลดข้อมูลผังโต๊ะ...', 'Loading floor plan...')}</span>
        </div>
      ) : !imageUrl ? (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-cyan-300 dark:border-cyan-500/40 hover:border-fuchsia-500 rounded-2xl p-8 text-center cursor-pointer bg-cyan-50/40 dark:bg-zinc-950/60 transition"
        >
          <div className="w-12 h-12 rounded-2xl bg-white dark:bg-zinc-900 border border-cyan-200 dark:border-cyan-500/30 flex items-center justify-center mx-auto mb-2.5 text-cyan-600 dark:text-cyan-400 shadow-sm">
            <MapIcon className="w-6 h-6" />
          </div>
          <div className="text-sm font-bold text-zinc-900 dark:text-white">
            {t('คลิกเพื่ออัปโหลดรูปแผนผังโต๊ะงานเลี้ยง (.jpg / .png / .webp)', 'Click to upload banquet floor plan image (.jpg / .png / .webp)')}
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
            {t(
              'หลังอัปโหลดรูป ระบบจะอ่านตัวอักษรและตัวเลขบนรูปผังโต๊ะพร้อมจับคู่กับเลขโต๊ะจากไฟล์ Excel เพื่อปักหมุดให้อัตโนมัติ และสามารถคลิกปรับแก้เพิ่มเติมได้',
              'After upload, the system automatically reads table labels on the image, matches them with your Excel roster, and places precise pins (editable by clicking).'
            )}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Table Pin Selector Toolbar */}
          <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950/80 border border-zinc-200 dark:border-violet-800 flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="flex-1 flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-rose-500" />
                {t('เลือกโต๊ะที่จะปักหมุด:', 'Select table to pin:')}
              </span>

              {allKnownTables.length > 0 && (
                <select
                  value={selectedTable}
                  onChange={(e) => {
                    setSelectedTable(e.target.value);
                    setCustomTableInput('');
                  }}
                  className="min-h-[40px] px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-violet-700 text-xs font-mono font-bold text-zinc-900 dark:text-white focus:outline-none focus:border-fuchsia-500"
                >
                  {allKnownTables.map((tbl) => (
                    <option key={tbl} value={tbl}>
                      {pinnedSet.has(tbl.toUpperCase()) ? `✓ ${tbl}` : tbl}
                    </option>
                  ))}
                </select>
              )}

              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={customTableInput}
                  onChange={(e) => setCustomTableInput(e.target.value)}
                  placeholder={t('หรือพิมพ์ชื่อโต๊ะเอง (เช่น A1)', 'Or type table (e.g. A1)')}
                  className="min-h-[40px] w-44 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-violet-700 text-xs font-mono text-zinc-900 dark:text-white focus:outline-none focus:border-fuchsia-500"
                />
                {customTableInput.trim() && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-fuchsia-600 dark:text-amber-300">
                    <Plus className="w-3.5 h-3.5" />
                    {t('คลิกบนรูปเพื่อวาง', 'Click map to place')}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-bold text-cyan-700 dark:text-cyan-300 shrink-0">
              <span>
                {t(
                  `ปักหมุดแล้ว ${markers.length}${rosterTables.length ? ` / ${rosterTables.length}` : ''} โต๊ะ`,
                  `Pinned ${markers.length}${rosterTables.length ? ` / ${rosterTables.length}` : ''} tables`
                )}
              </span>
              {markers.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    soundFX.playClick();
                    setMarkers([]);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{t('ล้างหมุดทั้งหมด', 'Clear Pins')}</span>
                </button>
              )}
            </div>
          </div>

          <p className="text-[11px] text-zinc-600 dark:text-zinc-300 font-medium">
            {t(
              'วิธีใช้งาน: ระบบสแกนอ่านเลขโต๊ะจากรูปและปักหมุดให้ตรงกับไฟล์ Excel อัตโนมัติ หากต้องการปรับตำแหน่ง สามารถเลือกหมายเลขโต๊ะด้านบนแล้วคลิกตำแหน่งใหม่บนรูปได้เลย (คลิกที่หมุดเพื่อลบออก)',
              'Tip: Table pins are auto-detected from the image and matched with your Excel roster. To fine-tune any pin, select the table above and click its new position on the map (click any pin to remove).'
            )}
          </p>

          {/* Interactive Click-to-Pin Floor Plan Canvas */}
          <div className="flex justify-center bg-zinc-100 dark:bg-[#0b041c] rounded-2xl p-2 sm:p-4 border border-zinc-200 dark:border-violet-800 overflow-auto">
            <div
              ref={imageContainerRef}
              onClick={handleMapClick}
              className="relative inline-block cursor-crosshair select-none rounded-xl overflow-hidden shadow-lg"
            >
              <img
                src={imageUrl}
                alt={t('แผนผังโต๊ะงานเลี้ยง', 'Banquet Floor Plan')}
                className="block max-w-full max-h-[520px] w-auto h-auto pointer-events-none"
                draggable={false}
              />

              {markers.map((marker) => {
                const isSelected =
                  marker.tableNumber.trim().toUpperCase() ===
                  (customTableInput.trim() || selectedTable).trim().toUpperCase();
                return (
                  <button
                    key={marker.tableNumber}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveMarker(marker.tableNumber);
                    }}
                    title={t(
                      `โต๊ะ ${marker.tableNumber} — คลิกเพื่อลบหมุดนี้`,
                      `Table ${marker.tableNumber} — click to remove pin`
                    )}
                    style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 px-2 py-0.5 rounded-full text-[10px] font-mono font-black shadow-lg border-2 border-white transition hover:scale-110 cursor-pointer flex items-center gap-0.5 ${
                      isSelected
                        ? 'bg-amber-500 text-zinc-950 z-20 ring-4 ring-amber-300/60'
                        : 'bg-rose-600 text-white z-10 hover:bg-rose-500'
                    }`}
                  >
                    <MapPin className="w-2.5 h-2.5 shrink-0" />
                    <span>{marker.tableNumber}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Save & Delete Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <button
              type="button"
              disabled={isSaving}
              onClick={handleDeleteFloorPlan}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              <span>{t('ลบผังโต๊ะนี้', 'Remove Floor Plan')}</span>
            </button>

            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveFloorPlan}
              className="min-h-[46px] px-6 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-600 via-rose-500 to-amber-500 hover:brightness-110 disabled:opacity-60 text-white font-extrabold text-xs shadow-lg shadow-fuchsia-500/25 flex items-center gap-2 active:scale-95 transition cursor-pointer"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>
                {isSaving
                  ? t('กำลังบันทึกผังโต๊ะ...', 'Saving Floor Plan...')
                  : t('บันทึกผังโต๊ะ & ตำแหน่งหมุด', 'Save Floor Plan & Pins')}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
