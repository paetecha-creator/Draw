import React from 'react';
import { Shield, Trophy, PartyPopper, Sun, Moon, Globe } from 'lucide-react';
import { soundFX } from '../utils/audio';
import { usePreferences } from '../contexts/PreferencesContext';

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
  const { theme, toggleTheme, lang, toggleLang, t } = usePreferences();

  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 dark:bg-zinc-950/90 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800/80 transition-colors">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-3 sm:gap-8">
        {/* Zone 1: Brand Title Wordmark */}
        <button
          type="button"
          onClick={() => {
            soundFX.playClick();
            onChangeView(hasMyTicket ? 'ticket' : 'register');
          }}
          className="flex items-center gap-2 sm:gap-2.5 text-left whitespace-nowrap shrink-0 group cursor-pointer"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-400/20 dark:bg-amber-400/15 border border-amber-500/40 dark:border-amber-400/30 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:bg-amber-400/30 transition-colors">
            <PartyPopper className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <span className="text-base sm:text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-100 whitespace-nowrap shrink-0">
            PartyPass <span className="text-amber-600 dark:text-amber-400">Live</span>
          </span>
        </button>

        {/* Zone 2: Concise Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-600 dark:text-zinc-400">
          <button
            type="button"
            onClick={() => {
              soundFX.playClick();
              onChangeView('register');
            }}
            className={`py-1 transition whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
              currentView === 'register'
                ? 'text-amber-600 dark:text-amber-400 border-amber-500 dark:border-amber-400 font-semibold'
                : 'border-transparent hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            {t('ลงทะเบียนเข้างาน', 'Check-in')}
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
                  ? 'text-amber-600 dark:text-amber-400 border-amber-500 dark:border-amber-400 font-semibold'
                  : 'border-transparent hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              {t('บัตรเข้างาน & โต๊ะ', 'My Pass & Table')}
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
                ? 'text-amber-600 dark:text-amber-400 border-amber-500 dark:border-amber-400 font-semibold'
                : 'border-transparent hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            <span>LIVE</span>
          </button>
        </nav>

        {/* Zone 3: Theme Toggle + Language Switcher + Admin Toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* TH / EN Switcher */}
          <button
            type="button"
            onClick={() => {
              soundFX.playClick();
              toggleLang();
            }}
            className="min-h-[38px] sm:min-h-[40px] px-2.5 sm:px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0"
            title={t('สลับภาษา ไทย / อังกฤษ', 'Switch Language TH / EN')}
            aria-label={t('สลับภาษา ไทย / อังกฤษ', 'Switch Language TH / EN')}
          >
            <Globe className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="font-mono tracking-wide">
              <span className={lang === 'th' ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-400 dark:text-zinc-500'}>TH</span>
              <span className="text-zinc-400 dark:text-zinc-600 mx-0.5">/</span>
              <span className={lang === 'en' ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-400 dark:text-zinc-500'}>EN</span>
            </span>
          </button>

          {/* Dark / Light Mode Toggle */}
          <button
            type="button"
            onClick={() => {
              soundFX.playClick();
              toggleTheme();
            }}
            className="min-h-[38px] min-w-[38px] sm:min-h-[40px] sm:min-w-[40px] p-2 rounded-xl bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 flex items-center justify-center transition cursor-pointer shrink-0"
            title={theme === 'dark' ? t('เปลี่ยนเป็นโหมดสว่าง (Light Mode)', 'Switch to Light Mode') : t('เปลี่ยนเป็นโหมดมืด (Dark Mode)', 'Switch to Dark Mode')}
            aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-zinc-700" />
            )}
          </button>

          {/* Admin Console Toggle (when logged in) */}
          {isAdminLoggedIn && (
            <button
              type="button"
              onClick={() => {
                soundFX.playClick();
                onChangeView(currentView === 'admin' ? (hasMyTicket ? 'ticket' : 'register') : 'admin');
              }}
              className={`min-h-[38px] sm:min-h-[40px] px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                currentView === 'admin'
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  : 'bg-amber-400 text-zinc-950 hover:bg-amber-300'
              }`}
            >
              <Shield className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">
                {currentView === 'admin'
                  ? t('ดูหน้าผู้ร่วมงาน', 'Attendee View')
                  : t('แดชบอร์ดแอดมิน', 'Admin Console')}
              </span>
              <span className="sm:hidden">
                {currentView === 'admin' ? t('มุมมองผู้ใช้', 'User') : t('แอดมิน', 'Admin')}
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
