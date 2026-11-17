import React from 'react';
import { Shield, Trophy, PartyPopper } from 'lucide-react';
import { soundFX } from '../utils/audio';

interface NavbarProps {
  currentView: 'register' | 'ticket' | 'livedraw' | 'admin' | 'vip';
  onChangeView: (view: 'register' | 'ticket' | 'livedraw' | 'admin' | 'vip') => void;
  isAdminLoggedIn: boolean;
  hasMyTicket: boolean;
  onOpenAdminLogin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onChangeView,
  isAdminLoggedIn,
  hasMyTicket,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80">
      <div className="max-w-6xl mx-auto px-4 h-14 sm:h-16 flex items-center justify-between gap-4 sm:gap-8">
        {/* Zone 1: Brand Title Wordmark */}
        <button
          type="button"
          onClick={() => {
            soundFX.playClick();
            onChangeView(hasMyTicket ? 'ticket' : 'register');
          }}
          className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 group cursor-pointer"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center text-amber-400 group-hover:bg-amber-400/25 transition-colors">
            <PartyPopper className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <span className="text-base sm:text-lg font-bold tracking-tight text-zinc-100 whitespace-nowrap shrink-0">
            PartyPass <span className="text-amber-400">Live</span>
          </span>
        </button>

        {/* Zone 2: Concise Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-400">
          <button
            type="button"
            onClick={() => {
              soundFX.playClick();
              onChangeView('register');
            }}
            className={`py-1 transition whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
              currentView === 'register'
                ? 'text-amber-400 border-amber-400 font-semibold'
                : 'border-transparent hover:text-zinc-100'
            }`}
          >
            ลงทะเบียนเข้างาน
          </button>

          {hasMyTicket && (
            <button
              type="button"
              onClick={() => {
                soundFX.playClick();
                onChangeView('ticket');
              }}
              className={`py-1 transition whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
                currentView === 'ticket'
                  ? 'text-amber-400 border-amber-400 font-semibold'
                  : 'border-transparent hover:text-zinc-100'
              }`}
            >
              บัตรเข้างาน &amp; โต๊ะ
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              soundFX.playClick();
              onChangeView('livedraw');
            }}
            className={`py-1 transition whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 border-b-2 ${
              currentView === 'livedraw'
                ? 'text-amber-400 border-amber-400 font-semibold'
                : 'border-transparent hover:text-zinc-100'
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>LIVE</span>
          </button>
        </nav>

        {/* Zone 3: Admin Status / Toggle (Only shown when admin is logged in) */}
        {isAdminLoggedIn && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                soundFX.playClick();
                onChangeView(currentView === 'admin' ? (hasMyTicket ? 'ticket' : 'register') : 'admin');
              }}
              className={`min-h-[40px] px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                currentView === 'admin'
                  ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 hover:bg-zinc-700'
                  : 'bg-amber-400 text-zinc-950 hover:bg-amber-300'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>
                {currentView === 'admin' ? 'ดูหน้าผู้ร่วมงาน' : 'แดชบอร์ดแอดมิน'}
              </span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
