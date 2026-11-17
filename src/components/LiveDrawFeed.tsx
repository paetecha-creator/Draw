import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Sparkles, Gift, Clock, MapPin, Volume2, VolumeX } from 'lucide-react';
import { LuckyDrawRecord, PartyConfig, Prize } from '../types/party';
import { soundFX } from '../utils/audio';
import { usePreferences } from '../contexts/PreferencesContext';

interface LiveDrawFeedProps {
  winners: LuckyDrawRecord[];
  prizes: Prize[];
  config: PartyConfig;
  onBackToTicket: () => void;
  hasMyPass: boolean;
}

export const LiveDrawFeed: React.FC<LiveDrawFeedProps> = ({
  winners,
  prizes,
  config,
  onBackToTicket,
  hasMyPass,
}) => {
  const { t, lang } = usePreferences();
  const [muted, setMuted] = useState(soundFX.getMuted());
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
  const latestWinner = winners.length > 0 ? winners[0] : null;

  useEffect(() => {
    if (latestWinner) {
      confetti({
        particleCount: 60,
        spread: 65,
        origin: { y: 0.4 },
        colors: ['#fbbf24', '#f59e0b', '#34d399', '#818cf8', '#f472b6'],
      });
    }
  }, [latestWinner?.id]);

  const toggleSound = () => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    soundFX.setMuted(nextMuted);
  };

  return (
    <div className="w-full max-w-3xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 mb-5 sm:mb-6">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-0.5 truncate">
            {config.eventName} · LIVE
          </p>
          <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            {t('LIVE ประกาศผลรางวัล Lucky Draw', 'LIVE Lucky Draw Results')}
          </h2>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={toggleSound}
            className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center transition cursor-pointer"
            title={muted ? t('เปิดเสียงเอฟเฟกต์', 'Unmute Sound') : t('ปิดเสียง', 'Mute Sound')}
          >
            {muted ? (
              <VolumeX className="w-4 h-4 text-rose-500 dark:text-rose-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            )}
          </button>

          {hasMyPass && (
            <button
              type="button"
              onClick={onBackToTicket}
              className="min-h-[44px] py-2 px-4 rounded-xl bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 font-semibold transition cursor-pointer whitespace-nowrap shrink-0"
            >
              {t('ดูบัตรของฉัน', 'My Pass')}
            </button>
          )}
        </div>
      </div>

      {/* LATEST WINNER SPOTLIGHT CARD */}
      {latestWinner ? (
        <div className="mb-8 relative rounded-3xl bg-white dark:bg-zinc-900 border border-amber-400/60 dark:border-amber-400/50 p-5 sm:p-7 shadow-2xl overflow-hidden animate-party-glow">
          <div className="text-center mb-5">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400">
              <Sparkles className="w-4 h-4" />
              <span>{t('ผู้โชคดีคนล่าสุด', 'Latest Winner')}</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 mt-1 text-balance">
              {latestWinner.prizeName}
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 font-medium mt-0.5">
              {latestWinner.prizeTier}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 bg-zinc-50 dark:bg-zinc-950/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
            <div className="relative shrink-0">
              <div className="w-32 h-40 sm:w-36 sm:h-44 rounded-2xl overflow-hidden border-2 border-amber-500 dark:border-amber-400 shadow-xl bg-zinc-200 dark:bg-zinc-900">
                {latestWinner.selfieUrl ? (
                  <img
                    src={latestWinner.selfieUrl}
                    alt={latestWinner.winnerName}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-zinc-500">
                    {t('ไม่มีรูปเซลฟี่', 'No Photo')}
                  </div>
                )}
              </div>
              <div className="absolute -top-2.5 -right-2.5 bg-amber-400 text-zinc-950 p-2 rounded-xl shadow-lg">
                <Trophy className="w-4 h-4" />
              </div>
            </div>

            <div className="text-center sm:text-left flex-1 min-w-0">
              <div className="text-xs font-mono text-amber-600 dark:text-amber-400 font-bold mb-1">
                {latestWinner.employeeId}
              </div>
              <h4 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight truncate">
                {latestWinner.winnerName}
              </h4>
              {latestWinner.nickname && (
                <p className="text-sm font-semibold text-amber-600 dark:text-amber-300 mt-0.5">
                  {t(`คุณ${latestWinner.nickname}`, latestWinner.nickname)}
                </p>
              )}
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1.5">
                {t(`แผนก ${latestWinner.department}`, latestWinner.department)}
              </p>

              <div className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-400/20 dark:bg-amber-400/15 text-amber-800 dark:text-amber-300 border border-amber-400/40 dark:border-amber-400/30 text-xs font-bold">
                <MapPin className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>{latestWinner.tableNumber}</span>
              </div>
            </div>
          </div>

          <div className="text-center mt-4 text-[11px] text-zinc-500 font-mono tabular-nums">
            {t('จับรางวัลเมื่อ', 'Drawn at')}{' '}
            {new Date(latestWinner.wonAt).toLocaleTimeString(lang === 'en' ? 'en-US' : 'th-TH', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </div>
        </div>
      ) : (
        <div className="mb-8 p-8 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-amber-400/15 dark:bg-amber-400/10 border border-amber-400/40 dark:border-amber-400/30 flex items-center justify-center mx-auto mb-3 text-amber-600 dark:text-amber-400">
            <Trophy className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-1">
            {t('การสุ่มจับรางวัล Lucky Draw จะเริ่มขึ้นเร็วๆ นี้', 'Lucky Draw Starting Soon')}
          </h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
            {t(
              'ภาพเซลฟี่และชื่อของผู้โชคดีที่ลงทะเบียนสำเร็จจะปรากฏขึ้นบนหน้าจอนี้แบบเรียลไทม์ทันทีที่จับรางวัล',
              'Verified winner selfies and names will appear live on this screen as soon as each round is drawn.'
            )}
          </p>
        </div>
      )}

      {/* Prize List & Remaining Status */}
      <div className="mb-8">
        <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-3 flex items-center gap-2">
          <Gift className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span>{t('รายการของรางวัลในค่ำคืนนี้', "Tonight's Prize Lineup")}</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {prizes.map((p) => {
            const hasValidImage = p.imageUrl && !brokenImages[p.id];
            return (
              <div
                key={p.id}
                className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center gap-3.5 shadow-xs"
              >
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shrink-0 flex items-center justify-center">
                  {hasValidImage ? (
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={() => setBrokenImages((prev) => ({ ...prev, [p.id]: true }))}
                    />
                  ) : (
                    <Gift className="w-6 h-6 text-amber-600/80 dark:text-amber-400/70" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">{p.name}</div>
                  <div className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5 truncate">{p.tier}</div>
                  {p.sponsor && (
                    <div className="text-[10px] text-amber-700 dark:text-amber-400/90 truncate mt-0.5">
                      {t(`มอบโดย ${p.sponsor}`, `Sponsored by ${p.sponsor}`)}
                    </div>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`text-xs font-mono tabular-nums font-bold ${
                      p.remaining > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400 dark:text-zinc-500'
                    }`}
                  >
                    {p.remaining > 0
                      ? t(`เหลือ ${p.remaining}`, `${p.remaining} left`)
                      : t('ครบแล้ว', 'Claimed')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ALL WINNERS HISTORY LIST */}
      <div>
        <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 mb-3 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>
              {t(`ทำเนียบผู้โชคดีทั้งหมด (${winners.length} ท่าน)`, `All Winners (${winners.length})`)}
            </span>
          </span>
        </h3>

        {winners.length > 0 ? (
          <div className="space-y-2.5">
            {winners.map((rec, index) => (
              <div
                key={rec.id}
                className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 flex items-center gap-3.5 transition shadow-xs"
              >
                <div className="w-12 h-14 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-950 shrink-0 border border-amber-500/50 dark:border-amber-400/40">
                  {rec.selfieUrl ? (
                    <img
                      src={rec.selfieUrl}
                      alt={rec.winnerName}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-amber-600 dark:text-amber-400 font-mono font-bold">
                      #{index + 1}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                      {rec.winnerName}
                    </span>
                    {rec.nickname && (
                      <span className="text-xs text-amber-600 dark:text-amber-300 font-medium">
                        ({rec.nickname})
                      </span>
                    )}
                    <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                      {rec.employeeId}
                    </span>
                  </div>
                  <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium truncate mt-0.5">
                    {rec.prizeName} <span className="text-zinc-400 dark:text-zinc-500">·</span>{' '}
                    <span className="text-zinc-700 dark:text-zinc-300">{rec.tableNumber}</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono tabular-nums block">
                    {new Date(rec.wonAt).toLocaleTimeString(lang === 'en' ? 'en-US' : 'th-TH', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    {t('ได้รับรางวัล', 'Winner')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-dashed border-zinc-300 dark:border-zinc-800 text-center text-xs text-zinc-500">
            {t('ยังไม่มีประวัติการแจกรางวัลในระบบ', 'No winners drawn yet.')}
          </div>
        )}
      </div>
    </div>
  );
};
