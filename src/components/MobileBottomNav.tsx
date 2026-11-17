import React from 'react';
import { UserCheck, Ticket, Trophy, Shield } from 'lucide-react';
import { soundFX } from '../utils/audio';
import { usePreferences } from '../contexts/PreferencesContext';

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
  const { t } = usePreferences();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#120627]/95 backdrop-blur-xl border-t-2 border-fuchsia-300/60 dark:border-fuchsia-500/35 pb-safe shadow-2xl transition-colors">
      <div className={`grid ${isAdminLoggedIn ? 'grid-cols-4' : 'grid-cols-3'} items-center h-14 px-1`}>
        {/* Tab 1: Register */}
        <button
          type="button"
          onClick={() => {
            soundFX.playClick();
            onChangeView('register');
          }}
          className={`flex flex-col items-center justify-center min-h-[44px] transition cursor-pointer ${
            currentView === 'register'
              ? 'text-fuchsia-600 dark:text-fuchsia-400 font-bold'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          <UserCheck className="w-5 h-5" />
          <span className="text-[10px] font-medium mt-0.5 leading-none">
            {t('ลงทะเบียน', 'Check-in')}
          </span>
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
            currentView === 'ticket'
              ? 'text-cyan-600 dark:text-cyan-400 font-bold'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          <Ticket className="w-5 h-5" />
          <span className="text-[10px] font-medium mt-0.5 leading-none">
            {hasMyTicket ? t('บัตรของฉัน', 'My Pass') : t('บัตรเข้างาน', 'Pass')}
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
            currentView === 'livedraw'
              ? 'text-amber-600 dark:text-amber-300 font-bold'
              : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
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
              currentView === 'admin'
                ? 'text-violet-600 dark:text-violet-300 font-bold'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Shield className="w-5 h-5" />
            <span className="text-[10px] font-medium mt-0.5 leading-none">
              {t('แดชบอร์ด', 'Admin')}
            </span>
          </button>
        )}
      </div>
    </nav>
  );
};
