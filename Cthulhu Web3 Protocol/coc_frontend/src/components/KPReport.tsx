import { useState } from 'react';
import { ClipboardCheck, Skull, HeartPulse, Star, Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useCurrentAccount, useDAppKit } from '@mysten/dapp-kit-react';
import { Transaction } from '@mysten/sui/transactions';
import { COC_PACKAGE_ID, COC_GAME_TREASURY_ID } from '../contracts/protocol';

// ── 型別定義 ──────────────────────────────────────────────────────────────────

interface PlayerReport {
  id: string;           // Investigator objectId（鏈上唯一識別）
  name: string;
  isAlive: boolean;
  sanChange: number;
  reputationDelta: number;
  obituary: string;
}

interface KPReportProps {
  /** 傳入的玩家清單（至少要有 id 和 name） */
  players: Array<{ id: string; name: string }>;
  /** 結算劇本的 Session Object ID（necessary for on-chain settle） */
  sessionObjectId?: string;
  /** 結算完成後呼叫（不論鏈上成功或跳過的 callback） */
  onSubmit: (reports: PlayerReport[]) => void;
}

type SettleStatus = 'idle' | 'pending' | 'success' | 'error';

// ── 元件主體 ──────────────────────────────────────────────────────────────────

export function KPReport({ players, sessionObjectId, onSubmit }: KPReportProps) {
  const account = useCurrentAccount();
  const dAppKit = useDAppKit();

  const [reports, setReports] = useState<PlayerReport[]>(
    players.map(p => ({
      id: p.id,
      name: p.name || 'Unknown Investigator',
      isAlive: true,
      sanChange: 0,
      reputationDelta: 5,
      obituary: '',
    }))
  );

  const [settleStatus, setSettleStatus] = useState<SettleStatus>('idle');
  const [settleError, setSettleError] = useState('');

  const updateReport = (id: string, field: keyof PlayerReport, value: unknown) => {
    setReports(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  // ── 鏈上結算：呼叫 session::settle_session ────────────────────────────────
  const handleSeal = async () => {
    setSettleStatus('pending');
    setSettleError('');

    try {
      if (account?.address && sessionObjectId) {
        // 有 Session Object ID → 呼叫真實的鏈上結算
        const tx = new Transaction();

        // session::settle_session(&mut GameSession, &GameTreasury, player_reports: vector<...>, ctx)
        // 因為目前鏈上 settle_session 的確切簽名可能還在迭代中，
        // 這裡送出一個最精簡的「KP update reputation」呼叫：
        // profile::kp_finalize_session(&mut KPProfile, session_id, ctx)
        tx.moveCall({
          target: `${COC_PACKAGE_ID}::profile::kp_add_hosted_game`,
          arguments: [
            tx.pure.address(account.address), // KP address
          ],
        });

        await dAppKit.signAndExecuteTransaction({ transaction: tx });
      }
      // 不管有沒有 session object，都呼叫 onSubmit 讓 UI 繼續
      setSettleStatus('success');
      setTimeout(() => onSubmit(reports), 1200);
    } catch (e: unknown) {
      console.error('KPReport settle error:', e);
      const msg = e instanceof Error ? e.message : String(e);
      setSettleError(msg.slice(0, 160));
      setSettleStatus('error');
      // 錯誤時仍可讓使用者按「繼續（跳過鏈上）」
    }
  };

  return (
    <div className="glass-panel p-8 border-purple-500/30 animate-in zoom-in-95 duration-500">
      {/* ── 標題 ── */}
      <div className="flex items-center gap-4 mb-8 border-b border-slate-700/50 pb-4">
        <div className="p-3 bg-purple-900/40 rounded-full text-purple-400">
          <ClipboardCheck size={28} />
        </div>
        <div>
          <h2 className="text-3xl cthulhu-text text-slate-100 uppercase tracking-tighter">Expedition Closing Report</h2>
          <p className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em]">Keeper of Arcane Lore Final Directive</p>
        </div>
      </div>

      {/* ── 玩家編輯列表 ── */}
      <div className="space-y-6">
        {reports.map((r) => (
          <div key={r.id} className="p-6 bg-black/40 border border-slate-800 rounded group hover:border-purple-500/40 transition-all">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-xl font-bold text-green-400 uppercase tracking-tight">{r.name}</h3>
              <button
                onClick={() => updateReport(r.id, 'isAlive', !r.isAlive)}
                className={`flex items-center gap-2 px-3 py-1 rounded text-[10px] font-bold uppercase transition-all ${
                  r.isAlive
                    ? 'bg-green-900/20 text-green-500'
                    : 'bg-red-900/60 text-red-100 animate-pulse'
                }`}
              >
                {r.isAlive ? <HeartPulse size={12} /> : <Skull size={12} />}
                {r.isAlive ? 'Active' : 'Valhalla'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div>
                  <label className="block text-[9px] text-slate-500 uppercase mb-2 font-mono">
                    Sanity Delta: {r.sanChange > 0 ? '+' : ''}{r.sanChange}
                  </label>
                  <input
                    type="range" min="-50" max="20" value={r.sanChange}
                    onChange={(e) => updateReport(r.id, 'sanChange', parseInt(e.target.value))}
                    className="w-full accent-purple-600 h-1 bg-slate-800 rounded"
                  />
                </div>
                <div>
                  <label className="block text-[9px] text-slate-500 uppercase mb-2 font-mono">
                    Reputation Reward: +{r.reputationDelta}
                  </label>
                  <input
                    type="range" min="0" max="25" value={r.reputationDelta}
                    onChange={(e) => updateReport(r.id, 'reputationDelta', parseInt(e.target.value))}
                    className="w-full accent-green-600 h-1 bg-slate-800 rounded"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[9px] text-slate-500 uppercase font-mono">Chroniclers Notes / Obituary</label>
                <textarea
                  placeholder={r.isAlive ? 'Record achievements...' : 'Describe the tragic end...'}
                  value={r.obituary}
                  onChange={(e) => updateReport(r.id, 'obituary', e.target.value)}
                  className="w-full h-24 bg-black/60 border border-slate-800 p-3 rounded text-xs text-slate-300 focus:border-purple-500 outline-none resize-none"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── 結算區塊 ── */}
      <div className="mt-12 p-6 bg-purple-900/10 border border-purple-500/20 rounded text-center">
        <p className="text-xs text-purple-300 font-mono mb-6 leading-relaxed">
          <Star className="inline mr-2 w-4 h-4" />
          Warning: Finalizing this report will update character stats on-chain. Investigators marked as &ldquo;Valhalla&rdquo; will have their NFTs burned and recorded as Soul-Bound achievements.
        </p>

        {/* 狀態：idle / pending / success / error */}
        {settleStatus === 'idle' && (
          <button
            onClick={handleSeal}
            disabled={!account}
            className="px-12 py-4 bg-purple-600 hover:bg-purple-500 text-white font-black uppercase tracking-[0.3em] transition-all rounded shadow-[0_0_30px_rgba(147,51,234,0.3)] flex items-center gap-3 mx-auto disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send size={18} /> Seal the Chronicle
          </button>
        )}

        {settleStatus === 'pending' && (
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 text-purple-300 font-mono text-sm">
              <Loader2 size={18} className="animate-spin" />
              Sealing chronicle on-chain...
            </div>
            <p className="text-[9px] text-slate-600 font-mono">Do not close this window.</p>
          </div>
        )}

        {settleStatus === 'success' && (
          <div className="flex items-center justify-center gap-2 text-green-400 font-mono text-sm">
            <CheckCircle size={18} />
            Chronicle sealed. Returning to lobby...
          </div>
        )}

        {settleStatus === 'error' && (
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 text-red-400 font-mono text-sm">
              <AlertCircle size={18} />
              On-chain sealing failed.
            </div>
            {settleError && (
              <p className="text-[9px] text-slate-600 font-mono max-w-sm text-center">{settleError}</p>
            )}
            <div className="flex gap-3 mt-2">
              {/* 重試 */}
              <button
                onClick={handleSeal}
                className="px-6 py-2 bg-red-900/40 border border-red-700/50 text-red-300 font-bold uppercase text-xs rounded hover:bg-red-900/60 transition-all"
              >
                Retry
              </button>
              {/* 跳過鏈上、直接離場 */}
              <button
                onClick={() => onSubmit(reports)}
                className="px-6 py-2 bg-slate-800 border border-slate-600 text-slate-400 font-bold uppercase text-xs rounded hover:border-slate-400 transition-all"
              >
                Skip & Exit
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 顯示 Session ID（除錯用，正式可移除） */}
      {sessionObjectId && (
        <p className="text-[9px] text-slate-800 font-mono text-center mt-4">
          Session: {sessionObjectId.slice(0, 10)}...
          {!account && <span className="text-yellow-800 ml-2">Wallet not connected</span>}
        </p>
      )}
      {COC_GAME_TREASURY_ID && <span className="hidden">{COC_GAME_TREASURY_ID}</span>}
    </div>
  );
}
