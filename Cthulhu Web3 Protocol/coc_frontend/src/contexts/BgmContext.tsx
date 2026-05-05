import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useI18n } from '../i18n/useI18n';

export type BgmTrack = 'none' | 'ambient' | 'stairs' | 'boss' | 'ending';

interface BgmContextType {
  currentTrack: BgmTrack;
  setCurrentTrack: (track: BgmTrack) => void;
  isMuted: boolean;
  toggleMute: () => void;
  volume: number;
  setVolume: (v: number) => void;
}

const BgmContext = createContext<BgmContextType | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useBgm = () => {
  const ctx = useContext(BgmContext);
  if (!ctx) throw new Error('useBgm must be used within BgmProvider');
  return ctx;
};

export const BgmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState<BgmTrack>('none');
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.4);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 為了在切換相同 track 時也能隨機換歌，我們可以在這裡記住目前是哪一首
  const trackVariantRef = useRef(1);
  const prevStateRef = useRef<string>('none-');
  const { lang } = useI18n();

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.loop = true; // ✔ 確認有開啟循環播放
      audioRef.current.preload = 'auto'; // 加強預讀取，優化部署後的延遲
    }
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const langPrefix = lang === 'en' ? 'en' : 'zh';
    const currentStateStr = `${currentTrack}-${langPrefix}`;

    // 只有在 Track 或語言真的改變時，才重新擲骰決定變體
    if (currentStateStr !== prevStateRef.current) {
      if (currentTrack === 'stairs' || currentTrack === 'boss') {
        let maxVariant = 2; // 預設都是各 2 首
        if (currentTrack === 'stairs' && langPrefix === 'en') {
          maxVariant = 3; // 樓梯間英文版有 3 首
        }
        trackVariantRef.current = Math.floor(Math.random() * maxVariant) + 1;
      }
      prevStateRef.current = currentStateStr;
    }

    let src = '';

    switch (currentTrack) {
      case 'ambient':
        src = '/assets/bgm_ambient.mp3';
        break;
      case 'stairs':
        src = `/assets/bgm_stairs_${langPrefix}_${trackVariantRef.current}.mp3`;
        break;
      case 'boss':
        src = `/assets/bgm_boss_${langPrefix}_${trackVariantRef.current}.mp3`;
        break;
      case 'ending':
        src = '/assets/bgm_ending.mp3';
        break;
      case 'none':
      default:
        src = '';
        break;
    }

    if (src) {
      const fullSrc = window.location.origin + src;
      if (audio.src !== fullSrc) {
        audio.src = src;
        audio.load(); // 顯式觸發加載
        // User activation is required for auto-play in modern browsers,
        audio.play().catch(e => console.warn('BGM play prevented by browser:', e));
      } else if (audio.paused && !isMuted) {
        audio.play().catch(e => console.warn('BGM play prevented by browser:', e));
      }
    } else {
      audio.pause();
    }
  }, [currentTrack, isMuted, lang]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [isMuted, volume]);

  const toggleMute = () => setIsMuted(p => !p);

  return (
    <BgmContext.Provider value={{ currentTrack, setCurrentTrack, isMuted, toggleMute, volume, setVolume }}>
      {children}
    </BgmContext.Provider>
  );
};
