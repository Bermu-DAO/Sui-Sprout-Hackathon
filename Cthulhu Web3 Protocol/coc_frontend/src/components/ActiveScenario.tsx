import { useState } from 'react';
import { DicePanel } from './DicePanel';
import { ShieldAlert, LogOut, FileText, ChevronLeft, ClipboardCheck, Dices, User } from 'lucide-react';
import { KPReport } from './KPReport';
import type { Scenario } from './ScenarioDashboard';
import { useMyInvestigators } from '../hooks/useOnChainData';
import type { InvestigatorObject } from '../hooks/useOnChainData';
import { useI18n } from '../i18n/useI18n';
import type { TranslationKey } from '../i18n/en';
import { SmallRadarChart } from './InvestigatorMint';

// ── 小型角色卡（在劇本中顯示真實屬性）────────────────────────────
function InGameCharacterPanel({ inv }: { inv: InvestigatorObject }) {
  const f = inv.fields;
  const sanity = f.pow; // SAN 暫時映射至 POW（與 InvestigatorMint 一致）
  const sanPct = Math.min(100, Math.max(0, sanity));

  return (
    <div className="bg-black/40 rounded p-4 border border-slate-800 space-y-4">
      {/* 角色名稱與狀態 */}
      <div className="flex justify-between items-center">
        <span className="text-green-400 font-bold uppercase tracking-tighter text-lg cthulhu-text">
          {f.name}
        </span>
        <span className="text-[10px] bg-green-500/10 text-green-500 px-2 py-0.5 rounded font-mono">
          ALIVE
        </span>
      </div>

      {/* 神祕學雷達圖 */}
      <div className="flex flex-col items-center justify-center mt-2 py-4 bg-black/30 rounded border border-slate-800/50">
        <SmallRadarChart stats={[f.str, f.con, f.siz, f.dex, f.app, f.int, f.pow, f.edu, f.luck]} />
      </div>

      {/* SAN 理智值條 */}
      <div className="space-y-1">
        <div className="flex justify-between text-[9px] uppercase font-mono">
          <span className="text-slate-500">Sanity</span>
          <span className="text-green-500">{sanity} / 99</span>
        </div>
        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-green-700 to-green-400 h-full transition-all duration-1000"
            style={{ width: `${sanPct}%` }}
          />
        </div>
      </div>

      {/* Object ID 縮寫 */}
      <p className="text-[9px] font-mono text-slate-700 break-all">
        {inv.objectId.slice(0, 10)}...{inv.objectId.slice(-6)}
      </p>
    </div>
  );
}

