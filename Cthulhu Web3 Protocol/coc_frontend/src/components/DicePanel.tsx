import { useState } from 'react';
import { Dices, AlertCircle, Sparkles } from 'lucide-react';

interface DiceEvent {
  result: number;
  success: boolean;
  isCritical: boolean;
  isFumble: boolean;
  timestamp: string;
}

export function DicePanel() {
  const [rolling, setRolling] = useState(false);
  const [lastRoll, setLastRoll] = useState<DiceEvent | null>(null);
  const [target, setTarget] = useState(50);
  const [history, setHistory] = useState<DiceEvent[]>([]);

  const handleRoll = async () => {
    setRolling(true);
    // Simulate chain roundtrip
    await new Promise(r => setTimeout(r, 2000));
    
    const result = Math.floor(Math.random() * 100) + 1;
    const isCritical = result === 1;
    const isFumble = target < 50 ? result >= 96 : result === 100;
    const success = result <= target;

    const newEvent = {
      result,
      success,
      isCritical,
      isFumble,
      timestamp: new Date().toLocaleTimeString()
    };

    setLastRoll(newEvent);
    setHistory(prev => [newEvent, ...prev].slice(0, 5));
    setRolling(false);
  };

  return (
    <div className="glass-panel p-6 h-full flex flex-col relative overflow-hidden crt-flicker">
      <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
         <Dices size={120} />
      </div>

      <h3 className="text-xl cthulhu-text text-green-400 mb-6 flex items-center gap-2 border-b border-slate-700/50 pb-4">
        <Sparkles size={20} /> Fate Decider <span className="typewriter text-[10px] text-slate-500 ml-2">(VRF Oracle)</span>
      </h3>

      <div className="mb-8 p-4 bg-black/40 rounded border border-slate-700/50">
        <div className="flex justify-between mb-2">
          <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Skill Target Value</label>
          <span className="text-green-500 font-mono text-xs">{target}%</span>
        </div>
        <input 
          type="range" min="1" max="99" value={target} 
          onChange={(e) => setTarget(parseInt(e.target.value))}
          className="w-full accent-green-600 bg-slate-800 h-1 rounded-lg cursor-pointer"
        />
        <div className="flex justify-between mt-2 text-[9px] text-slate-600 font-mono">
          <span>01 (CRIT)</span>
          <span>99 (FAIL)</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center items-center py-8">
        {rolling ? (
          <div className="relative">
            <div className="w-32 h-32 border-4 border-green-500/20 border-t-green-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-mono text-green-500 animate-pulse">??</span>
            </div>
          </div>
        ) : lastRoll ? (
          <div className={`text-center animate-in zoom-in-50 duration-500 ${lastRoll.isFumble ? 'blood-drip' : ''}`}>
             <div className={`text-8xl font-black font-mono mb-2 transition-all duration-300 ${
                lastRoll.isCritical ? 'text-green-400 drop-shadow-[0_0_30px_rgba(34,197,94,0.6)]' :
                lastRoll.isFumble ? 'text-red-600 drop-shadow-[0_0_30px_rgba(139,0,0,0.6)]' :
                lastRoll.success ? 'text-green-500 drop-shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 'text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.3)]'
             }`}>
                {lastRoll.result.toString().padStart(2, '0')}
             </div>
             <div className={`text-sm font-bold uppercase tracking-[0.2em] typewriter ${
                lastRoll.isCritical ? 'text-green-300' :
                lastRoll.isFumble ? 'text-red-400' :
                lastRoll.success ? 'text-green-400' : 'text-red-400'
             }`}>
                {lastRoll.isCritical ? '⚡ CRITICAL SUCCESS ⚡' : 
                 lastRoll.isFumble ? '💀 FUMBLE FAILURE 💀' : 
                 lastRoll.success ? 'SUCCESS' : 'FAILURE'}
             </div>
          </div>
        ) : (
          <div className="text-slate-600 text-center">
            <AlertCircle className="mx-auto mb-2 opacity-20" size={40} />
            <p className="text-xs uppercase tracking-widest">Awaiting Command</p>
          </div>
        )}
      </div>

      <button 
        onClick={handleRoll}
        disabled={rolling}
        className="w-full py-4 bg-gradient-to-b from-slate-800 to-black border border-green-500/40 text-green-400 font-black uppercase tracking-widest hover:border-green-400 transition-all rounded disabled:opacity-50 cursor-pointer shadow-lg active:scale-95 eldritch-pulse typewriter"
      >
        Invoke VRF Dice
      </button>

      {history.length > 0 && (
        <div className="mt-8 border-t border-slate-700/50 pt-4">
          <p className="text-[9px] text-slate-500 uppercase mb-3 tracking-widest">Chronicle of Rolls</p>
          <div className="space-y-2">
            {history.map((h, i) => (
              <div key={i} className="flex justify-between items-center text-[10px] font-mono bg-black/20 p-2 rounded typewriter">
                <span className={h.success ? 'text-green-500/80' : 'text-red-500/80'}>
                  [{h.timestamp}] {h.result.toString().padStart(2, '0')} vs {target}%
                </span>
                <span className="opacity-50">{h.success ? 'SUCC' : 'FAIL'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
