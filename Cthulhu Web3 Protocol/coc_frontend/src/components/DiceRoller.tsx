import { useState, useEffect } from 'react';
import { useI18n } from '../i18n/useI18n';
import type { TranslationKey } from '../i18n/en';

type Stats = {
  str: number; con: number; siz: number;
  dex: number; app: number; int: number;
  pow: number; edu: number; luck: number;
};

interface DiceRollerProps {
  finalStats: Stats | null;
  onReroll: (stat: keyof Stats) => void;
}

const statKeys: (keyof Stats)[] = ["str", "con", "siz", "dex", "app", "int", "pow", "edu", "luck"];

export function DiceRoller({ finalStats, onReroll }: DiceRollerProps) {
  const { t } = useI18n();
  
  const [displayStats, setDisplayStats] = useState<number[]>(Array(9).fill(0));

  useEffect(() => {
    if (finalStats) {
      const timer = setTimeout(() => {
        setDisplayStats(statKeys.map(k => finalStats[k]));
      }, 0);
      return () => clearTimeout(timer);
    }
    
    // Simulate dice randomly tumbling
    const interval = setInterval(() => {
      setDisplayStats(Array(9).fill(0).map((_, i) => {
        const is2d6 = i === 2 || i === 5 || i === 7;
        const min = is2d6 ? 40 : 15;
        const max = 90;
        return Math.floor(Math.random() * ((max - min) / 5)) * 5 + min;
      }));
    }, 80);
    
    return () => clearInterval(interval);
  }, [finalStats]);

  // Radar chart properties
  const size = 320;
  const center = size / 2;
  const radius = size * 0.35; // leaves room for text
  const maxStat = 100;
  const angleStep = (Math.PI * 2) / 9;

  const getPoint = (val: number, i: number) => {
    const r = (val / maxStat) * radius;
    const a = i * angleStep - Math.PI / 2;
    return { x: center + r * Math.cos(a), y: center + r * Math.sin(a) };
  };

  const levels = [0.2, 0.4, 0.6, 0.8, 1];
  const dataPoints = displayStats.map((v, i) => getPoint(v, i));
  const dataPath = dataPoints.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <div className="relative flex justify-center items-center py-6 glass-panel border border-green-900/40 mt-6 mb-6">
      <svg width="100%" height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible drop-shadow-[0_0_12px_rgba(46,204,113,0.3)]">
        <defs>
          <radialGradient id="radarBgHero" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(46, 204, 113, 0.15)" />
            <stop offset="100%" stopColor="rgba(46, 204, 113, 0)" />
          </radialGradient>
        </defs>
        
        {/* Grids */}
        {levels.map(l => (
          <polygon 
            key={l}
            points={statKeys.map((_, i) => getPoint(maxStat * l, i)).map(p => `${p.x},${p.y}`).join(' ')}
            fill={l === 1 ? "url(#radarBgHero)" : "none"}
            stroke="rgba(46,204,113,0.15)"
            strokeWidth="1"
          />
        ))}

        {/* Axes */}
        {statKeys.map((_, i) => {
          const p = getPoint(maxStat, i);
          return <line key={i} x1={center} y1={center} x2={p.x} y2={p.y} stroke="rgba(46,204,113,0.2)" strokeWidth="1" strokeDasharray="4 4" />;
        })}

        {/* Data shape */}
        <polygon 
          points={dataPath} 
          fill="rgba(46, 204, 113, 0.25)" 
          stroke="rgb(46, 204, 113)" 
          strokeWidth="2" 
          className="transition-all duration-75 ease-linear"
        />

        {/* Nodes and Hover Interactions */}
        {dataPoints.map((p, i) => (
          <g key={'pt'+i} className="group cursor-pointer" onClick={() => finalStats && onReroll(statKeys[i])}>
            <circle cx={p.x} cy={p.y} r="4" fill="#2ecc71" className="transition-all duration-75 ease-linear group-hover:r-[6px] group-hover:fill-white" />
            {finalStats && (
              <text x={p.x} y={p.y - 12} dominantBaseline="middle" textAnchor="middle" fill="#2ecc71" className="text-[10px] font-mono font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                REROLL
              </text>
            )}
          </g>
        ))}

        {/* Labels & Values */}
        {statKeys.map((k, i) => {
          const p = getPoint(maxStat * 1.25, i);
          const statLabel = t(`engine_stat_${k}` as TranslationKey);
          return (
            <text 
              key={k} x={p.x} y={p.y} 
              dominantBaseline="middle" textAnchor="middle" 
              fill={finalStats ? "rgba(46, 204, 113, 0.9)" : "rgba(148, 163, 184, 0.5)"} 
              className={`text-[10px] font-mono tracking-widest font-bold uppercase transition-colors ${finalStats ? 'cursor-pointer hover:fill-white' : ''}`}
              onClick={() => finalStats && onReroll(k)}
            >
              {statLabel}
              <tspan x={p.x} y={p.y + 14} fill={finalStats ? "white" : "rgba(148, 163, 184, 0.5)"} className="text-xs">{displayStats[i]}</tspan>
            </text>
          );
        })}
      </svg>
      {/* Reroll tooltip hint */}
      {finalStats && (
        <div className="absolute top-4 right-4 text-[9px] text-green-500/50 uppercase font-mono tracking-widest pointer-events-none">
          {t('mint_reroll')} (Click Node)
        </div>
      )}
    </div>
  );
}
