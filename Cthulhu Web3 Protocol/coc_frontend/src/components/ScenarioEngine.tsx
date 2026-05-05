import { useState, useEffect, useRef } from 'react';
import { Dices, CheckCircle, AlertCircle, Loader2, ClipboardList, Terminal, Swords, Footprints, Skull } from 'lucide-react';
import {
  getScenarioEvents,
  getRandomStairEvents,
  getBossData,
  getEndings,
  type FloorEvent,
  type Choice,
  type Stat,
} from '../scenarios/scenario_escape_lab';
import { useMyInvestigators, useCoreProfile, useSettleSessionWithDApp } from '../hooks/useOnChainData';
import type { InvestigatorObject } from '../hooks/useOnChainData';
import { useI18n } from '../i18n/useI18n';
import type { TranslationKey } from '../i18n/en';
import { SmallRadarChart } from './InvestigatorMint';
import { useBgm } from '../contexts/BgmContext';
import { TypewriterModal } from './TypewriterModal';
import { useLocalRunHistory } from '../hooks/useLocalRunHistory';

// ── 屬性標籤 ──
const getStatLabel = (stat: Stat, t: (k: TranslationKey) => string) => {
  return t(`engine_stat_${stat}` as TranslationKey);
};

// ── 預設屬性（使用調查員擲骰結果或預設值） ──
interface InvestigatorStats {
  str: number; con: number; siz: number; dex: number;
  app: number; int: number; pow: number; edu: number; luck: number;
  hp: number; maxHp: number; san: number; maxSan: number;
}

function rollStat() { return Math.floor(Math.random() * 51) + 30; } // 3d6x5 簡化版

function generateStats(): InvestigatorStats {
  const con = rollStat();
  const siz = rollStat();
  const pow = rollStat();
  const maxHp = Math.floor((con + siz) / 10);
  const maxSan = pow;
  return {
    str: rollStat(), con, siz, dex: rollStat(),
    app: rollStat(), int: rollStat(), pow, edu: rollStat(), luck: rollStat(),
    hp: maxHp, maxHp, san: maxSan, maxSan,
  };
}

// ── 骰子工具 ──
function rollD(faces: number) { return Math.floor(Math.random() * faces) + 1; }
function randomChance() { return Math.random(); }

type GamePhase = 'setup' | 'playing' | 'boss' | 'ending';

interface GameLog {
  text: string;
  type: 'narrate' | 'success' | 'fail' | 'system' | 'boss';
}

