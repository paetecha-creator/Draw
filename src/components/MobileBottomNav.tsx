import React from 'react';
import { UserCheck, Ticket, Trophy, Shield } from 'lucide-react';
import { soundFX } from '../utils/audio';

interface MobileBottomNavProps {
  currentView: 'register' | 'ticket' | 'livedraw' | 'admin' | 'vip';
  onChangeView: (view: 'register' | 'ticket' | 'livedraw' | 'admin' | 'vip') => void;
  isAdminLoggedIn: boolean;
  hasMyTicket: boolean;
  onOpenAdminLogin: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  onChangeView,
  isAdminLoggedIn,
  hasMyTicket,
}) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800 pb-safe shadow-2xl">
      <div className={`grid ${isAdminLoggedIn ? 'grid-cols-4' : 'grid-cols-3'} items-center h-14 px-1`}>
        {/* Tab 1: Register */}
        <button
          type="button"
          onClick={() => {
            soundFX.playClick();
            onChangeView('register');
          }}
          className={`flex flex-col items-center justify-center min-h-[44px] transition cursor-pointer ${
            currentView === 'register' ? 'text-amber-400 font-semibold' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <UserCheck className="w-5 h-5" />
          <span className="text-[10px] font-medium mt-0.5 leading-none">ลงทะเบียน</span>
        </button>

        {/* Tab 2: My Pass */}
        <button
          type="button"
          onClick={() => {
            soundFX.playClick();
            if (hasMyTicket) {
              onChangeView('ticket');
            } else {
              onChangeView('register');
            }
          }}
          className={`flex flex-col items-center justify-center min-h-[44px] transition relative cursor-pointer ${
            currentView === 'ticket' ? 'text-amber-400 font-semibold' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Ticket className="w-5 h-5" />
          <span className="text-[10px] font-medium mt-0.5 leading-none">
            {hasMyTicket ? 'บัตรของฉัน' : 'บัตรเข้างาน'}
          </span>
        </button>

        {/* Tab 3: LIVE */}
        <button
          type="button"
          onClick={() => {
            soundFX.playClick();
            onChangeView('livedraw');
          }}
          className={`flex flex-col items-center justify-center min-h-[44px] transition relative cursor-pointer ${
            currentView === 'livedraw' ? 'text-amber-400 font-semibold' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Trophy className="w-5 h-5" />
          <span className="text-[10px] font-bold tracking-wider mt-0.5 leading-none">LIVE</span>
        </button>

        {/* Tab 4: Admin (Only visible when Admin is logged in) */}
        {isAdminLoggedIn && (
          <button
            type="button"
            onClick={() => {
              soundFX.playClick();
              onChangeView('admin');
            }}
            className={`flex flex-col items-center justify-center min-h-[44px] transition cursor-pointer ${
              currentView === 'admin' ? 'text-amber-400 font-semibold' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Shield className="w-5 h-5" />
            <span className="text-[10px] font-medium mt-0.5 leading-none">แดชบอร์ด</span>
          </button>
        )}
      </div>
    </nav>
  );
};
