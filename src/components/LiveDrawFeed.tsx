import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Sparkles, Gift, Clock, MapPin, Volume2, VolumeX } from 'lucide-react';
import { LuckyDrawRecord, PartyConfig, Prize } from '../types/party';
import { soundFX } from '../utils/audio';

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
      {/* Top Header - Dark Theme */}
      <div className="flex items-center justify-between gap-3 mb-5 sm:mb-6">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-amber-400 mb-0.5 truncate">
            {config.eventName} · LIVE
          </p>
          <h2 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight">
            LIVE ประกาศผลรางวัล Lucky Draw
          </h2>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={toggleSound}
            className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 hover:bg-zinc-800 flex items-center justify-center transition cursor-pointer"
            title={muted ? 'เปิดเสียงเอฟเฟกต์' : 'ปิดเสียง'}
          >
            {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {hasMyPass && (
            <button
              type="button"
              onClick={onBackToTicket}
              className="min-h-[44px] py-2 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-100 font-semibold transition cursor-pointer whitespace-nowrap shrink-0"
            >
              ดูบัตรของฉัน
            </button>
          )}
        </div>
      </div>

      {/* LATEST WINNER SPOTLIGHT CARD - Prominent Selfie Display */}
      {latestWinner ? (
        <div className="mb-8 relative rounded-3xl bg-zinc-900 border border-amber-400/50 p-5 sm:p-7 shadow-2xl overflow-hidden animate-party-glow">
          <div className="text-center mb-5">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400">
              <Sparkles className="w-4 h-4" />
              <span>ผู้โชคดีคนล่าสุด</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-zinc-100 mt-1 text-balance">
              {latestWinner.prizeName}
            </h3>
            <p className="text-xs text-zinc-400 font-medium mt-0.5">
              {latestWinner.prizeTier}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-6 bg-zinc-950/90 border border-zinc-800 rounded-2xl p-5">
            {/* Winner's Selfie Photo Prominently Featured */}
            <div className="relative shrink-0">
              <div className="w-32 h-40 sm:w-36 sm:h-44 rounded-2xl overflow-hidden border-2 border-amber-400 shadow-xl bg-zinc-900">
                {latestWinner.selfieUrl ? (
                  <img
                    src={latestWinner.selfieUrl}
                    alt={latestWinner.winnerName}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-zinc-500">
                    ไม่มีรูปเซลฟี่
                  </div>
                )}
              </div>
              <div className="absolute -top-2.5 -right-2.5 bg-amber-400 text-zinc-950 p-2 rounded-xl shadow-lg">
                <Trophy className="w-4 h-4" />
              </div>
            </div>

            <div className="text-center sm:text-left flex-1 min-w-0">
              <div className="text-xs font-mono text-amber-400 font-bold mb-1">
                {latestWinner.employeeId}
              </div>
              <h4 className="text-2xl sm:text-3xl font-bold text-zinc-100 tracking-tight truncate">
                {latestWinner.winnerName}
              </h4>
              {latestWinner.nickname && (
                <p className="text-sm font-semibold text-amber-300 mt-0.5">
                  คุณ{latestWinner.nickname}
                </p>
              )}
              <p className="text-xs text-zinc-400 mt-1.5">
                แผนก {latestWinner.department}
              </p>

              <div className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-400/15 text-amber-300 border border-amber-400/30 text-xs font-bold">
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>{latestWinner.tableNumber}</span>
              </div>
            </div>
          </div>

          <div className="text-center mt-4 text-[11px] text-zinc-500 font-mono tabular-nums">
            จับรางวัลเมื่อ{' '}
            {new Date(latestWinner.wonAt).toLocaleTimeString('th-TH', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </div>
        </div>
      ) : (
        <div className="mb-8 p-8 rounded-3xl bg-zinc-900 border border-zinc-800 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center mx-auto mb-3 text-amber-400">
            <Trophy className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-zinc-100 mb-1">
            การสุ่มจับรางวัล Lucky Draw จะเริ่มขึ้นเร็วๆ นี้
          </h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
            ภาพเซลฟี่และชื่อของผู้โชคดีที่ลงทะเบียนสำเร็จจะปรากฏขึ้นบนหน้าจอนี้แบบเรียลไทม์ทันทีที่จับรางวัล
          </p>
        </div>
      )}

      {/* Prize List & Remaining Status */}
      <div className="mb-8">
        <h3 className="text-sm font-bold text-zinc-200 mb-3 flex items-center gap-2">
          <Gift className="w-4 h-4 text-amber-400" />
          <span>รายการของรางวัลในค่ำคืนนี้</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {prizes.map((p) => {
            const hasValidImage = p.imageUrl && !brokenImages[p.id];
            return (
              <div
                key={p.id}
                className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center gap-3.5"
              >
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 shrink-0 flex items-center justify-center">
                  {hasValidImage ? (
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={() => setBrokenImages((prev) => ({ ...prev, [p.id]: true }))}
                    />
                  ) : (
                    <Gift className="w-6 h-6 text-amber-400/70" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-zinc-100 truncate">{p.name}</div>
                  <div className="text-[11px] text-zinc-400 mt-0.5 truncate">{p.tier}</div>
                  {p.sponsor && (
                    <div className="text-[10px] text-amber-400/90 truncate mt-0.5">มอบโดย {p.sponsor}</div>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`text-xs font-mono tabular-nums font-bold ${
                      p.remaining > 0 ? 'text-emerald-400' : 'text-zinc-500'
                    }`}
                  >
                    {p.remaining > 0 ? `เหลือ ${p.remaining}` : 'ครบแล้ว'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ALL WINNERS HISTORY LIST */}
      <div>
        <h3 className="text-sm font-bold text-zinc-200 mb-3 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>ทำเนียบผู้โชคดีทั้งหมด ({winners.length} ท่าน)</span>
          </span>
        </h3>

        {winners.length > 0 ? (
          <div className="space-y-2.5">
            {winners.map((rec, index) => (
              <div
                key={rec.id}
                className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 flex items-center gap-3.5 transition"
              >
                <div className="w-12 h-14 rounded-xl overflow-hidden bg-zinc-950 shrink-0 border border-amber-400/40">
                  {rec.selfieUrl ? (
                    <img
                      src={rec.selfieUrl}
                      alt={rec.winnerName}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-amber-400 font-mono font-bold">
                      #{index + 1}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-zinc-100 truncate">
                      {rec.winnerName}
                    </span>
                    {rec.nickname && (
                      <span className="text-xs text-amber-300 font-medium">
                        ({rec.nickname})
                      </span>
                    )}
                    <span className="text-[11px] font-mono text-zinc-400">
                      {rec.employeeId}
                    </span>
                  </div>
                  <div className="text-[11px] text-amber-400 font-medium truncate mt-0.5">
                    {rec.prizeName} <span className="text-zinc-500">·</span> <span className="text-zinc-300">{rec.tableNumber}</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[11px] text-zinc-400 font-mono tabular-nums block">
                    {new Date(rec.wonAt).toLocaleTimeString('th-TH', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-semibold">
                    ได้รับรางวัล
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-zinc-900 border border-dashed border-zinc-800 text-center text-xs text-zinc-500">
            ยังไม่มีประวัติการแจกรางวัลในระบบ
          </div>
        )}
      </div>
    </div>
  );
};
