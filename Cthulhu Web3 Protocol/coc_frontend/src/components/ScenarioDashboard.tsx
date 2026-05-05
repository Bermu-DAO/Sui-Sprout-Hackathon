import { useState } from 'react';
import { Plus, Users, Clock, ShieldCheck, Lock, FileText, Fingerprint, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { useI18n } from '../i18n/useI18n';
import type { TranslationKey } from '../i18n/en';
import { useScenarios } from '../hooks/useScenarios';
import type { Scenario } from '../hooks/useScenarios';

// Scenario 型別從 useScenarios hook 統一匯出，這裡重新 export 以維持向後相容
export type { Scenario } from '../hooks/useScenarios';

export function ScenarioDashboard({ onJoin }: { onJoin: (s: Scenario) => void }) {
  const { t } = useI18n();
  const [showCreate, setShowCreate] = useState(false);

  // 來自鏈上的劇本清單（若鏈上無資料則 fallback 到 demo 清單）
  const { scenarios, isLoading, isFromChain, refetch } = useScenarios();

  return (
    // 調查員的辦公桌背景：昏暗桌燈打在凌亂的桌面上
    <div className="relative min-h-[80vh] rounded-xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-700 bg-[radial-gradient(circle_at_50%_10%,rgba(139,115,85,0.15),transparent_70%),linear-gradient(to_bottom,#0a0808,#000000)] p-8 border border-[#2a2015]">
      {/* 桌面紋理光影 */}
      <div className="absolute inset-0 pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSI0IiBoZWlnaHQ9IjQiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMiIvPjwvc3ZnPg==')] opacity-30 mix-blend-overlay" />
      <div className="absolute top-0 inset-x-0 h-96 bg-gradient-to-b from-[#ffeedd]/5 to-transparent pointer-events-none blur-3xl opacity-50" />

      <div className="relative z-10">
        <div className="flex justify-between items-end border-b-2 border-dashed border-[#8b7355]/40 pb-6 mb-8">
          <div>
            <h2 className="text-4xl text-[#c4b59d] drop-shadow-[0_0_8px_rgba(196,181,157,0.3)] flex items-center gap-3" style={{ fontFamily: '"Courier New", Courier, monospace' }}>
              <FileText className="text-[#8b7355]" size={32} />
              {t('scenario_title')}
            </h2>
            <div className="flex items-center gap-3 mt-2">
              <p className="text-[#8b7355] text-sm font-mono uppercase tracking-widest">{t('scenario_subtitle')}</p>
              {/* 經源標示 */}
              <span className={`flex items-center gap-1 text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border ${
                isFromChain
                  ? 'text-green-600 border-green-900/40 bg-green-900/10'
                  : 'text-[#8b7355]/60 border-[#8b7355]/20 bg-transparent'
              }`}>
                {isFromChain ? <Wifi size={10} /> : <WifiOff size={10} />}
                {isFromChain ? 'Live' : 'Demo'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Refresh 按鈕 */}
            <button
              onClick={refetch}
              disabled={isLoading}
              className="flex items-center gap-1 text-[10px] text-[#8b7355]/60 hover:text-[#c4b59d] transition-colors font-mono uppercase disabled:opacity-40"
            >
              <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
              {isLoading ? 'Loading...' : 'Refresh'}
            </button>
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="flex items-center gap-2 px-6 py-3 bg-[#1a1510] border border-[#8b7355]/60 text-[#c4b59d] rounded hover:bg-[#8b7355]/20 hover:text-white transition-all font-mono font-bold cursor-pointer shadow-lg"
            >
              <Plus size={18} /> {showCreate ? t('scenario_close_form') : t('scenario_create')}
            </button>
          </div>
        </div>

        {showCreate && (
          <div className="parchment-panel p-10 mb-10 animate-in zoom-in-95 duration-500 max-w-4xl mx-auto transform -rotate-1 relative shadow-[0_15px_30px_rgba(0,0,0,0.8)]">
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-32 h-6 bg-yellow-900/10 -mt-2 transform -rotate-2 border border-yellow-900/20 backdrop-blur-sm" /> {/* 膠帶裝飾 */}
            <h3 className="text-2xl font-bold mb-8 text-slate-800 uppercase tracking-tighter" style={{ fontFamily: '"Special Elite", "Courier New", monospace' }}>
              {t('scenario_form_title')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 font-mono text-sm text-slate-900">
              <div className="space-y-6">
                <div>
                  <label className="block text-slate-600 font-bold uppercase tracking-widest mb-1 pb-1 border-b border-slate-400 border-dashed">{t('scenario_field_title')}</label>
                  <input type="text" placeholder={t('scenario_field_title_placeholder')} className="w-full bg-transparent border-0 border-b border-slate-500 p-2 text-slate-800 placeholder-slate-400 focus:border-slate-800 focus:ring-0 outline-none" style={{ fontFamily: '"Courier New", monospace' }} />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-slate-600 font-bold uppercase tracking-widest mb-1 pb-1 border-b border-slate-400 border-dashed">{t('scenario_field_max_players')}</label>
                    <input type="number" defaultValue={4} className="w-full bg-transparent border-0 border-b border-slate-500 p-2 text-slate-800 focus:border-slate-800 focus:ring-0 outline-none" />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-bold uppercase tracking-widest mb-1 pb-1 border-b border-slate-400 border-dashed">{t('scenario_field_duration')}</label>
                    <input type="number" defaultValue={24} className="w-full bg-transparent border-0 border-b border-slate-500 p-2 text-slate-800 focus:border-slate-800 focus:ring-0 outline-none" />
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-slate-600 font-bold uppercase tracking-widest mb-1 pb-1 border-b border-slate-400 border-dashed">{t('scenario_field_entry_fee')}</label>
                    <input type="text" defaultValue="0.5" className="w-full bg-transparent border-0 border-b border-slate-500 p-2 text-slate-800 focus:border-slate-800 focus:ring-0 outline-none" />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-bold uppercase tracking-widest mb-1 pb-1 border-b border-slate-400 border-dashed">{t('scenario_field_deposit')}</label>
                    <input type="text" defaultValue="1.0" className="w-full bg-transparent border-0 border-b border-slate-500 p-2 text-slate-800 focus:border-slate-800 focus:ring-0 outline-none" />
                  </div>
                </div>
                <div className="p-4 bg-red-900/10 border-2 border-red-900/30 rounded-sm relative">
                  <div className="absolute top-2 right-2 text-red-900/30"><Fingerprint size={32} /></div>
                  <p className="text-xs text-red-900 font-bold leading-relaxed relative z-10">
                    <ShieldCheck className="inline mr-1 w-4 h-4" />
                    {t('scenario_kp_warning')}
                  </p>
                </div>
              </div>
            </div>
            <button className="w-full mt-10 py-4 bg-[#8b7355] text-[#f4e4bc] font-black font-mono uppercase tracking-widest hover:bg-[#6b583f] transition-all border-2 border-[#5c4a35] shadow-[4px_4px_0_rgba(0,0,0,0.5)] active:shadow-none active:translate-x-1 active:translate-y-1">
              {t('scenario_deploy')}
            </button>
          </div>
        )}

        {/* 卷宗列表 (Case Files) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 p-4">
          {scenarios.map((s, index) => {
            const isLocked = s.status === 'Locked';
            // 讓卷宗有隨機的微小旋轉，看起來像散落的文件
            const rotation = [ '-rotate-2', 'rotate-1', '-rotate-1' ][index % 3];

            return (
              <div 
                key={s.id} 
                className={`relative group transition-all duration-500 transform ${rotation} hover:rotate-0 hover:z-20 cursor-pointer w-full max-w-sm mx-auto
                  ${isLocked ? 'opacity-70 grayscale-[0.8] hover:grayscale-0' : 'hover:-translate-y-2'}
                `}
                onClick={() => {
                  if (!isLocked) onJoin(s);
                }}
              >
                {/* 發黃的卷宗夾本體 */}
                <div className={`p-6 sm:p-8 min-h-[320px] shadow-[8px_8px_20px_rgba(0,0,0,0.8)] border relative overflow-hidden flex flex-col justify-between transition-all duration-500 bg-[#d8ccbb]
                  ${isLocked 
                    ? 'border-[#a39785]' 
                    : 'border-[#bfae91] group-hover:shadow-[0_0_40px_rgba(46,204,113,0.4)] group-hover:border-green-500/80'}
                `}>
                  
                  {/* 文件裝飾：紙夾與封箱膠帶 */}
                  <div className="absolute -top-3 left-8 w-4 h-12 border-2 border-slate-400 rounded-full bg-gradient-to-b from-slate-200 to-slate-400 transform -rotate-[15deg] shadow-lg z-10" />
                  {isLocked && (
                    <div className="absolute -right-4 top-2 w-24 h-6 bg-yellow-900/10 shadow-[0_1px_2px_rgba(0,0,0,0.1)] transform rotate-[35deg] border-y border-yellow-900/10 backdrop-blur-[2px] z-10 flex items-center justify-center overflow-hidden">
                      <div className="w-full h-px bg-yellow-900/20 transform -translate-y-1"></div>
                    </div>
                  )}
                  
                  {/* 背景浮水印 / 咖啡漬裝飾 */}
                  <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
                    <Fingerprint size={150} className="text-[#8b7355]" />
                  </div>

                  {/* 標題與標籤 */}
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                      {isLocked ? (
                        <div className="flex items-center gap-2 px-3 py-1 bg-red-900/10 border border-red-900/40 text-red-900 font-bold uppercase tracking-widest text-[10px] transform -rotate-3">
                          <Lock size={12} /> {t('scenario_restricted' as TranslationKey)}
                        </div>
                      ) : (
                        <div className="px-3 py-1 bg-green-900/10 border border-green-900/30 text-green-800 font-bold uppercase tracking-widest text-[10px] group-hover:bg-green-500 group-hover:text-black transition-colors transform -rotate-3 shadow-sm">
                          {t('scenario_status_open')}
                        </div>
                      )}
                      <span className="text-[10px] font-mono text-slate-500">ID:{s.id.slice(0,5)}</span>
                    </div>
                    
                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 uppercase tracking-tighter leading-tight mb-2 drop-shadow-[1px_1px_1px_rgba(0,0,0,0.1)]" style={{ fontFamily: '"Special Elite", "Courier New", monospace' }}>
                      {s.title}
                    </h3>
                    <p className="text-[10px] font-mono text-slate-600 mb-6 uppercase border-b-2 border-dotted border-slate-400/50 pb-2 inline-block">
                      {t('scenario_assigned_kp' as TranslationKey)} {s.kp.slice(0, 10)}...
                    </p>
                  </div>

                  {/* 細節資訊 */}
                  <div className="space-y-4 font-mono text-xs text-slate-700 relative z-10">
                    <div className="flex justify-between items-center border-b border-dashed border-[#cbbca1] pb-2">
                      <div className="flex items-center gap-2">
                        <Users size={14} className="text-[#8b7355]" /> {t('scenario_investigators')}
                      </div>
                      <span className="font-bold">{s.currentPlayers} / {s.maxPlayers}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-dashed border-[#cbbca1] pb-2">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-[#8b7355]" /> {t('scenario_expires')}
                      </div>
                      <span className="font-bold">12h</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-dashed border-[#cbbca1] pb-2">
                      <div className="flex items-center gap-2 text-[#8b7355]">
                        {t('scenario_entry_threshold')}
                      </div>
                      <span className="font-bold text-slate-900">{s.entryFee} + {s.deposit}</span>
                    </div>
                  </div>

                  {/* 鎖住效果層：生鏽的血色大鎖 */}
                  {isLocked && (
                    <div className="absolute inset-0 bg-red-950/10 backdrop-blur-[1.5px] flex flex-col items-center justify-center z-20 transition-all group-hover:bg-red-950/30 group-hover:backdrop-blur-[2px]">
                      <div className="w-20 h-20 rounded-full bg-red-900/90 border-4 border-red-950 shadow-[0_0_20px_rgba(153,27,27,0.8)] flex items-center justify-center transform rotate-12 relative overflow-hidden">
                        <div className="absolute inset-0 bg-black/20 mix-blend-multiply pointer-events-none"></div>
                        <Lock size={32} className="text-red-200 relative z-10" />
                      </div>
                      <span className="mt-4 font-bold text-red-950 text-xl tracking-widest font-mono bg-[#d8ccbb]/80 px-3 py-1 transform -rotate-3 border-2 border-red-900 whitespace-nowrap shadow-[3px_3px_0_rgba(153,27,27,0.3)]">
                        {t('scenario_classified' as TranslationKey)}
                      </span>
                    </div>
                  )}
                  
                  {/* 可進行的綠光提示 */}
                  {!isLocked && (
                    <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-green-500/0 to-transparent group-hover:via-green-500 group-hover:shadow-[0_0_20px_#2ecc71] transition-all duration-700 z-10" />
                  )}
                </div>

                {/* 背景的綠色妖異光影 */}
                {!isLocked && (
                  <div className="absolute -inset-4 bg-green-500/20 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none -z-10" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