// ── 角色選擇畫面（進場前） ───────────────────────────────────────
function InvestigatorSelector({
  investigators,
  onSelect,
}: {
  investigators: InvestigatorObject[];
  onSelect: (inv: InvestigatorObject) => void;
}) {
  return (
    <div className="glass-panel p-6 space-y-4">
      <h4 className="text-[10px] text-slate-500 uppercase tracking-[0.2em]">
        Deploy Investigator
      </h4>
      <div className="space-y-3">
        {investigators.map((inv) => (
          <button
            key={inv.objectId}
            onClick={() => onSelect(inv)}
            className="w-full flex items-center gap-3 p-3 bg-black/40 border border-slate-800 rounded hover:border-green-500/50 hover:bg-green-900/10 transition-all text-left group"
          >
            <div className="p-1.5 bg-slate-800 rounded group-hover:bg-green-900/40 transition-colors">
              <User size={16} className="text-slate-400 group-hover:text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-green-300 uppercase tracking-tight truncate">
                {inv.fields.name}
              </p>
              <p className="text-[9px] font-mono text-slate-600">
                STR {inv.fields.str} · DEX {inv.fields.dex} · POW {inv.fields.pow}
              </p>
            </div>
            <span className="text-[9px] text-green-500/50 group-hover:text-green-400 transition-colors">
              ▶ Deploy
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── 主元件 ───────────────────────────────────────────────────────
export function ActiveScenario({ scenario, onLeave }: { scenario: Scenario; onLeave: () => void }) {
  const [showReport, setShowReport] = useState(false);
  const [logs] = useState([
    'Investigator joined. Deposit locked.',
    'Keeper has shared the introduction log...',
    'System: VRF Dice Oracle is online.',
  ]);

  // 從鏈上拉取本地錢包持有的角色卡
  const { investigators, isLoading } = useMyInvestigators();

  // 玩家選擇帶哪張角色卡進場（預設選第一張）
  const [selectedInv, setSelectedInv] = useState<InvestigatorObject | null>(null);

  // 一旦角色卡載入完成且尚未選擇，自動預選第一張
  const activeInv: InvestigatorObject | null =
    selectedInv ?? (investigators.length > 0 ? investigators[0] : null);

  const { t } = useI18n();
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-700">
      {/* ── 頂部標題列 ────────────────────────────── */}
      <div className="flex justify-between items-center border-b border-slate-700/50 pb-4">
        <div className="flex items-center gap-4">
          <button onClick={onLeave} className="p-2 hover:bg-slate-800 rounded transition-colors text-slate-400">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h2 className="text-3xl cthulhu-text text-green-400">{scenario.title}</h2>
            <p className="text-slate-500 text-[10px] font-mono uppercase tracking-widest">
              {t('active_status' as TranslationKey)}{' '}
              <span className="text-green-500 animate-pulse">{t('active_status_live' as TranslationKey)}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowReport(!showReport)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-900/20 border border-purple-500/30 text-purple-400 rounded hover:bg-purple-500 hover:text-black transition-all text-xs font-bold uppercase cursor-pointer"
          >
            <ClipboardCheck size={14} /> {showReport ? t('active_live' as TranslationKey) : t('active_settle' as TranslationKey)}
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-black border border-slate-700 text-slate-400 rounded hover:text-white transition-all text-xs font-bold uppercase cursor-pointer">
            <FileText size={14} /> {t('active_log_sheet' as TranslationKey)}
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-red-900/20 border border-red-500/30 text-red-500 rounded hover:bg-red-500 hover:text-black transition-all text-xs font-bold uppercase cursor-pointer">
            <LogOut size={14} /> {t('active_force_quit' as TranslationKey)}
          </button>
        </div>
      </div>

      {/* ── 主體：結算報告 or 遊戲面板 ────────────── */}
      {showReport ? (
        <KPReport
          // 把鏈上角色卡轉成 KPReport 需要的格式
          players={
            activeInv
              ? [{ id: activeInv.objectId, name: activeInv.fields.name }]
              : [{ id: '1', name: 'Unknown Investigator' }]
          }
          onSubmit={(results) => {
            console.log('Submitting Closing Report:', results);
            onLeave();
          }}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ── 左側：骰子面板 + 遠征日誌 ────────── */}
          <div className="lg:col-span-2 space-y-8">
            <DicePanel />

            <div className="glass-panel p-6 crt-flicker">
              <h3 className="text-lg font-bold text-slate-300 mb-4 flex items-center gap-2 uppercase tracking-wide">
                <ShieldAlert size={18} className="text-purple-500" /> {t('active_chronicle' as TranslationKey)}
              </h3>
              <div className="space-y-3 typewriter text-xs">
                {logs.map((log, i) => (
                  <div key={i} className="p-3 bg-black/40 border-l-2 border-slate-700 text-slate-400">
                    <span className="text-[10px] opacity-50 mr-2">
                      [{new Date().toLocaleTimeString()}]
                    </span>
                    {log}
                  </div>
                ))}
                <div className="mt-4 flex gap-2">
                  <input
                    type="text"
                    placeholder={t('active_action_placeholder' as TranslationKey)}
                    className="flex-1 bg-black/60 border border-slate-800 p-2 rounded outline-none focus:border-green-500/50 transition-colors typewriter"
                  />
                  <button className="px-4 bg-green-900/40 text-green-400 border border-green-500/30 rounded text-[10px] font-bold uppercase typewriter">
                    {t('active_send' as TranslationKey)}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ── 右側：角色資訊 + 合約條款 ──────────── */}
          <div className="space-y-6">
            {/* 角色卡面板 */}
            <div className="glass-panel p-6">
              <h4 className="text-[10px] text-slate-500 uppercase tracking-[0.2em] mb-4">
                {t('active_card_title' as TranslationKey)}
              </h4>

              {/* 載入中 */}
              {isLoading && (
                <div className="flex items-center gap-2 text-slate-500 text-xs font-mono py-4">
                  <Dices size={14} className="animate-spin" />
                  Consulting the Mythos Registry...
                </div>
              )}

              {/* 沒有角色卡 */}
              {!isLoading && investigators.length === 0 && (
                <div className="text-center py-6 text-slate-600 font-mono text-xs border border-dashed border-slate-800 rounded">
                  <User size={24} className="mx-auto mb-2 opacity-30" />
                  <p>No Investigators found.</p>
                  <p className="text-[10px] mt-1 opacity-70">Mint one first.</p>
                </div>
              )}

              {/* 已有角色卡：若超過 1 張，顯示選擇器 */}
              {!isLoading && investigators.length > 1 && (
                <InvestigatorSelector
                  investigators={investigators}
                  onSelect={(inv) => setSelectedInv(inv)}
                />
              )}

              {/* 顯示選中的角色（或唯一的角色） */}
              {!isLoading && activeInv && (
                <div className={investigators.length > 1 ? 'mt-4' : ''}>
                  {investigators.length > 1 && (
                    <p className="text-[9px] text-slate-600 font-mono uppercase mb-2 tracking-widest">
                      Active Investigator:
                    </p>
                  )}
                  <InGameCharacterPanel inv={activeInv} />
                </div>
              )}
            </div>

            {/* 合約保障面板 */}
            <div className="glass-panel p-6 border-purple-500/20">
              <h4 className="text-[10px] text-slate-500 uppercase tracking-[0.2em] mb-4">
                {t('active_contract_safeguards' as TranslationKey)}
              </h4>
              <div className="space-y-4 text-[10px] leading-relaxed text-slate-400">
                <div>
                  <p className="text-purple-400 font-bold uppercase mb-1">{t('active_timelock' as TranslationKey)}</p>
                  <p>
                    {t('active_timelock_desc' as TranslationKey)}
                  </p>
                </div>
                <div>
                  <p className="text-green-400 font-bold uppercase mb-1">{t('active_staking' as TranslationKey)}</p>
                  <p>
                    {scenario.deposit} {t('active_staking_desc' as TranslationKey)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
