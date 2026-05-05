import { User, Shield, Trophy, History, Hexagon, RefreshCw, AlertCircle } from 'lucide-react';
import { useCurrentAccount } from '@mysten/dapp-kit-react';
import { useCoreProfile, useMyInvestigators } from '../hooks/useOnChainData';
import { useLocalRunHistory } from '../hooks/useLocalRunHistory';

export function ProfileDashboard() {
  const account = useCurrentAccount();
  const { profile, isLoading: profileLoading, isError: profileError, refetch: refetchProfile } = useCoreProfile();
  const { investigators, isLoading: invLoading, refetch: refetchInv } = useMyInvestigators();
  const { records } = useLocalRunHistory();

  const handleRefresh = () => {
    refetchProfile();
    refetchInv();
  };

  // 縮短地址顯示
  const shortAddr = account?.address
    ? `${account.address.slice(0, 6)}...${account.address.slice(-4)}`
    : '—';

  if (profileLoading || invLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500 font-mono animate-pulse">
        Consulting the Mythos Registry...
      </div>
    );
  }

  if (profileError) {
    return (
      <div className="flex items-center gap-3 p-6 border border-red-900/40 rounded-xl text-red-400 font-mono">
        <AlertCircle size={20} />
        Failed to load on-chain profile. RPC may be unreachable.
      </div>
    );
  }

  // 如果鏈上沒有 CoreProfile（帳號尚未建立）
  if (!profile) {
    return (
      <div className="text-center py-20 text-slate-500 font-mono border border-dashed border-slate-800 rounded-xl">
        <User className="w-12 h-12 mx-auto mb-4 opacity-30" />
        <p>No CoreProfile found for this wallet.</p>
        <p className="text-xs mt-2">Please create a profile first.</p>
      </div>
    );
  }

  const valhalla = profile.history;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-700">
      {/* 刷新按鈕 */}
      <div className="flex justify-end">
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-slate-400 border border-slate-700 rounded hover:border-green-500/50 hover:text-green-400 transition-all"
        >
          <RefreshCw size={12} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* 左側：身分卡 */}
        <div className="md:col-span-1 space-y-6">
          <div className="glass-panel p-6 text-center eldritch-pulse">
            <div className="w-24 h-24 mx-auto bg-gradient-to-tr from-slate-800 to-slate-700 rounded-full border-2 border-green-500/30 flex items-center justify-center mb-4 relative">
              <User size={48} className="text-slate-400" />
              {/* 線上指示燈 */}
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-slate-900" />
            </div>
            <h3 className="text-lg font-bold uppercase tracking-tighter text-slate-100 break-all">
              {shortAddr}
            </h3>
            <p className="text-[9px] font-mono text-slate-500 mt-1 break-all">
              {profile.objectId.slice(0, 10)}...{profile.objectId.slice(-8)}
            </p>
            {/* 調查員數量 */}
            <div className="mt-3 flex items-center justify-center gap-2 text-[10px] text-slate-400">
              <Hexagon size={12} className="text-green-500/60" />
              <span>{investigators.length} Investigator{investigators.length !== 1 ? 's' : ''} owned</span>
            </div>
          </div>

          {/* 聲譽面板 */}
          <div className="glass-panel p-6 space-y-4">
            <h4 className="text-[10px] text-slate-500 uppercase tracking-widest font-bold flex items-center gap-2">
              <Shield size={14} className="text-purple-500" /> Reputation
            </h4>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-[10px] font-mono mb-1">
                  <span>Player Integrity</span>
                  <span className="text-green-400">{profile.playerReputation}%</span>
                </div>
                <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                  <div
                    className="bg-green-500 h-full transition-all duration-1000"
                    style={{ width: `${profile.playerReputation}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] font-mono mb-1">
                  <span>Keeper Mastery</span>
                  <span className="text-purple-400">{profile.kpReputation}%</span>
                </div>
                <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                  <div
                    className="bg-purple-500 h-full transition-all duration-1000"
                    style={{ width: `${profile.kpReputation}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 右側：統計 + 英靈殿 */}
        <div className="md:col-span-3 space-y-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Expeditions',  val: profile.playerGamesPlayed, icon: Hexagon, color: 'text-blue-400' },
              { label: 'Manifests',    val: profile.kpGamesHosted,     icon: Trophy,  color: 'text-yellow-400' },
              { label: 'Escapes',      val: profile.escapeCount,       icon: Shield,  color: 'text-red-400' },
              { label: 'Valhalla',     val: valhalla.length,           icon: SkullIcon, color: 'text-purple-400' },
            ].map((item, i) => (
              <div
                key={i}
                className="glass-panel p-4 flex items-center gap-4 group hover:scale-105 transition-transform cursor-pointer"
              >
                <div className={`p-2 bg-slate-800/50 rounded-lg ${item.color}`}>
                  <item.icon size={20} />
                </div>
                <div>
                  <p className="text-[9px] text-slate-500 uppercase tracking-tighter">{item.label}</p>
                  <p className="text-xl font-bold font-mono">{item.val}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Run History: 通關紀錄 (Local) */}
          <div className="glass-panel p-8">
            <h3 className="text-2xl cthulhu-text text-green-400 mb-6 flex items-center gap-3">
              <History size={24} className="text-green-500" /> Run History
            </h3>
            {records.length === 0 ? (
              <p className="text-slate-600 font-mono text-sm italic text-center py-6">
                No local run history found. Survival is not guaranteed.
              </p>
            ) : (
              <div className="space-y-4">
                {records.map((r, i) => {
                  const ts = r.timestamp ? new Date(r.timestamp).toLocaleDateString() : '—';
                  const isWin = r.endingType === 'escaped' || r.endingType === 'escaped_with_evidence' || r.endingType === 'boss_defeated';
                  
                  // 將結局 Key 轉為明顯的標記
                  let endingLabel = r.endingType.toUpperCase();
                  if (r.endingType === 'escaped') endingLabel = '✅ 生還逃脫';
                  else if (r.endingType === 'escaped_with_evidence') endingLabel = '🏆 真相揭露';
                  else if (r.endingType === 'boss_defeated') endingLabel = '⚔️ 討伐成功';
                  else if (r.endingType === 'died_inside') endingLabel = '💀 命喪黃泉';

                  return (
                    <div
                      key={i}
                      className={`tombstone flex gap-6 p-4 bg-black/40 border rounded group transition-all relative overflow-hidden ${isWin ? 'border-slate-800 hover:border-green-500/40' : 'border-red-900/30 hover:border-red-500/40'}`}
                    >
                      <div className="text-center min-w-[80px] flex flex-col justify-center">
                        <p className="text-[8px] text-slate-500 uppercase font-bold mb-2">{ts}</p>
                        <Hexagon className={`mx-auto ${isWin ? 'text-green-500/20' : 'text-red-500/20'}`} size={32} />
                      </div>
                      <div className="flex-1 flex flex-col justify-center">
                        <h4 className="text-lg font-bold text-slate-300 uppercase tracking-tight mb-2 flex items-center justify-between">
                          {r.scenarioTitle}
                          <span className={`text-[11px] px-3 py-1 rounded font-bold tracking-widest border ${isWin ? 'bg-green-900/30 text-green-400 border-green-500/50' : 'bg-red-900/30 text-red-400 border-red-500/50 shadow-[0_0_8px_rgba(239,68,68,0.3)]'}`}>
                            {endingLabel}
                          </span>
                        </h4>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-slate-400 leading-relaxed">
                            Investigator: <span className="text-slate-300 font-bold">{r.investigatorName}</span>
                          </p>
                          <span className="text-[10px] text-slate-500 bg-slate-800 px-2 py-0.5 rounded font-mono font-normal">
                            {r.statusSnapshot}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Valhalla 英靈殿：角色死亡/退休紀錄 */}
          <div className="blood-panel p-8">
            <h3 className="text-2xl cthulhu-text text-slate-200 mb-6 flex items-center gap-3">
              <History size={24} className="text-red-800" /> The Hall of Valhalla
            </h3>
            {valhalla.length === 0 ? (
              <p className="text-slate-600 font-mono text-sm italic text-center py-6">
                No fallen investigators yet. Their stories await...
              </p>
            ) : (
              <div className="space-y-4">
                {valhalla.map((v, i) => {
                  const ts = v.timestamp
                    ? new Date(Number(v.timestamp) * 1000).toLocaleDateString()
                    : '—';
                  return (
                    <div
                      key={i}
                      className="tombstone flex gap-6 p-4 bg-black/40 border border-red-900/30 rounded group hover:border-red-500/40 transition-all relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <SkullIcon size={60} />
                      </div>
                      <div className="text-center min-w-[80px]">
                        <p className="text-[8px] text-slate-500 uppercase font-bold">{ts}</p>
                        <Hexagon className="mx-auto my-2 text-purple-500/40" size={32} />
                        <span className="text-[9px] bg-purple-900/40 text-purple-400 px-2 py-0.5 rounded font-mono">
                          {v.status}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-bold text-slate-300 uppercase tracking-tight mb-1">
                          {v.investigator_name}
                        </h4>
                        <p className="text-xs text-slate-500 italic leading-relaxed">
                          "{v.obituary}"
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// 骷髏 SVG icon
const SkullIcon = ({ size }: { size?: number }) => (
  <svg
    width={size || 24}
    height={size || 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 10L9.01 10" />
    <path d="M15 10L15.01 10" />
    <path d="M12 2C7.03 2 3 6.03 3 11C3 13.04 3.69 14.91 4.86 16.4C5.55 17.29 6.27 18.11 7.02 18.86C7.94 19.78 8.86 20.73 9.4 22H11C11.55 22 12 21.55 12 21C12 20.45 11.55 20 11 20H10.5C10.22 20 10 19.78 10 19.5V18.5C10 17.12 11.12 16 12.5 16H14.5C15.88 16 17 17.12 17 18.5V19.5C17 19.78 16.78 20 16.5 20H16C15.45 20 15 20.45 15 21C15 21.55 15.45 22 16 22H17.6C18.14 20.73 19.06 19.78 19.98 18.86C20.73 18.11 21.45 17.29 22.14 16.4C23.31 14.91 24 13.04 24 11C24 6.03 19.97 2 15 2H12Z" />
  </svg>
);
