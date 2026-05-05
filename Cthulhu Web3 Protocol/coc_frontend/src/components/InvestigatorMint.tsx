import { useState } from 'react';
import { Dices, RefreshCw, Skull } from 'lucide-react';
import { DiceRoller } from './DiceRoller';
import { Transaction } from '@mysten/sui/transactions';
import { useDAppKit, useCurrentAccount } from '@mysten/dapp-kit-react';
import { COC_PACKAGE_ID, SUI_RANDOM_ID } from '../contracts/protocol';
import { useMyInvestigators } from '../hooks/useOnChainData';
import type { InvestigatorObject } from '../hooks/useOnChainData';
import { useI18n } from '../i18n/useI18n';
import type { TranslationKey } from '../i18n/en';

type Stats = {
  str: number; con: number; siz: number;
  dex: number; app: number; int: number;
  pow: number; edu: number; luck: number;
};

/** 小型雷達圖，用於已鑄造的角色卡 */
export const SmallRadarChart = ({ 
  stats, 
  max = 100, 
  size = 160, 
  onStatClick,
  highlightedStat 
}: { 
  stats: number[], 
  max?: number, 
  size?: number, 
  onStatClick?: (stat: string) => void,
  highlightedStat?: string 
}) => {
  const { t } = useI18n();
  const center = size / 2;
  const radius = size * 0.35;
  const sides = 9;
  const angleStep = (Math.PI * 2) / sides;

  const getPoint = (val: number, i: number) => {
    const r = (val / max) * radius;
    const a = i * angleStep - Math.PI / 2;
    return { x: center + r * Math.cos(a), y: center + r * Math.sin(a) };
  };

  const statKeys = ['str', 'con', 'siz', 'dex', 'app', 'int', 'pow', 'edu', 'luck'] as const;
  const dataPoints = stats.map((v, i) => getPoint(v, i));
  const dataPath = dataPoints.map(p => `${p.x},${p.y}`).join(' ');

  return (
    <svg width="100%" height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible drop-shadow-[0_0_8px_rgba(46,204,113,0.3)]">
      {[0.3, 0.6, 1].map(l => (
        <polygon
          key={l}
          points={statKeys.map((_, i) => getPoint(max * l, i)).map(p => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke="rgba(46,204,113,0.15)"
          strokeWidth="1"
        />
      ))}
      {statKeys.map((_, i) => {
        const p = getPoint(max, i);
        return <line key={i} x1={center} y1={center} x2={p.x} y2={p.y} stroke="rgba(46,204,113,0.15)" strokeWidth="1" />;
      })}
      <polygon
        points={dataPath}
        fill="rgba(46, 204, 113, 0.4)"
        stroke="rgb(46, 204, 113)"
        strokeWidth="1.5"
      />
      {statKeys.map((k, i) => {
        const pLabel = getPoint(max * 1.25, i);
        const pValue = getPoint(max * 1.25, i);
        const isInteractive = !!onStatClick;
        const isHighlighted = highlightedStat === k;

        return (
          <g key={k}>
            {isHighlighted && (
              <circle cx={pLabel.x} cy={pLabel.y - 1} r="12" fill="rgba(234, 179, 8, 0.1)" className="animate-pulse" />
            )}
            <text
              x={pLabel.x} y={pLabel.y - 4}
              dominantBaseline="middle" textAnchor="middle"
              fill={isHighlighted ? "#facc15" : "rgba(148, 163, 184, 0.8)"}
              onClick={() => onStatClick && onStatClick(k)}
              style={isHighlighted ? { filter: 'drop-shadow(0 0 4px rgba(234, 179, 8, 0.8))' } : {}}
              className={`text-[7px] font-mono tracking-widest font-bold uppercase transition-all duration-200 ${isInteractive ? 'cursor-pointer hover:fill-yellow-400' : 'pointer-events-none'} ${isHighlighted ? 'text-[9px]' : ''}`}
            >
              {isInteractive && <title>Reroll {t(`engine_stat_${k}` as TranslationKey)} (Cost: 1000 Game Token)</title>}
              {t(`engine_stat_${k}` as TranslationKey)}
              <tspan x={pValue.x} y={pValue.y + 6} fill={isHighlighted ? "white" : "white"} className={`${isHighlighted ? 'text-[10px] font-black' : 'text-[9px]'} pointer-events-none`}>{stats[i]}</tspan>
            </text>
          </g>
        );
      })}
    </svg>
  );
};

/** 角色卡展示卡片（帶 reroll 操作） */
function InvestigatorCard({
  inv,
  onReroll,
}: {
  inv: InvestigatorObject;
  onReroll: (statName: string, invObjectId: string) => void;
}) {
  const { fields: f } = inv;
  const sanity = f.pow; // SAN 暫時映射至 POW
  const statsArray = [f.str, f.con, f.siz, f.dex, f.app, f.int, f.pow, f.edu, f.luck];
  const { t } = useI18n();

  return (
    <div className="glass-panel p-5 relative overflow-hidden group hover:border-green-500/50 transition-all duration-500">
      {/* 背景裝飾 */}
      <div className="absolute -right-10 -top-10 w-32 h-32 bg-green-500/5 rounded-full blur-3xl group-hover:bg-green-500/10 transition-all duration-700" />

      {/* 頭部 */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="text-lg font-bold text-green-300 uppercase tracking-tighter cthulhu-text">
            {f.name}
          </h4>
          <p className="text-[9px] font-mono text-slate-600 mt-0.5">
            {inv.objectId.slice(0, 8)}...{inv.objectId.slice(-6)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[9px] text-slate-500 uppercase">{t('active_sanity' as TranslationKey)}</p>
          <p className="text-2xl font-bold font-mono text-purple-400">{sanity}</p>
        </div>
      </div>

      {/* SAN 條 */}
      <div className="mb-4">
        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-700 to-purple-400 transition-all duration-1000"
            style={{ width: `${sanity}%` }}
          />
        </div>
      </div>

      {/* 神祕學雷達圖 */}
      <div className="flex flex-col items-center justify-center mt-2 py-2 bg-black/30 rounded border border-slate-800/50">
        <SmallRadarChart stats={statsArray} onStatClick={(stat) => onReroll(stat, inv.objectId)} />
      </div>
    </div>
  );
}

/** 主元件 */
export function InvestigatorMint() {
  const account = useCurrentAccount();
  const dAppKit = useDAppKit();
  const { t } = useI18n();
  const [isMinting, setIsMinting] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [customName, setCustomName] = useState('Randolph Carter');

  const [stats, setStats] = useState<Stats | null>({
    str: 50, con: 55, siz: 65, dex: 60, app: 45, int: 80, pow: 75, edu: 85, luck: 40,
  });

  const { investigators, isLoading: isLoadingCards, refetch } = useMyInvestigators();

  const addLog = (msg: string) =>
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 5));

  const handleMint = async () => {
    setIsMinting(true);
    setStats(null); // 開始骰子翻滾動畫
    addLog(t('mint_terminal_consult' as TranslationKey));

    try {
      if (!account) return;
      const tx = new Transaction();
      tx.moveCall({
        target: `${COC_PACKAGE_ID}::investigator::mint_investigator`,
        arguments: [
          tx.pure.string(customName),
          tx.object(SUI_RANDOM_ID),
        ],
      });
      await dAppKit.signAndExecuteTransaction({ transaction: tx });

      addLog(`${customName} ${t('mint_terminal_forged' as TranslationKey)}.`);
      // 刷新鏈上角色卡列表
      await refetch();
      setStats({
        str: 45, con: 60, siz: 70, dex: 55, app: 50, int: 85, pow: 90, edu: 80, luck: 35,
      });
    } catch (e: unknown) {
      addLog(`Error: ${(e as Error).message}`);
      setStats({
        str: 40, con: 50, siz: 60, dex: 50, app: 50, int: 70, pow: 60, edu: 70, luck: 50,
      });
    } finally {
      setIsMinting(false);
    }
  };

  // invObjectId：要 reroll 的那張角色卡的 Sui objectId（必填）
  const handleReroll = async (statName: string, invObjectId: string) => {
    if (!invObjectId) {
      addLog('Error: No investigator selected for reroll.');
      return;
    }
    setIsMinting(true);
    addLog(`Burning 1000U Game Token to reroll ${statName.toUpperCase()} for ${invObjectId.slice(0, 8)}...`);
    try {
      const tx = new Transaction();
      const [paymentCoin] = tx.splitCoins(tx.gas, [1_000_000_000]); // 1 SUI
      // 合約簽名：reroll_attribute(investigator: &mut Investigator, attribute_name: vector<u8>, payment: Coin<SUI>, random: &Random)
      tx.moveCall({
        target: `${COC_PACKAGE_ID}::investigator::reroll_attribute`,
        arguments: [
          tx.object(invObjectId),     // &mut Investigator
          tx.pure.string(statName),   // stat name
          paymentCoin,                // payment: Coin<SUI>
          tx.object(SUI_RANDOM_ID),   // &Random
        ],
      });
      await dAppKit.signAndExecuteTransaction({ transaction: tx });

      addLog(`${statName.toUpperCase()} ${t('mint_terminal_success' as TranslationKey)}.`);
      // 刷新角色卡列表以取得最新屬性值
      await refetch();
      setStats((prev: Stats | null) => prev ? ({
        ...prev,
        [statName]: Math.floor(Math.random() * 12 + 3) * 5,
      }) : null);
    } catch (e: unknown) {
      addLog(`Reroll Error: ${(e as Error).message}`);
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* ── 鑄造區塊 ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 space-y-8">
          <div className="glass-panel p-8 relative overflow-hidden group">
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-green-500/5 rounded-full blur-3xl group-hover:bg-green-500/10 transition-all duration-700" />

            <div className="flex justify-between items-start mb-6 border-b border-slate-700/50 pb-4">
              <div>
                <h3 className="text-2xl cthulhu-text text-green-400 flex items-center gap-2">
                  <Dices className="text-green-500" /> {t('mint_title')}
                </h3>
                <p className="text-slate-500 text-xs mt-1 typewriter">{t('mint_subtitle')}</p>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-slate-400 text-sm mb-2 uppercase tracking-wider font-bold">
                {t('mint_name_label')}
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder={t('mint_name_placeholder')}
                className="w-full bg-black/50 border border-slate-700 rounded p-3 text-green-300 font-mono focus:outline-none focus:border-green-500 transition-colors"
              />
            </div>

            {/* DiceRoller 用在 mint 前預覽，onReroll 只需 stat 名稱（不需要 objectId） */}
            <DiceRoller
              finalStats={stats}
              onReroll={(stat) => {
                // mint 前的 reroll：僅本地模擬，等 mint 完成後才能真正呼叫合約
                addLog(t('mint_preview_reroll' as TranslationKey).replace('{stat}', String(stat).toUpperCase()));
                setStats((prev: Stats | null) =>
                  prev ? { ...prev, [stat]: Math.floor(Math.random() * 12 + 3) * 5 } : null
                );
              }}
            />

            <button
              onClick={handleMint}
              disabled={isMinting}
              className="w-full py-4 bg-gradient-to-r from-green-900 to-green-700 hover:from-green-800 hover:to-green-600 rounded-lg font-bold text-lg tracking-wide uppercase shadow-[0_0_15px_rgba(46,204,113,0.3)] hover:shadow-[0_0_25px_rgba(46,204,113,0.5)] transition-all disabled:opacity-50 cursor-pointer text-white mt-6"
            >
              {isMinting ? t('mint_rolling') : t('mint_btn')}
            </button>
          </div>
        </div>

        {/* Arkham Terminal 日誌 */}
        <div className="lg:col-span-2 relative p-6 font-mono text-sm h-[400px] lg:h-full flex flex-col bg-[#050806] border border-green-900/40 rounded-xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.9)_inset]">
          {/* CRT 掃描線特效與螢幕反光 */}
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] opacity-30 z-10" />
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-green-500/5 via-transparent to-green-900/20 z-0" />

          <h3 className="relative z-20 text-green-700/80 mb-5 uppercase tracking-[0.2em] border-b border-green-900/50 pb-3 flex items-center justify-between text-[11px] font-bold">
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-green-800 rounded-sm inline-block shadow-[0_0_5px_rgba(34,197,94,0.3)]"></span>
              {t('mint_terminal' as TranslationKey)}
            </span>
            <span className="text-[10px] text-green-400 animate-pulse drop-shadow-[0_0_5px_rgba(74,222,128,0.8)]">● {t('mint_terminal_live' as TranslationKey)}</span>
          </h3>

          <div className="relative z-20 flex-1 space-y-1.5 overflow-y-auto pr-2 custom-scrollbar">
            {logs.length === 0 ? (
              <p className="text-green-700 mt-2 flex items-center text-xs">
                <span className="mr-3 opacity-60">sys&gt;</span>
                {t('mint_terminal_waiting' as TranslationKey)}
                <span className="inline-block w-2.5 h-3.5 bg-green-600/80 ml-2 animate-ping" />
              </p>
            ) : (
              logs.map((log, i) => {
                const isSuccess = log.includes('Success') || log.includes('forged') || log.includes('成功') || log.includes('鑄造完成');
                return (
                  <div
                    key={i}
                    className={`font-mono text-xs leading-relaxed break-words py-1 animate-in slide-in-from-bottom-2 fade-in duration-300 ${isSuccess
                        ? 'text-green-400 drop-shadow-[0_0_3px_rgba(74,222,128,0.4)] font-bold'
                        : 'text-green-600/90'
                      }`}
                  >
                    <span className="opacity-50 mr-3 select-none">sys&gt;</span>{log}
                  </div>
                );
              })
            )}
            {logs.length > 0 && (
              <div className="text-green-600 py-1 flex items-center animate-in fade-in duration-500">
                <span className="opacity-50 mr-3 select-none">sys&gt;</span>
                <span className="inline-block w-2.5 h-3.5 bg-green-500 opacity-80 animate-[pulse_1s_ease-in-out_infinite]" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 我的角色卡 ────────────────────────────────── */}
      <div className="glass-panel p-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
          <h2 className="text-2xl cthulhu-text text-green-400">
            {t('mint_my_investigators' as TranslationKey)}
            <span className="ml-3 text-base font-mono text-slate-500">
              ({investigators.length})
            </span>
          </h2>
          <button
            onClick={() => refetch()}
            disabled={isLoadingCards}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-400 border border-slate-700 rounded hover:border-green-500/50 hover:text-green-400 transition-all disabled:opacity-40"
          >
            <RefreshCw size={12} className={isLoadingCards ? 'animate-spin' : ''} />
            {t('mint_refresh' as TranslationKey)}
          </button>
        </div>

        {isLoadingCards ? (
          <div className="text-center py-12 text-slate-500 font-mono">
            <Dices className="w-10 h-10 mx-auto mb-4 animate-spin text-green-500/30" />
            {t('mint_terminal_consult' as TranslationKey)}
          </div>
        ) : investigators.length === 0 ? (
          <div className="text-center py-12 text-slate-600 font-mono border border-dashed border-slate-800 rounded-xl">
            <Skull className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>{t('mint_no_investigators_1' as TranslationKey)}</p>
            <p className="text-xs mt-2">{t('mint_no_investigators_2' as TranslationKey)}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {investigators.map((inv) => (
              <InvestigatorCard
                key={inv.objectId}
                inv={inv}
                onReroll={handleReroll}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
