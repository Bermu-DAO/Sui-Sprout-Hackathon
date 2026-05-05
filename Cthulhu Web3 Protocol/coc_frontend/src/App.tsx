import { useState, useEffect } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit-react';
import { Loader2, Flame } from 'lucide-react';
import { WalletConnect } from './components/WalletConnect';
import { CreateProfile } from './components/CreateProfile';
import { InvestigatorMint } from './components/InvestigatorMint';
import { ScenarioDashboard, type Scenario } from './components/ScenarioDashboard';
import { ActiveScenario } from './components/ActiveScenario';
import { ProfileDashboard } from './components/ProfileDashboard';
import { AssetManager } from './components/AssetManager';
import { ScenarioEngine } from './components/ScenarioEngine';
import { BgmControls } from './components/BgmControls';
import { useI18n } from './i18n/useI18n';
import { useCoreProfile } from './hooks/useOnChainData';
import { useBgm } from './contexts/BgmContext';

type Tab = 'Expedition' | 'Manifest' | 'Scenario' | 'Profile' | 'Assets' | 'Play';

export default function App() {
  const account = useCurrentAccount();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<Tab>('Expedition');
  const [currentScenario, setCurrentScenario] = useState<Scenario | null>(null);

  // ── 從鏈上查詢 CoreProfile ───────────────────────────────
  const { profile, isLoading: profileLoading } = useCoreProfile();

  // ── 動態切換背景與 BGM ───────────────────────────────────────
  const { setCurrentTrack } = useBgm();
  
  useEffect(() => {
    // 如果是 Play 模式，由 ScenarioEngine 自己管背景與 BGM
    if (activeTab === 'Play') return;

    const root = document.getElementById('root');
    if (!root) return;
    root.classList.remove('bg-default', 'bg-magic-circle', 'bg-desk', 'bg-cosmic-tentacles', 'bg-lab-boss', 'bg-lab-corridor');

    if (!account || profileLoading || !profile) {
      // 未登入或建立角色前，使用魔法陣背景
      root.classList.add('bg-magic-circle');
      setCurrentTrack('ambient');
    } else if (activeTab === 'Expedition' || activeTab === 'Profile') {
      // 鑄造角色、個人面板也適合神祕學魔法陣
      root.classList.add('bg-magic-circle');
      setCurrentTrack('ambient');
    } else if (activeTab === 'Manifest') {
      // 劇本大廳適合整理卷宗的木皮書桌
      root.classList.add('bg-desk');
      setCurrentTrack('ambient');
    } else if (activeTab === 'Scenario') {
      // 進行中的劇本
      root.classList.add('bg-cosmic-tentacles');
      setCurrentTrack('ambient');
    } else if (activeTab === 'Assets') {
      // 資產庫
      root.classList.add('bg-lab-corridor');
      setCurrentTrack('ambient');
    } else {
      root.classList.add('bg-default');
      setCurrentTrack('none');
    }
  }, [account, profileLoading, profile, activeTab, setCurrentTrack]);

  const handleJoinScenario = (scenario: Scenario) => {
    setCurrentScenario(scenario);
    setActiveTab('Scenario');
  };

  const navBtn = (tab: Tab, label: React.ReactNode, special?: boolean) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`pb-4 text-sm font-bold uppercase tracking-widest transition-all ${activeTab === tab
        ? special
          ? 'text-[var(--color-coc-blood)] border-b-2 border-[var(--color-coc-blood)]'
          : 'text-[var(--color-coc-green)] border-b-2 border-[var(--color-coc-green)] eldritch-pulse'
        : special
          ? 'text-red-900 hover:text-[var(--color-coc-blood)]'
          : 'text-[var(--color-coc-parchment)] opacity-60 hover:opacity-100'
        }`}
    >
      {label}
    </button>
  );

  // 未連錢包 → 落地頁
  if (!account) {
    return (
      <div className="min-h-screen text-slate-200">
        <BgmControls />
        <WalletConnect />
        <main className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center mt-20 animate-in fade-in duration-1000">
            <img src="/logo.webp" alt="Sui Cthulhu Logo" className="w-32 h-32 mx-auto drop-shadow-[0_0_15px_rgba(0,255,157,0.5)] mb-6 animate-pulse" />
            <h2 className="text-5xl cthulhu-text text-[var(--color-coc-parchment)] mb-6 drop-shadow-[0_0_15px_rgba(0,255,157,0.3)]">
              {t('landing_title')}
            </h2>
            <p className="text-lg text-[var(--color-coc-parchment)] opacity-80 mb-8 max-w-xl mx-auto leading-relaxed typewriter">
              {t('landing_desc')}
            </p>
          </div>
        </main>
      </div>
    );
  }

  // 已連錢包，查 Profile 中
  if (profileLoading) {
    return (
      <div className="min-h-screen text-slate-200">
        <BgmControls />
        <WalletConnect />
        <main className="max-w-7xl mx-auto px-6 py-20 flex items-center justify-center">
          <div className="text-center space-y-4 text-[var(--color-coc-green)]">
            <Loader2 className="w-10 h-10 mx-auto animate-spin opacity-50" />
            <p className="typewriter text-sm tracking-widest text-[var(--color-coc-parchment)]">Scanning the Mythos Registry...</p>
          </div>
        </main>
      </div>
    );
  }

  // 已連錢包，但沒有 CoreProfile → 第一次加入，需要建立帳號
  if (!profile) {
    return (
      <div className="min-h-screen text-slate-200">
        <BgmControls />
        <WalletConnect />
        <main className="max-w-7xl mx-auto px-6 py-12">
          <CreateProfile onProfileCreated={() => {
            // Profile 建立後重新從鏈上確認（hook 會自動 refetch）
            window.location.reload();
          }} />
        </main>
      </div>
    );
  }

  // 已連錢包 + 有 CoreProfile → 主介面
  return (
    <div className="min-h-screen text-slate-200">
      <BgmControls />
      <WalletConnect />
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="space-y-8">
          <nav className="flex items-center gap-8 border-b border-slate-800 overflow-x-auto">
            <img src="/logo.webp" alt="Logo" className="h-8 w-8 ml-2 drop-shadow-[0_0_8px_rgba(0,255,157,0.8)]" />
            {navBtn('Expedition', t('nav_character'))}
            {navBtn('Manifest', t('nav_scenario'))}
            {navBtn('Profile', t('nav_profile'))}
            {navBtn('Assets', t('nav_assets'))}
            {navBtn('Play', <span className="flex items-center gap-1"><Flame className="w-4 h-4" />{t('nav_play')}</span>, true)}
            {currentScenario && navBtn('Scenario', t('nav_active'))}
          </nav>

          <div className="animate-in fade-in duration-500">
            {activeTab === 'Expedition' && <InvestigatorMint />}
            {activeTab === 'Manifest' && <ScenarioDashboard onJoin={handleJoinScenario} />}
            {activeTab === 'Profile' && <ProfileDashboard />}
            {activeTab === 'Assets' && <AssetManager />}
            {activeTab === 'Play' && <ScenarioEngine />}
            {activeTab === 'Scenario' && currentScenario && (
              <ActiveScenario
                scenario={currentScenario}
                onLeave={() => {
                  setCurrentScenario(null);
                  setActiveTab('Manifest');
                }}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
