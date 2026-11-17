import React, { useState } from 'react';
import { Trophy, Crown, Sparkles, Lock, Gift, Volume2, VolumeX, Users } from 'lucide-react';
import { LuckyDrawRecord, PartyConfig, Prize } from '../types/party';
import { soundFX } from '../utils/audio';

interface VipDrawScreenProps {
  config: PartyConfig;
  prizes: Prize[];
  luckyWinners: LuckyDrawRecord[];
  eligibleCount?: number;
  onTriggerLuckyDraw: () => Promise<void> | void;
  onExitVipView?: () => void;
}

export const VipDrawScreen: React.FC<VipDrawScreenProps> = ({
  config,
  prizes,
  luckyWinners,
  eligibleCount = 0,
  onTriggerLuckyDraw,
  onExitVipView,
}) => {
  const [muted, setMuted] = useState(soundFX.getMuted());
  const [isPressing, setIsPressing] = useState(false);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  const getTrueRemaining = (prize: Prize | undefined | null): number => {
    if (!prize) return 0;
    const drawnCount = luckyWinners.filter((w) => w.prizeId === prize.id).length;
    return Math.min(prize.remaining, Math.max(0, prize.quantity - drawnCount));
  };

  const activePrize =
    prizes.find((p) => p.id === config.vipActivePrizeId) ||
    prizes.find((p) => getTrueRemaining(p) > 0) ||
    prizes[0];
  const activePrizeRemaining = getTrueRemaining(activePrize);
  const latestWinner = luckyWinners.length > 0 ? luckyWinners[0] : null;
  const canExecuteDraw = Boolean(activePrize && activePrizeRemaining > 0 && eligibleCount > 0);

  const toggleSound = () => {
    const next = !muted;
    setMuted(next);
    soundFX.setMuted(next);
  };

  const handleVipButtonPress = async () => {
    if (!config.isVipTriggerActive) {
      return;
    }
    if (!activePrize || activePrizeRemaining <= 0 || eligibleCount <= 0) {
      return;
    }

    setIsPressing(true);
    soundFX.playClick();
    try {
      await onTriggerLuckyDraw();
    } finally {
      setTimeout(() => {
        setIsPressing(false);
      }, 1200);
    }
  };

  const hasValidPrizeImage = activePrize?.imageUrl && !brokenImages[activePrize.id];

  return (
    <div className="w-full max-w-md mx-auto min-h-[80vh] flex flex-col justify-between py-2 sm:py-4 px-1 sm:px-2">
      {/* Top VIP Bar - 100% English */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-fuchsia-500 via-orange-500 to-amber-400 flex items-center justify-center text-white shadow-lg shrink-0">
              <Crown className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-fuchsia-600 dark:text-amber-300 tracking-wide truncate">
                {config.eventName || 'VIP Remote'}
              </div>
              <h2 className="text-base font-extrabold text-zinc-900 dark:text-white truncate">
                Executive Lucky Draw Portal
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={toggleSound}
              className="min-h-[44px] min-w-[44px] p-2 rounded-xl bg-white dark:bg-violet-950/80 border border-fuchsia-300/60 dark:border-fuchsia-500/40 text-zinc-700 dark:text-zinc-100 hover:bg-fuchsia-50 dark:hover:bg-violet-900 flex items-center justify-center cursor-pointer"
              title={muted ? 'Unmute Sound' : 'Mute Sound'}
            >
              {muted ? (
                <VolumeX className="w-4 h-4 text-rose-500 dark:text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              )}
            </button>
            {onExitVipView && (
              <button
                type="button"
                onClick={onExitVipView}
                className="min-h-[44px] px-3 py-1.5 rounded-xl bg-white dark:bg-violet-950/80 border border-fuchsia-300/60 dark:border-violet-700 text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white text-xs font-bold cursor-pointer"
              >
                Exit
              </button>
            )}
          </div>
        </div>

        {/* ACTIVE PRIZE SPOTLIGHT CARD */}
        {activePrize && (
          <div className="rounded-2xl bg-white/95 dark:bg-[#140a2b]/95 border-2 border-fuchsia-300/60 dark:border-fuchsia-500/40 shadow-xl p-4 sm:p-5 mb-5 relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-300 mb-2.5">
              <span className="font-bold text-fuchsia-600 dark:text-amber-300">
                {activePrize.tier}
              </span>
              <span className="font-mono tabular-nums text-cyan-700 dark:text-cyan-300 font-bold">
                Remaining: {activePrizeRemaining} / {activePrize.quantity}
              </span>
            </div>

            {hasValidPrizeImage ? (
              <div className="w-full h-40 rounded-xl overflow-hidden border border-fuchsia-200 dark:border-violet-700 bg-zinc-100 dark:bg-zinc-950 mb-3 relative">
                <img
                  src={activePrize.imageUrl}
                  alt={activePrize.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={() => setBrokenImages((prev) => ({ ...prev, [activePrize.id]: true }))}
                />
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/75 to-transparent pointer-events-none" />
                <div className="absolute bottom-2 right-2 px-2.5 py-0.5 rounded-lg bg-gradient-to-r from-fuchsia-500 to-amber-400 text-[10px] font-bold text-white shadow">
                  Active Prize
                </div>
              </div>
            ) : (
              <div className="w-full h-24 rounded-xl bg-gradient-to-br from-fuchsia-100 to-amber-100 dark:from-violet-950 dark:to-zinc-950 border border-fuchsia-200 dark:border-violet-700 flex items-center justify-center mb-3">
                <Gift className="w-10 h-10 text-fuchsia-500 dark:text-amber-400" />
              </div>
            )}

            <h3 className="text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
              {activePrize.name}
            </h3>
            {activePrize.sponsor && (
              <p className="text-xs text-orange-600 dark:text-amber-300 font-semibold mt-0.5">
                Sponsored by: {activePrize.sponsor}
              </p>
            )}
            <div className="flex items-center justify-between gap-2 mt-2 text-xs text-zinc-600 dark:text-zinc-300">
              <span className="truncate">{activePrize.description || 'Ready for Live Draw'}</span>
              <span className="inline-flex items-center gap-1 font-mono font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                <Users className="w-3.5 h-3.5" />
                {eligibleCount} eligible
              </span>
            </div>
          </div>
        )}
      </div>

      {/* CENTERPIECE: GIANT VIP LUCKY DRAW BUTTON */}
      <div className="my-auto py-4 flex flex-col items-center">
        {config.isVipTriggerActive ? (
          <div className="w-full flex flex-col items-center">
            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-400/50 text-xs font-extrabold mb-5 shadow-md">
              <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-300" />
              <span>
                {canExecuteDraw
                  ? 'Admin has unlocked! Ready to press'
                  : eligibleCount === 0
                  ? 'Unlocked — waiting for checked-in attendees'
                  : 'Unlocked — selected prize is out of stock'}
              </span>
            </div>

            <button
              type="button"
              disabled={isPressing || !canExecuteDraw}
              onClick={handleVipButtonPress}
              className={`w-56 h-56 sm:w-64 sm:h-64 rounded-full p-2.5 bg-gradient-to-tr from-fuchsia-500 via-amber-400 to-cyan-400 animate-gradient-flow shadow-2xl shadow-fuchsia-500/35 transition-all transform flex items-center justify-center group ${
                canExecuteDraw && !isPressing
                  ? 'hover:scale-105 active:scale-95 cursor-pointer'
                  : 'opacity-55 cursor-not-allowed'
              }`}
              aria-label="Press to draw Lucky Draw winner"
            >
              <div className="w-full h-full rounded-full bg-zinc-950/95 border-4 border-white/70 flex flex-col items-center justify-center group-hover:bg-violet-950 transition">
                <Trophy className="w-16 h-16 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xl sm:text-2xl font-extrabold tracking-wider bg-gradient-to-r from-amber-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">
                  {isPressing ? 'DRAWING...' : 'LUCKY DRAW'}
                </span>
                <span className="text-xs font-bold text-amber-300 mt-1 tracking-wide">
                  {canExecuteDraw ? 'Tap to pick winner' : 'Unavailable'}
                </span>
              </div>
            </button>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 text-center mt-5 max-w-xs leading-relaxed">
              Once pressed, the winner appears instantly on the LIVE screen and Admin Dashboard, and this button locks automatically.
            </p>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center">
            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-white dark:bg-violet-950/80 text-fuchsia-600 dark:text-amber-300 border border-fuchsia-300/60 dark:border-fuchsia-500/40 text-xs font-bold mb-5">
              <Lock className="w-3.5 h-3.5" />
              <span>Waiting for Admin to unlock...</span>
            </div>

            <div className="w-52 h-52 sm:w-60 sm:h-60 rounded-full p-2.5 bg-gradient-to-tr from-fuchsia-300/50 via-amber-200/50 to-cyan-300/50 dark:from-fuchsia-900/50 dark:via-violet-900/50 dark:to-cyan-900/50 shadow-inner flex items-center justify-center opacity-90">
              <div className="w-full h-full rounded-full bg-white dark:bg-[#140a2b] border-2 border-fuchsia-200 dark:border-violet-700 flex flex-col items-center justify-center text-center p-4">
                <Lock className="w-12 h-12 text-fuchsia-400 dark:text-violet-400 mb-2" />
                <span className="text-lg font-extrabold text-zinc-800 dark:text-zinc-200">
                  Ready to Draw
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                  Admin will unlock when it is your turn
                </span>
              </div>
            </div>

            <p className="mt-5 text-xs text-zinc-600 dark:text-zinc-400 text-center">
              This screen will unlock automatically in real-time
            </p>
          </div>
        )}
      </div>

      {/* LATEST WINNER PREVIEW BANNER */}
      {latestWinner && (
        <div className="mt-4 p-3.5 rounded-2xl bg-white/95 dark:bg-[#140a2b]/95 border-2 border-amber-400/60 shadow-lg flex items-center gap-3">
          <div className="w-12 h-14 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-950 border-2 border-amber-400 shrink-0">
            {latestWinner.selfieUrl ? (
              <img
                src={latestWinner.selfieUrl}
                alt={latestWinner.winnerName}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-amber-600 dark:text-amber-400 font-bold">
                WIN
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-extrabold text-fuchsia-600 dark:text-amber-300 uppercase tracking-wider">
              Latest Winner
            </div>
            <div className="text-sm font-extrabold text-zinc-900 dark:text-white truncate">
              {latestWinner.winnerName} {latestWinner.nickname && `(${latestWinner.nickname})`}
            </div>
            <div className="text-xs text-zinc-600 dark:text-zinc-300 truncate">
              {latestWinner.department} · {latestWinner.tableNumber}
            </div>
          </div>
          <span className="text-xs font-extrabold text-white bg-gradient-to-r from-fuchsia-500 to-amber-500 px-2.5 py-1 rounded-lg shrink-0 shadow">
            {latestWinner.prizeName}
          </span>
        </div>
      )}
    </div>
  );
};
