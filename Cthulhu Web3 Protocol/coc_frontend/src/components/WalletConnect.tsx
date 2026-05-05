import { ConnectButton } from '@mysten/dapp-kit-react/ui';
import { BookOpen, Globe } from 'lucide-react';
import { useI18n } from '../i18n/useI18n';

export function WalletConnect() {
  const { lang, setLang, t } = useI18n();

  return (
    <header className="p-6 flex justify-between items-center border-b border-[var(--color-coc-green)]/20 bg-[var(--color-coc-dark)]/60 backdrop-blur-xl sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <BookOpen className="text-[var(--color-coc-green)] w-8 h-8" />
        <h1 className="text-2xl font-bold cthulhu-text text-[var(--color-coc-green)] tracking-wider">Cthulhu Web3 Protocol</h1>
      </div>
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setLang(lang === 'en' ? 'zh-TW' : 'en')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-black/60 border border-[var(--color-coc-parchment)]/30 text-[var(--color-coc-parchment)] rounded hover:border-[var(--color-coc-green)]/60 hover:text-[var(--color-coc-green)] hover:drop-shadow-[0_0_8px_rgba(0,255,157,0.5)] transition-all text-xs font-bold uppercase cursor-pointer typewriter"
        >
          <Globe size={14} /> {t('lang_switch')}
        </button>
        <ConnectButton className="!bg-[var(--color-coc-green)]/10 !border !border-[var(--color-coc-green)]/50 hover:!bg-[var(--color-coc-green)]/20 hover:!border-[var(--color-coc-green)] eldritch-pulse !text-[var(--color-coc-green)] !font-bold rounded-none transition-all typewriter tracking-widest" />
      </div>
    </header>
  );
}
