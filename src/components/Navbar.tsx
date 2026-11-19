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
    <header className="sticky top-0 z-40 w-full bg-white/90 dark:bg-[#120627]/90 backdrop-blur-md border-b-2 border-fuchsia-300/60 dark:border-fuchsia-500/35 transition-colors shadow-sm">
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
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-fuchsia-500 via-orange-500 to-amber-400 flex items-center justify-center text-white shadow-md shadow-fuchsia-500/30 group-hover:scale-105 transition-transform">
            <PartyPopper className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <span className="text-base sm:text-lg font-extrabold tracking-tight text-zinc-900 dark:text-white whitespace-nowrap shrink-0">
            PartyPass{' '}
            <span className="bg-gradient-to-r from-fuchsia-600 via-orange-500 to-cyan-500 dark:from-amber-300 dark:via-fuchsia-400 dark:to-cyan-300 bg-clip-text text-transparent">
              Live
            </span>
          </span>
        </button>

        {/* Zone 2: Concise Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-600 dark:text-zinc-300">
          <button
            type="button"
            onClick={() => {
              soundFX.playClick();
              onChangeView('register');
            }}
            className={`py-1 transition whitespace-nowrap shrink-0 cursor-pointer border-b-2 ${
              currentView === 'register'
                ? 'text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500 dark:border-fuchsia-400 font-bold'
                : 'border-transparent hover:text-zinc-900 dark:hover:text-white'
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
                  ? 'text-cyan-600 dark:text-cyan-400 border-cyan-500 dark:border-cyan-400 font-bold'
                  : 'border-transparent hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              {t('บัตรเข้างาน & โต๊ะ', 'My Pass & Table')}
            </button>
          )}

          {isAdminLoggedIn && (
            <button
              type="button"
              onClick={() => {
                soundFX.playClick();
                onChangeView('livedraw');
              }}
              className={`py-1 transition whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 border-b-2 ${
                currentView === 'livedraw'
                  ? 'text-amber-600 dark:text-amber-300 border-amber-500 dark:border-amber-400 font-bold'
                  : 'border-transparent hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <Trophy className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              <span>LIVE</span>
            </button>
          )}
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
            className="min-h-[38px] sm:min-h-[40px] px-2.5 sm:px-3 py-1.5 rounded-xl bg-fuchsia-50 dark:bg-violet-950/80 hover:bg-fuchsia-100 dark:hover:bg-violet-900 border border-fuchsia-300/60 dark:border-fuchsia-500/40 text-zinc-800 dark:text-zinc-100 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0"
            title={t('สลับภาษา ไทย / อังกฤษ', 'Switch Language TH / EN')}
            aria-label={t('สลับภาษา ไทย / อังกฤษ', 'Switch Language TH / EN')}
          >
            <Globe className="w-3.5 h-3.5 text-fuchsia-600 dark:text-cyan-400 shrink-0" />
            <span className="font-mono tracking-wide">
              <span className={lang === 'th' ? 'text-fuchsia-600 dark:text-amber-300 font-extrabold' : 'text-zinc-400 dark:text-zinc-500'}>TH</span>
              <span className="text-zinc-400 dark:text-zinc-600 mx-0.5">/</span>
              <span className={lang === 'en' ? 'text-cyan-600 dark:text-cyan-300 font-extrabold' : 'text-zinc-400 dark:text-zinc-500'}>EN</span>
            </span>
          </button>

          {/* Dark / Light Mode Toggle */}
          <button
            type="button"
            onClick={() => {
              soundFX.playClick();
              toggleTheme();
            }}
            className="min-h-[38px] min-w-[38px] sm:min-h-[40px] sm:min-w-[40px] p-2 rounded-xl bg-amber-50 dark:bg-violet-950/80 hover:bg-amber-100 dark:hover:bg-violet-900 border border-amber-300/70 dark:border-amber-400/40 text-zinc-800 dark:text-zinc-100 flex items-center justify-center transition cursor-pointer shrink-0"
            title={theme === 'dark' ? t('เปลี่ยนเป็นโหมดสว่าง (Light Mode)', 'Switch to Light Mode') : t('เปลี่ยนเป็นโหมดมืด (Dark Mode)', 'Switch to Dark Mode')}
            aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-300" />
            ) : (
              <Moon className="w-4 h-4 text-violet-700" />
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
              className={`min-h-[38px] sm:min-h-[40px] px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 shadow-md ${
                currentView === 'admin'
                  ? 'bg-violet-100 dark:bg-violet-900 text-violet-900 dark:text-white border border-violet-300 dark:border-violet-600'
                  : 'bg-gradient-to-r from-fuchsia-500 via-orange-500 to-amber-400 text-white hover:brightness-110'
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
