import { Volume2, VolumeX } from 'lucide-react';
import { useBgm } from '../contexts/BgmContext';
import { useI18n } from '../i18n/useI18n';
import type { TranslationKey } from '../i18n/en';

export function BgmControls() {
  const { isMuted, toggleMute, volume, setVolume } = useBgm();
  const { t } = useI18n();

  return (
    <div className="fixed bottom-6 right-6 z-50 group flex items-center justify-end animate-in fade-in slide-in-from-bottom-4">
      {/* 隱藏的音量滑桿，當 hover 到整個 group 時展開 */}
      <div className="glass-panel mr-3 px-4 py-2 flex items-center opacity-0 scale-95 translate-x-4 pointer-events-none transition-all duration-300 origin-right group-hover:opacity-100 group-hover:scale-100 group-hover:translate-x-0 group-hover:pointer-events-auto">
        <input 
          type="range"
          min="0" max="1" step="0.05"
          value={isMuted ? 0 : volume}
          onChange={(e) => {
            if (isMuted && parseFloat(e.target.value) > 0) toggleMute();
            setVolume(parseFloat(e.target.value));
          }}
          className="w-24 accent-[var(--color-coc-green)] cursor-pointer"
          title={t('bgm_volume' as TranslationKey)}
        />
      </div>

      {/* 懸浮按鈕本體 */}
      <button 
        onClick={toggleMute}
        className="w-12 h-12 rounded-full glass-panel flex items-center justify-center text-[var(--color-coc-parchment)] hover:text-[var(--color-coc-green)] hover:shadow-[0_0_15px_rgba(0,255,157,0.3)] transition-all duration-300 shadow-xl"
        title={isMuted ? t('bgm_unmute' as TranslationKey) : t('bgm_mute' as TranslationKey)}
      >
        {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
      </button>
    </div>
  );
}