export function ScenarioEngine() {
  const { t, lang } = useI18n();

  const SCENARIO_EVENTS = getScenarioEvents(lang);
  const RANDOM_STAIR_EVENTS = getRandomStairEvents(lang);
  const BOSS_DATA = getBossData(lang);
  const ENDINGS = getEndings(lang);

  const { investigators, isLoading: loadingCards } = useMyInvestigators();
  // CoreProfile 用來取得 objectId，結算時寫回鏈上
  const { profile } = useCoreProfile();
  // 劇本結算 hook
  const { settle, settleStatus, settleError } = useSettleSessionWithDApp();
  const { addRunRecord } = useLocalRunHistory();
  // BGM
  const { setCurrentTrack } = useBgm();

  const [selectedCard, setSelectedCard] = useState<InvestigatorObject | null>(null);
  const [phase, setPhase] = useState<GamePhase>('setup');
  const [stats, setStats] = useState<InvestigatorStats | null>(null);
  const [flags, setFlags] = useState<Set<string>>(new Set());
  const [currentFloor, setCurrentFloor] = useState(8);
  const [currentEvent, setCurrentEvent] = useState<FloorEvent | null>(null);
  const [logs, setLogs] = useState<GameLog[]>([]);
  const [endingKey, setEndingKey] = useState<keyof ReturnType<typeof getEndings> | null>(null);
  const [playerName, setPlayerName] = useState('');

  // Boss fight state
  const [bossHp, setBossHp] = useState(BOSS_DATA.bossHp);
  const [playerHpBoss, setPlayerHpBoss] = useState(0);
  const [bossLog, setBossLog] = useState<string[]>([]);
  const [bossPhase, setBossPhase] = useState<'intro' | 'fight' | 'done'>('intro');

  const [modalText, setModalText] = useState<string | null>(null);
  const [modalCallback, setModalCallback] = useState<(()=>void) | null>(null);
  const [highlightedStat, setHighlightedStat] = useState<Stat | null>(null);

  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  // ── 動態背景切換 ──
  useEffect(() => {
    const root = document.getElementById('root');
    if (!root) return;

    // 確保清理所有可能的背景 class，防止從其他 Tab 切換過來時殘留
    root.classList.remove('bg-desk', 'bg-lab-boss', 'bg-lab-boss2', 'bg-cosmic-tentacles', 'bg-default', 'bg-magic-circle', 'bg-lab-corridor');

    if (phase === 'setup') {
      root.classList.add('bg-desk');
      setCurrentTrack('ambient');
    } else if (phase === 'playing') {
      root.classList.add('bg-lab-boss');
      setCurrentTrack('stairs');
    } else if (phase === 'boss') {
      root.classList.add('bg-lab-boss2');
      setCurrentTrack('boss');
    } else if (phase === 'ending') {
      if (endingKey === 'died_inside') {
        root.classList.add('bg-cosmic-tentacles');
      } else {
        root.classList.add('bg-default');
      }
      setCurrentTrack('ending');
    }
  }, [phase, endingKey, setCurrentTrack]);

  // ── 用選取的角色卡開始遊戲 ──
  const startGameWithCard = (inv: InvestigatorObject | null) => {
    let s: InvestigatorStats;
    if (inv) {
      // 使用鏈上角色卡屬性
      const f = inv.fields;
      const maxHp = Math.floor((f.con + f.siz) / 10);
      const maxSan = f.pow;
      s = {
        str: f.str, con: f.con, siz: f.siz, dex: f.dex,
        app: f.app, int: f.int, pow: f.pow, edu: f.edu, luck: f.luck,
        hp: maxHp, maxHp, san: maxSan, maxSan,
      };
    } else {
      // 沒有角色卡，臨時骰骰
      s = generateStats();
    }
    setStats(s);
    setPhase('playing');
    setCurrentFloor(8);
    setFlags(new Set());
    setLogs([{ text: t('engine_log_start'), type: 'system' }]);
    const first = SCENARIO_EVENTS.find(e => e.id === 'intro_blackout')!;
    setCurrentEvent(first);
    addLog(`${t('engine_log_8f')}${first.description}`, 'narrate');
  };


  const addLog = (text: string, type: GameLog['type'] = 'narrate') => {
    setLogs(prev => [...prev, { text, type }]);
  };

  // ── 處理選擇 ──
  const handleChoice = (choice: Choice) => {
    if (!stats || !currentEvent) return;

    const statVal = stats[choice.stat];
    const roll = rollD(100);
    const success = roll <= statVal;

    addLog(
      `${t('engine_log_choice')}${choice.text}`,
      'system'
    );
    addLog(
      `${t('engine_log_roll_prefix')}${getStatLabel(choice.stat, t)}(${statVal})：${roll}${t('engine_log_roll_arrow')}${success ? t('engine_log_success_tag') : t('engine_log_fail_tag')}`,
      success ? 'success' : 'fail'
    );
    addLog(success ? choice.successText : choice.failText, 'narrate');

    // Apply effects
    const effect = success ? choice.successEffect : choice.failEffect;
    const newStats = { ...stats };
    if (effect) {
      if (effect.hp) {
        newStats.hp = Math.max(0, Math.min(newStats.maxHp, newStats.hp + effect.hp));
        if (effect.hp < 0) addLog(`${t('engine_log_hp_damage')}${effect.hp}${t('engine_log_hp_remain')}${newStats.hp}/${newStats.maxHp})`, 'system');
        else addLog(`${t('engine_log_hp_heal')}${effect.hp}${t('engine_log_hp_remain')}${newStats.hp}/${newStats.maxHp})`, 'system');
      }
      if (effect.san) {
        newStats.san = Math.max(0, Math.min(newStats.maxSan, newStats.san + effect.san));
        if (effect.san < 0) addLog(`${t('engine_log_san_damage')}${effect.san}${t('engine_log_san_remain')}${newStats.san})`, 'system');
        else addLog(`${t('engine_log_san_heal')}${effect.san}${t('engine_log_san_remain')}${newStats.san})`, 'system');
      }
      if (effect.addFlag) {
        setFlags(prev => new Set([...prev, effect.addFlag!]));
      }
    }

    setStats(newStats);

    // Check HP death
    if (newStats.hp <= 0) {
      addLog(t('engine_log_death_hp'), 'fail');
      setEndingKey('died_inside');
      setPhase('ending');
      return;
    }

    // Check sanity death
    if (newStats.san <= 0) {
      addLog(t('engine_log_death_san'), 'fail');
      setEndingKey('died_inside');
      setPhase('ending');
      return;
    }

    // Check special outcomes
    const resolveConsequences = () => {
      setModalText(null);
      setModalCallback(null);

      if (effect?.addFlag === 'escaped') {
        triggerEnding(flags.has('found_insurance') ? 'escaped_with_evidence' : 'escaped');
        return;
      }
      if (effect?.addFlag === 'going_basement' || (!success && choice.id === 'go_deeper')) {
        // Going to basement
        loadNextFloor(-1);
        return;
      }
      
      // Advance to next floor
      advanceFloor(currentEvent.floor, currentEvent.isStair);
    };

    // Construct the text to be displayed on modal
    const statTitle = `${t('engine_log_roll_prefix')}${getStatLabel(choice.stat, t)}(${statVal})：${roll}${t('engine_log_roll_arrow')}${success ? t('engine_log_success_tag') : t('engine_log_fail_tag')}`;
    const resultNarrative = success ? choice.successText : choice.failText;
    const fullModalText = `${statTitle}\n\n${resultNarrative}`;

    // Show typewriter modal
    setModalText(fullModalText);
    setModalCallback(() => resolveConsequences);
  };

  const advanceFloor = (fromFloor: number, wasStair?: boolean) => {
    // If we just did the intro, load a stair event or next floor event
    const nextFloor = fromFloor - 1;

    // Check if already at floor 1 special event
    if (currentEvent?.id === 'floor1_exit') return;

    // Find next planned event for this floor or a stair random event
    const isStairTransition = !wasStair;
    if (isStairTransition && nextFloor >= 1) {
      // Try to load a stair event for the current floor
      const stairEvent = SCENARIO_EVENTS.find(e =>
        e.floor === fromFloor && e.isStair
      ) || (randomChance() > 0.4 ? RANDOM_STAIR_EVENTS[0] : null);

      if (stairEvent) {
        const event = { ...stairEvent, floor: fromFloor };
        setCurrentEvent(event);
        const floorLabel = fromFloor > 0 ? `${fromFloor}F→${nextFloor}F` : `B${Math.abs(fromFloor)}`;
        addLog(`${t('engine_log_separator')}${t('engine_log_stair')}${floorLabel}】${event.title}\n${event.description}`, 'narrate');
        setCurrentFloor(nextFloor);
        return;
      }
    }

    loadNextFloor(nextFloor);
  };

  const loadNextFloor = (floor: number) => {
    setCurrentFloor(floor);

    // Boss floor
    if (floor <= -2) {
      setPhase('boss');
      setPlayerHpBoss(stats!.hp);
      setBossHp(BOSS_DATA.bossHp);
      setBossLog([]);
      setBossPhase('intro');
      addLog(`${t('engine_log_separator')}${t('engine_log_b2')}\n${BOSS_DATA.description}`, 'boss');
      return;
    }

    // Find planned event for this floor
    const event = SCENARIO_EVENTS.find(e => e.floor === floor && !e.isStair);
    if (!event) {
      // Skip to exit if no event
      const exitEvent = SCENARIO_EVENTS.find(e => e.id === 'floor1_exit')!;
      setCurrentEvent(exitEvent);
      addLog(`${t('engine_log_separator')}${t('engine_log_floor1')}\n${exitEvent.description}`, 'narrate');
      return;
    }

    setCurrentEvent(event);
    const floorLabel = floor > 0 ? `${floor}F` : `B${Math.abs(floor)}`;
    addLog(`${t('engine_log_separator')}${t('engine_log_floor')}${floorLabel}・${event.title}】\n${event.description}`, 'narrate');
  };

  const triggerEnding = (key: keyof typeof ENDINGS) => {
    setEndingKey(key);
    setPhase('ending');

    // ── 將結局寫回鏈上（如果有 CoreProfile 和選取的角色卡）────────────────
    if (profile?.objectId) {
      const invName = selectedCard?.fields.name ?? playerName ?? 'Unknown';
      // 根據結局類型產出一句墓誌銘
      const obituaryMap: Record<string, string> = {
        escaped: 'Slipped through the shadows and survived.',
        escaped_with_evidence: 'Escaped with the truth in hand.',
        boss_defeated: 'Faced the darkness and prevailed.',
        died_inside: 'The darkness claimed another soul.',
      };
      const obituary = obituaryMap[key] ?? 'An ending beyond description.';

      addRunRecord({
        scenarioTitle: t('engine_title') as string,
        investigatorName: invName,
        endingType: key,
        statusSnapshot: `HP:${stats?.hp}/${stats?.maxHp} SAN:${stats?.san}/${stats?.maxSan}`,
      });

      settle({
        profileObjectId: profile.objectId,
        investigatorName: invName,
        outcomeStatus: key,
        obituary,
      }).catch((err) => console.error('settle error:', err));
    }
  };

  // ── Boss 戰鬥 ──
  const bossAttack = () => {
    if (bossPhase === 'done') return;

    // Player attacks
    const playerAtk = rollD(3); // 1d3
    const newBossHp = Math.max(0, bossHp - playerAtk);
    setBossHp(newBossHp);

    const newLog = [`${t('engine_boss_atk_log')}${playerAtk}${t('engine_boss_atk_dmg')}${newBossHp}/${BOSS_DATA.bossHp}`];

    if (newBossHp <= 0) {
      newLog.push(t('engine_boss_win_log'));
      setBossLog(prev => [...prev, ...newLog]);
      setBossPhase('done');
      setTimeout(() => triggerEnding('boss_defeated'), 1500);
      return;
    }

    // Boss attacks
    const bossRoll = rollD(100);
    const isHit = bossRoll <= 60;

    if (isHit) {
      const bossAtk = rollD(4); // 1d4
      const newPlayerHp = Math.max(0, playerHpBoss - bossAtk);
      setPlayerHpBoss(newPlayerHp);
      newLog.push(`[BRAWL(60): ${bossRoll} HIT] ${t('engine_boss_def_log')}${bossAtk}${t('engine_boss_def_dmg')}${newPlayerHp}`);

      if (newPlayerHp <= 0) {
        newLog.push(t('engine_boss_lose_log'));
        setBossLog(prev => [...prev, ...newLog]);
        setBossPhase('done');
        setTimeout(() => triggerEnding('died_inside'), 1500);
        return;
      }
    } else {
      newLog.push(`[BOSS鬥毆(60): ${bossRoll} 判定失敗] 實驗體揮舞著利爪，但你驚險地閃過了攻擊...`);
    }

    setBossLog(prev => [...prev, ...newLog]);
  };

  const bossRun = () => {
    // Escape from boss back to 1F ending
    setBossLog(prev => [...prev, t('engine_boss_run_log')]);
    setBossPhase('done');
    setTimeout(() => triggerEnding(flags.has('found_insurance') ? 'escaped_with_evidence' : 'escaped'), 1500);
  };

  // ── 渲染 ──
  if (phase === 'setup') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="blood-panel max-w-2xl w-full p-10 space-y-8">
          {/* 標題 */}
          <div className="text-center space-y-2">
            <p className="text-sm text-red-800/80 uppercase tracking-widest typewriter">{t('engine_module')}</p>
            <h1 className="text-5xl cthulhu-text text-red-400 leading-tight">{t('engine_title')}</h1>
            <p className="text-slate-400 text-sm leading-relaxed mt-4">
              {t('engine_desc')}
            </p>
          </div>

          {/* 劇本說明 */}
          <div className="bg-black/60 border border-red-900/30 p-4 rounded text-left space-y-3 text-base typewriter text-slate-400">
            <p>🏢 <span className="text-slate-300">{t('engine_scene_label')}</span>{t('engine_scene_val')}</p>
            <p>🎲 <span className="text-slate-300">{t('engine_system_label')}</span>{t('engine_system_val')}</p>
            <p>⚔️ <span className="text-slate-300">{t('engine_boss_label')}</span>{t('engine_boss_val')}</p>
            <p>🏆 <span className="text-slate-300">{t('engine_ending_label')}</span>{t('engine_ending_val')}</p>
          </div>

          {/* ── 角色卡選擇器 ── */}
          <div className="space-y-3">
            <p className="text-sm text-slate-500 uppercase tracking-widest typewriter">{t('engine_select_inv')}</p>
            {loadingCards ? (
              <div className="flex items-center gap-3 p-4 border border-slate-800 rounded text-slate-500 font-mono text-xs">
                <Dices className="animate-spin w-4 h-4" /> {t('engine_loading_cards')}
              </div>
            ) : investigators.length === 0 ? (
              <div className="p-4 border border-dashed border-slate-800 rounded text-slate-600 font-mono text-xs text-center">
                <p>{t('engine_no_cards')}</p>
                <p className="mt-1 text-slate-700">{t('engine_no_cards_hint')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
                {investigators.map((inv) => (
                  <button
                    key={inv.objectId}
                    onClick={() => {
                      setSelectedCard(inv);
                      setPlayerName(inv.fields.name);
                    }}
                    className={`text-left p-3 rounded border transition-all typewriter ${selectedCard?.objectId === inv.objectId
                      ? 'border-red-500/60 bg-red-900/20 text-red-300'
                      : 'border-slate-800 bg-black/30 text-slate-400 hover:border-slate-600'
                      }`}
                  >
                    <div className="font-bold text-sm mb-1">{inv.fields.name}</div>
                    <div className="flex justify-center my-2 pointer-events-none scale-75 origin-top">
                      <SmallRadarChart size={160} stats={[inv.fields.str, inv.fields.con, inv.fields.siz, inv.fields.dex, inv.fields.app, inv.fields.int, inv.fields.pow, inv.fields.edu, inv.fields.luck]} />
                    </div>
                    <div className="text-xs mt-2 text-slate-700">
                      HP≈{Math.floor((inv.fields.con + inv.fields.siz) / 10)} · SAN≈{inv.fields.pow}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 名字輸入（如果沒選角色卡可以自訂名字） */}
          {!selectedCard && (
            <div className="space-y-3">
              <label className="block text-sm text-slate-500 uppercase tracking-widest typewriter">{t('engine_temp_name')}</label>
              <input
                type="text"
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                placeholder={t('engine_temp_placeholder')}
                className="w-full bg-black/60 border border-red-900/40 p-3 rounded text-center text-slate-200 typewriter outline-none focus:border-red-500/60"
              />
            </div>
          )}

          {/* 已選角色卡顯示 */}
          {selectedCard && (
            <div className="flex items-center justify-between p-3 bg-red-900/10 border border-red-800/30 rounded typewriter">
              <span className="text-xs text-slate-400">
                {t('engine_selected_inv')} <span className="text-red-300 font-bold">{selectedCard.fields.name}</span>
              </span>
              <button
                onClick={() => { setSelectedCard(null); setPlayerName(''); }}
                className="text-[10px] text-slate-600 hover:text-slate-400 transition-colors"
              >
                {t('engine_unselect')}
              </button>
            </div>
          )}

          <button
            onClick={() => startGameWithCard(selectedCard)}
            className="w-full py-4 bg-red-900/40 border border-red-500/50 text-red-300 font-black uppercase tracking-widest typewriter rounded hover:bg-red-800/60 hover:text-red-100 transition-all active:scale-95 cursor-pointer text-lg"
          >
            {t('engine_enter')}
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'ending' && endingKey) {
    const ending = ENDINGS[endingKey];
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className={`glass-panel max-w-2xl w-full p-10 space-y-6 border ${ending.bg} sanity-shake`}>
          <div className="text-center space-y-2">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest typewriter">{t('engine_ending_title')}</p>
            <div className="text-6xl">{ending.emoji}</div>
            <h1 className={`text-4xl cthulhu-text ${ending.color}`}>{t(`engine_ending_${endingKey}` as TranslationKey) || ending.title}</h1>
          </div>

          <div className="bg-black/40 p-6 rounded border border-slate-800 space-y-4">
            {ending.description.split('\n\n').map((para, i) => (
              <p key={i} className="text-slate-300 text-sm leading-relaxed typewriter">{para}</p>
            ))}
          </div>

          <p className={`text-center italic text-sm ${ending.color} typewriter`}>「{ending.flavor}」</p>

          {stats && (
            <div className="grid grid-cols-3 gap-2 text-[10px] typewriter text-center">
              <div className="bg-black/40 p-2 rounded">
                <div className="text-slate-500">{t('engine_final_hp')}</div>
                <div className="text-red-400 font-bold">{stats.hp}/{stats.maxHp}</div>
              </div>
              <div className="bg-black/40 p-2 rounded">
                <div className="text-slate-500">{t('engine_final_san')}</div>
                <div className="text-purple-400 font-bold">{stats.san}/{stats.maxSan}</div>
              </div>
              <div className="bg-black/40 p-2 rounded">
                <div className="text-slate-500">{t('engine_final_inv')}</div>
                <div className="text-green-400 font-bold">{playerName || t('engine_nameless')}</div>
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={() => { setPhase('setup'); setEndingKey(null); setLogs([]); }}
              className="flex-1 py-3 bg-slate-800 border border-slate-700 text-slate-300 font-bold uppercase typewriter rounded hover:border-slate-500 transition-all cursor-pointer"
            >
              {t('engine_replay')}
            </button>
          </div>

          {/* ── 鏈上結算狀態 ── */}
          {profile?.objectId && (
            <div className="text-center">
              {settleStatus === 'pending' && (
                <div className="flex items-center justify-center gap-2 text-slate-500 text-xs font-mono">
                  <Loader2 size={14} className="animate-spin" />
                  Recording outcome on-chain...
                </div>
              )}
              {settleStatus === 'success' && (
                <div className="flex items-center justify-center gap-2 text-green-500 text-xs font-mono">
                  <CheckCircle size={14} />
                  Chronicle sealed on-chain.
                </div>
              )}
              {settleStatus === 'error' && (
                <div className="flex flex-col items-center gap-1">
                  <div className="flex items-center gap-2 text-red-400 text-xs font-mono">
                    <AlertCircle size={14} />
                    Failed to record on-chain.
                  </div>
                  {settleError && (
                    <p className="text-[9px] text-slate-600 font-mono truncate max-w-xs">{settleError}</p>
                  )}
                </div>
              )}
              {settleStatus === 'idle' && !profile?.objectId && (
                <p className="text-[10px] text-slate-700 font-mono">No CoreProfile found — outcome not recorded.</p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* ── 狀態列 ── */}
      <div className="glass-panel p-4 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-slate-500 typewriter uppercase">{t('engine_selected_inv').replace('：', '')}</span>
          <span className="text-green-400 font-bold typewriter">{playerName || t('engine_nameless')}</span>
          <span className="text-[10px] bg-red-900/30 border border-red-800/50 text-red-400 px-2 py-0.5 rounded typewriter">
            {currentFloor > 0 ? `${currentFloor}F` : `B${Math.abs(currentFloor)}`} {t('engine_floor')}
          </span>
        </div>
        {stats && (
          <div className="flex gap-4 text-[10px] typewriter">
            {/* HP Bar */}
            <div className="flex items-center gap-2">
              <span className="text-slate-500">HP</span>
              <div className="w-24 bg-slate-800 rounded-full h-1.5">
                <div
                  className="bg-red-500 h-full rounded-full transition-all"
                  style={{ width: `${Math.max(0, (stats.hp / stats.maxHp) * 100)}%` }}
                />
              </div>
              <span className="text-red-400 font-bold">{stats.hp}/{stats.maxHp}</span>
            </div>
            {/* SAN Bar */}
            <div className="flex items-center gap-2">
              <span className="text-slate-500">{t('engine_sanity')}</span>
              <div className="w-24 bg-slate-800 rounded-full h-1.5">
                <div
                  className="bg-purple-500 h-full rounded-full transition-all"
                  style={{ width: `${Math.max(0, (stats.san / stats.maxSan) * 100)}%` }}
                />
              </div>
              <span className="text-purple-400 font-bold">{stats.san}/{stats.maxSan}</span>
            </div>
            {/* Flags */}
            {flags.has('found_insurance') && (
              <span className="bg-blue-900/30 border border-blue-700/40 text-blue-400 px-2 py-0.5 rounded flex items-center justify-center gap-1">
                <ClipboardList className="w-3 h-3" />
                {t('engine_insurance')}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── 事件日誌 ── */}
        <div className="relative p-6 font-mono text-sm h-96 lg:h-[32rem] flex flex-col bg-[#050806] border border-green-900/40 rounded-xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.9)_inset]">
          {/* CRT 掃描線特效與螢幕反光 */}
          <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] opacity-30 z-10" />
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-green-500/5 via-transparent to-green-900/20 z-0" />
          
          <h3 className="relative z-20 text-xs font-bold text-green-600 uppercase tracking-widest mb-3 flex items-center gap-2 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]">
            <Terminal className="w-4 h-4" />
            {t('engine_event_log')}
          </h3>
          <div
            ref={logRef}
            className="relative z-20 flex-1 overflow-y-auto space-y-2 pr-2 scroll-smooth scrollbar-thin scrollbar-thumb-green-900 scrollbar-track-transparent"
          >
            {logs.map((log, i) => (
              <p
                key={i}
                className={`text-[11px] leading-relaxed font-mono drop-shadow-[0_0_5px_rgba(34,197,94,0.4)] ${log.type === 'success' ? 'text-green-400 font-bold' :
                  log.type === 'fail' ? 'text-red-500 font-bold drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]' :
                    log.type === 'system' ? 'text-green-800' :
                      log.type === 'boss' ? 'text-red-400 font-bold bg-red-900/20 p-1 rounded' :
                        'text-green-500'
                  }`}
              >
                <span className="opacity-50 mr-2 text-green-800 select-none">sys&gt;</span>{log.text}
              </p>
            ))}
          </div>
        </div>

        {/* ── 選擇 ── */}
        <div className="space-y-4">
          {/* Boss Battle Panel */}
          {phase === 'boss' && (
            <div className="blood-panel p-6 space-y-4">
              <div className="flex justify-between text-sm typewriter">
                <div>
                  <span className="text-slate-500 text-[10px]">{t('engine_boss_hp')}</span>
                  <div className="w-40 bg-slate-800 rounded-full h-2 mt-1">
                    <div className="bg-red-700 h-full rounded-full transition-all" style={{ width: `${(bossHp / BOSS_DATA.bossHp) * 100}%` }} />
                  </div>
                  <span className="text-red-500 font-bold">{bossHp}/{BOSS_DATA.bossHp}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500 text-[10px]">{t('engine_your_hp')}</span>
                  <div className="w-40 bg-slate-800 rounded-full h-2 mt-1 ml-auto">
                    <div className="bg-green-600 h-full rounded-full transition-all" style={{ width: `${(playerHpBoss / (stats?.maxHp || 10)) * 100}%` }} />
                  </div>
                  <span className="text-green-400 font-bold">{playerHpBoss}/{stats?.maxHp}</span>
                </div>
              </div>

              <div className="bg-black/40 h-32 overflow-y-auto p-3 rounded border border-red-900/30 space-y-1">
                {bossLog.map((l, i) => (
                  <p key={i} className="text-xs typewriter text-slate-300">{l}</p>
                ))}
                {bossLog.length === 0 && (
                  <p className="text-xs typewriter text-slate-600">{t('engine_boss_stares')}</p>
                )}
              </div>

              {bossPhase === 'fight' && (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={bossAttack}
                    className="py-3 bg-red-900/50 border border-red-600/50 text-red-200 font-bold uppercase typewriter rounded hover:bg-red-800 transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Swords className="w-4 h-4" />
                    {t('engine_attack')}
                  </button>
                  <button
                    onClick={bossRun}
                    className="py-3 bg-black border border-slate-700 text-slate-400 font-bold uppercase typewriter rounded hover:border-slate-500 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Footprints className="w-4 h-4" />
                    {t('engine_run')}
                  </button>
                </div>
              )}

              {bossPhase === 'intro' && (
                <button
                  onClick={() => setBossPhase('fight')}
                  className="w-full py-3 bg-red-900/40 border border-red-700/50 text-red-300 font-bold uppercase typewriter rounded hover:bg-red-800/60 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Skull className="w-4 h-4" />
                  {t('engine_engage_boss')}
                </button>
              )}
            </div>
          )}

          {/* Regular Event Choices */}
          {phase === 'playing' && currentEvent && (
            <div className="glass-panel p-4 space-y-3">
              <h3 className="text-lg cthulhu-text text-slate-200 mb-4">{currentEvent.title}</h3>
              {currentEvent.choices.map((choice) => (
                <button
                  key={choice.id}
                  onClick={() => handleChoice(choice)}
                  onMouseEnter={() => setHighlightedStat(choice.stat)}
                  onMouseLeave={() => setHighlightedStat(null)}
                  className="w-full text-left p-4 bg-black/40 border border-slate-800 rounded hover:border-green-500/30 hover:bg-black/60 transition-all cursor-pointer group"
                >
                  <div className="flex justify-between items-start gap-3">
                    <span className="text-sm text-slate-200 typewriter leading-relaxed">{choice.text}</span>
                    <span className="text-[9px] text-slate-500 typewriter bg-slate-800 px-2 py-0.5 rounded shrink-0 group-hover:text-green-400 transition-colors">
                      {getStatLabel(choice.stat, t)} {stats?.[choice.stat] ?? '--'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Stats Card */}
          {stats && (
            <div className="glass-panel bg-black/80 p-6 flex flex-col items-center border border-green-900/40 shadow-[0_0_20px_rgba(34,197,94,0.05)_inset]">
              <h4 className="text-[9px] text-green-600 uppercase tracking-widest typewriter w-full mb-6 font-bold">{t('engine_investigator_stats')}</h4>
              <div className="pointer-events-none transform scale-125 my-4">
                <SmallRadarChart size={180} stats={[stats.str, stats.con, stats.siz, stats.dex, stats.app, stats.int, stats.pow, stats.edu, stats.luck]} highlightedStat={highlightedStat ?? undefined} />
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Typewriter Event Resolution Modal */}
      {modalText && modalCallback && (
        <TypewriterModal text={modalText} onComplete={modalCallback} />
      )}
    </div>
  );
}
