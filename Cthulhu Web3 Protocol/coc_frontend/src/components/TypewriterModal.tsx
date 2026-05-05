import { useState, useEffect, useRef } from 'react';

interface TypewriterModalProps {
  text: string;
  onComplete: () => void;
}

export function TypewriterModal({ text, onComplete }: TypewriterModalProps) {
  const [displayedText, setDisplayedText] = useState('');
  const [typingState, setTypingState] = useState<'typing' | 'idle'>('typing');
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 初始化 AudioContext
  useEffect(() => {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioContextRef.current = new AudioContextClass();
    }
    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  // 播放打字音效
  const playTypingSound = () => {
    const actx = audioContextRef.current;
    if (!actx) return;
    
    if (actx.state === 'suspended') {
      actx.resume();
    }

    const osc = actx.createOscillator();
    const gain = actx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(600 + Math.random() * 200, actx.currentTime);
    
    gain.gain.setValueAtTime(0.05, actx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.03);

    osc.connect(gain);
    gain.connect(actx.destination);

    osc.start(actx.currentTime);
    osc.stop(actx.currentTime + 0.03);
  };

  useEffect(() => {
    let index = 0;
    const charArray = Array.from(text);

    intervalRef.current = setInterval(() => {
      if (index < charArray.length) {
        const nextChar = charArray[index];
        setDisplayedText(prev => prev + nextChar);
        
        if (nextChar.trim() !== '') {
          playTypingSound();
        }
        
        index++;
      } else {
        // Typing finished naturally
        if (intervalRef.current) clearInterval(intervalRef.current);
        setTypingState('idle');
        
        timeoutRef.current = setTimeout(() => {
          onComplete();
        }, 3000); // 延長為 3 秒自動關閉，避免來不及看
      }
    }, 50);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [text, onComplete]);

  const handleClick = () => {
    if (typingState === 'typing') {
      // 第一次點擊：立刻顯示全部文字
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setDisplayedText(text);
      setTypingState('idle');
    } else {
      // 第二次點擊：取消/關閉
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      onComplete();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm crt-flicker p-6 cursor-pointer"
      onClick={handleClick}
    >
      {/* CRT 掃描線特效裝飾 */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] opacity-40 mix-blend-overlay" />
      
      <div className="max-w-4xl w-full text-center relative z-10 pointer-events-none">
        <p className="text-2xl md:text-3xl font-mono text-green-500 typewriter whitespace-pre-wrap leading-relaxed drop-shadow-[0_0_10px_rgba(34,197,94,0.8)]">
          {displayedText}
          <span className="animate-pulse ml-1 inline-block w-3 h-6 bg-green-500 translate-y-1"></span>
        </p>
        
        {typingState === 'idle' && (
          <p className="mt-8 text-sm text-green-700/60 animate-pulse font-mono tracking-widest">
            [ CLICK ANYWHERE TO CONTINUE ]
          </p>
        )}
      </div>
    </div>
  );
}
