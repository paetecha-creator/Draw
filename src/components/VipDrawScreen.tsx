import React, { useState } from 'react';
import { Trophy, Crown, Sparkles, Lock, Gift, Volume2, VolumeX } from 'lucide-react';
import { LuckyDrawRecord, PartyConfig, Prize } from '../types/party';
import { soundFX } from '../utils/audio';

interface VipDrawScreenProps {
  config: PartyConfig;
  prizes: Prize[];
  luckyWinners: LuckyDrawRecord[];
  onTriggerLuckyDraw: () => void;
  onExitVipView?: () => void;
}

export const VipDrawScreen: React.FC<VipDrawScreenProps> = ({
  config,
  prizes,
  luckyWinners,
  onTriggerLuckyDraw,
  onExitVipView,
}) => {
  const [muted, setMuted] = useState(soundFX.getMuted());
  const [isPressing, setIsPressing] = useState(false);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  // Active prize selected by admin for VIP to draw
  const activePrize = prizes.find((p) => p.id === config.vipActivePrizeId) || prizes[0];
  const latestWinner = luckyWinners.length > 0 ? luckyWinners[0] : null;

  const toggleSound = () => {
    const next = !muted;
    setMuted(next);
    soundFX.setMuted(next);
  };

  const handleVipButtonPress = () => {
    if (!config.isVipTriggerActive) {
      alert('The button is not active yet. Please wait for the Admin to unlock this round.');
      return;
    }

    setIsPressing(true);
    soundFX.playClick();
    onTriggerLuckyDraw();
    setTimeout(() => {
      setIsPressing(false);
    }, 1500);
  };

  const hasValidPrizeImage = activePrize?.imageUrl && !brokenImages[activePrize.id];

  return (
    <div className="w-full max-w-md mx-auto min-h-[85vh] flex flex-col justify-between py-4 px-2">
      {/* Top VIP Bar - 100% English */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-amber-400 tracking-wide flex items-center gap-1">
                <span className="truncate max-w-[180px]">{config.eventName || 'VIP Remote'}</span>
              </div>
              <h2 className="text-base font-bold text-zinc-100">
                Executive Lucky Draw Portal
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleSound}
              className="min-h-[44px] min-w-[44px] p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 hover:bg-zinc-800 flex items-center justify-center cursor-pointer"
              title={muted ? 'Unmute Sound' : 'Mute Sound'}
            >
              {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
            </button>
            {onExitVipView && (
              <button
                type="button"
                onClick={onExitVipView}
                className="min-h-[44px] px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-zinc-100 text-xs font-semibold cursor-pointer"
              >
                Exit
              </button>
            )}
          </div>
        </div>

        {/* ACTIVE PRIZE SPOTLIGHT CARD */}
        {activePrize && (
          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 shadow-xl p-4 sm:p-5 mb-5 relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-2.5">
              <span className="font-semibold text-amber-400">
                {activePrize.tier}
              </span>
              <span className="font-mono tabular-nums text-zinc-400">
                Remaining: {activePrize.remaining} / {activePrize.quantity}
              </span>
            </div>

            {hasValidPrizeImage ? (
              <div className="w-full h-40 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 mb-3 relative">
                <img
                  src={activePrize.imageUrl}
                  alt={activePrize.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={() => setBrokenImages((prev) => ({ ...prev, [activePrize.id]: true }))}
                />
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/75 to-transparent pointer-events-none" />
                <div className="absolute bottom-2 right-2 px-2.5 py-0.5 rounded-lg bg-zinc-950/85 border border-zinc-700 text-[10px] font-semibold text-amber-400">
                  Active Prize
                </div>
              </div>
            ) : (
              <div className="w-full h-24 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center mb-3">
                <Gift className="w-10 h-10 text-amber-400/70" />
              </div>
            )}

            <h3 className="text-xl font-bold text-zinc-100 tracking-tight">
              {activePrize.name}
            </h3>
            {activePrize.sponsor && (
              <p className="text-xs text-amber-400 font-medium mt-0.5">
                Sponsored by: {activePrize.sponsor}
              </p>
            )}
            {activePrize.description && (
              <p className="text-xs text-zinc-400 mt-1">
                {activePrize.description}
              </p>
            )}
          </div>
        )}
      </div>

      {/* CENTERPIECE: GIANT VIP LUCKY DRAW BUTTON */}
      <div className="my-auto py-4 flex flex-col items-center">
        {config.isVipTriggerActive ? (
          /* UNLOCKED STATE - EXECUTIVE CAN PRESS */
          <div className="w-full flex flex-col items-center">
            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-bold mb-5">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Admin has unlocked! Ready to press</span>
            </div>

            <button
              type="button"
              disabled={isPressing}
              onClick={handleVipButtonPress}
              className="w-56 h-56 sm:w-64 sm:h-64 rounded-full p-2.5 bg-gradient-to-tr from-amber-400 via-amber-300 to-yellow-500 shadow-2xl shadow-amber-500/25 hover:scale-105 active:scale-95 transition-all transform flex items-center justify-center cursor-pointer group"
              aria-label="Press to draw Lucky Draw winner"
            >
              <div className="w-full h-full rounded-full bg-zinc-950 border-4 border-amber-300/60 flex flex-col items-center justify-center group-hover:bg-zinc-900 transition">
                <Trophy className="w-16 h-16 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
                <span className="text-xl sm:text-2xl font-bold tracking-wider text-zinc-100">
                  LUCKY DRAW
                </span>
                <span className="text-xs font-semibold text-amber-400 mt-1 tracking-wide">
                  Tap to pick winner
                </span>
              </div>
            </button>
            <p className="text-xs text-zinc-400 text-center mt-5 max-w-xs leading-relaxed">
              Once pressed, the system will draw a winner and automatically relock the button for the next round.
            </p>
          </div>
        ) : (
          /* LOCKED STATE - WAITING FOR ADMIN */
          <div className="w-full flex flex-col items-center">
            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-zinc-900 text-amber-400 border border-zinc-800 text-xs font-semibold mb-5">
              <Lock className="w-3.5 h-3.5" />
              <span>Waiting for Admin to unlock...</span>
            </div>

            <div className="w-52 h-52 sm:w-60 sm:h-60 rounded-full p-2.5 bg-zinc-800/80 shadow-inner flex items-center justify-center opacity-80">
              <div className="w-full h-full rounded-full bg-zinc-950 border-2 border-zinc-800 flex flex-col items-center justify-center text-center p-4">
                <Lock className="w-12 h-12 text-zinc-600 mb-2" />
                <span className="text-lg font-bold text-zinc-400">
                  Ready to Draw
                </span>
                <span className="text-[11px] text-zinc-500 mt-1">
                  Admin will unlock when it is your turn
                </span>
              </div>
            </div>

            <p className="mt-5 text-xs text-zinc-500 text-center">
              This screen will unlock automatically in real-time
            </p>
          </div>
        )}
      </div>

      {/* LATEST WINNER PREVIEW BANNER */}
      {latestWinner && (
        <div className="mt-4 p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-lg flex items-center gap-3">
          <div className="w-12 h-14 rounded-xl overflow-hidden bg-zinc-950 border border-amber-400/50 shrink-0">
            {latestWinner.selfieUrl ? (
              <img
                src={latestWinner.selfieUrl}
                alt={latestWinner.winnerName}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-amber-400 font-bold">
                WIN
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
              Latest Winner
            </div>
            <div className="text-sm font-bold text-zinc-100 truncate">
              {latestWinner.winnerName} {latestWinner.nickname && `(${latestWinner.nickname})`}
            </div>
            <div className="text-xs text-zinc-400 truncate">
              {latestWinner.department} · {latestWinner.tableNumber}
            </div>
          </div>
          <span className="text-xs font-semibold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 rounded-lg shrink-0">
            {latestWinner.prizeName}
          </span>
        </div>
      )}
    </div>
  );
};
