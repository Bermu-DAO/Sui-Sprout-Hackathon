import { useState, useCallback, useEffect } from 'react';
import { useI18n } from '../i18n/useI18n';
import type { TranslationKey } from '../i18n/en';
import { useMintUsdc, useBuyTaxCoin, useBuyItemWithLottery, useClaimLottery, useLotteryDraw } from '../hooks/useInvoice';
import { useUsdcBalance, useTaxBalance, useMyInvoices, useFirstUsdcCoin, useFirstTaxCoin, useLotteryPool, useAllUsdcCoins, useSuiPrice } from '../hooks/useAssets';
import { useCurrentClient, useCurrentAccount } from '@mysten/dapp-kit-react';
import { Wallet, Receipt, Trophy, ShoppingBag, Sparkles, RefreshCw, Coins, AlertCircle, ShoppingCart } from 'lucide-react';
import {
  INVOICE_PACKAGE_ID,
  USDC_TREASURY_CAP_ID,
  SYSTEM_OBJECT_ID,
  DEFAULT_TAX_AMOUNT,
} from '../contracts/invoice';
import { COC_PACKAGE_ID } from '../contracts/protocol';

// TAX_COIN decimals = 6
const TAX_DECIMALS = 1_000_000n;

// ── 是否已填好 Object IDs ─────────────────────────────────────────────────
const SETUP_COMPLETE =
  !SYSTEM_OBJECT_ID.includes('TODO') &&
  !USDC_TREASURY_CAP_ID.includes('TODO');

export function AssetManager() {
  const { t } = useI18n();

  // ── 鏈上餘額 hooks ──
  const { balance: usdcBalance, isLoading: usdcLoading, refetch: refetchUsdc } = useUsdcBalance();
  const { balance: taxBalance, isLoading: taxLoading, refetch: refetchTax } = useTaxBalance();
  const { invoices, isLoading: invoicesLoading, refetch: refetchInvoices } = useMyInvoices();
  const { coinId: firstUsdcCoinId, refetch: refetchUsdcCoin } = useFirstUsdcCoin();
  const { coinIds: allUsdcCoinIds } = useAllUsdcCoins();
  const { coinId: firstTaxCoinId } = useFirstTaxCoin();

  // ── 抖獎池狀態（System 物件）──
  const { pool, refetch: refetchPool } = useLotteryPool(SYSTEM_OBJECT_ID);
  const { price: suiPrice } = useSuiPrice();
  // pool.winnerIndex === 0 代表還沒有手動抽獎

  // ── 檢查 Admin 權限 ──
  const account = useCurrentAccount();
  const client = useCurrentClient();
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    if (!account?.address) { setIsAdmin(false); return; }
    (client as unknown as { getOwnedObjects: (args: Record<string, unknown>) => Promise<{ data?: unknown[] }> }).getOwnedObjects({
      owner: account.address,
      filter: { StructType: `${INVOICE_PACKAGE_ID}::invoice::Admin` },
      options: { showContent: false },
    }).then((res: { data?: unknown[] }) => {
      setIsAdmin((res.data?.length ?? 0) > 0);
    }).catch(() => setIsAdmin(false));
  }, [account?.address, client]);

  // ── 交易 hooks ──
  const { mintUsdc, status: mintStatus } = useMintUsdc();
  const { buyTax, status: buyTaxStatus } = useBuyTaxCoin();
  const { buyItem, status: buyItemStatus } = useBuyItemWithLottery(COC_PACKAGE_ID);
  const { claim, status: claimStatus } = useClaimLottery();
  const { draw: drawLottery, status: drawStatus } = useLotteryDraw();

  // ── UI state ──
  const [showMintForm, setShowMintForm] = useState(false);
  const [showBuyTaxForm, setShowBuyTaxForm] = useState(false);
  const [mintAmount, setMintAmount] = useState('1000');
  const [usdcAmount, setUsdcAmount] = useState('100');

  // 格式化 USDC（6 decimals）
  const fmtUsdc = (v: bigint) => (Number(v) / 1_000_000).toFixed(2);
  // TAX_COIN 有6 decimals，與 USDC 相同。出示搮數時除以 1_000_000
  const fmtTax = (v: bigint) => {
    const display = v / TAX_DECIMALS;
    const decimals = v % TAX_DECIMALS;
    // 顯示小數（2位）
    return `${display.toLocaleString()}.${String(Number(decimals) / 10_000).padStart(2, '0').slice(0, 2)}`;
  };

  const handleRefreshAll = useCallback(() => {
    refetchUsdc();
    refetchTax();
    refetchInvoices();
    refetchUsdcCoin();
    refetchPool();
  }, [refetchUsdc, refetchTax, refetchInvoices, refetchUsdcCoin, refetchPool]);

  const statusBadge = (s: string) => {
    if (s === 'pending') return <span className="text-[9px] text-yellow-400 font-bold animate-pulse typewriter px-2">{t('assets_tx_pending')}</span>;
    if (s === 'success') return <span className="text-[9px] text-green-400 font-bold typewriter px-2">{t('assets_tx_success')}</span>;
    if (s === 'error') return <span className="text-[9px] text-red-400 font-bold typewriter px-2">{t('assets_tx_failed')}</span>;
    return null;
  };

  // ── 如果 shared-object IDs 尚未填入，顯示設定提示 ──
  const SetupBanner = () => !SETUP_COMPLETE ? (
    <div className="flex items-start gap-3 p-4 bg-yellow-900/10 border border-yellow-600/30 rounded-lg text-yellow-400 text-xs font-mono mb-6">
      <AlertCircle size={16} className="shrink-0 mt-0.5" />
      <div>
        <p className="font-bold mb-1">{t('assets_setup_warning' as TranslationKey)}</p>
        <p className="text-yellow-600">{t('assets_setup_instruction' as TranslationKey)}
          <code className="mx-1 text-yellow-300">src/contracts/invoice.ts</code>
        </p>
        <ul className="mt-2 space-y-0.5 text-yellow-700">
          <li>SYSTEM_OBJECT_ID — <code>onchain_invoice::invoice::System</code></li>
          <li>TREASURY_OBJECT_ID — <code>onchain_invoice::treasury::Treasury</code></li>
          <li>USDC_TREASURY_CAP_ID — <code>TreasuryCap&lt;USDC&gt;</code></li>
          <li>TAX_TREASURY_CAP_ID — <code>TreasuryCap&lt;TAX_COIN&gt;</code></li>
        </ul>
        <p className="mt-2 text-yellow-800">
          查詢：<code>sui client object [package_id]</code> 或在
          <a href={`https://suiscan.xyz/testnet/object/${INVOICE_PACKAGE_ID}`} target="_blank" rel="noreferrer" className="text-yellow-500 underline ml-1">SuiScan</a>
          查看部署 TX 的 Object Changes。
        </p>
      </div>
    </div>
  ) : null;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* ── Header ── */}
      {/* ── Header ── */}
      <div className="flex justify-between items-end border-b-2 border-dashed border-slate-800 pb-4 relative">
        <div>
          <h2 className="text-4xl cthulhu-text text-[#b8a164] drop-shadow-[0_0_8px_rgba(184,161,100,0.3)] flex items-center gap-3">
            <ShoppingBag className="text-[#b8a164]" size={32} />
            {t('assets_header' as TranslationKey)}
          </h2>
          <p className="text-slate-500 text-sm mt-1 typewriter uppercase tracking-widest">{t('assets_subtitle')}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {suiPrice !== null && (
            <div className="flex items-center gap-2 px-3 py-1 bg-cyan-950/30 border border-cyan-500/30 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.1)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              <span className="text-[10px] font-bold font-mono text-cyan-400 uppercase tracking-tighter">
                Live SUI: <span className="text-white">${suiPrice.toFixed(4)}</span>
              </span>
            </div>
          )}
          <button
            onClick={handleRefreshAll}
            className="flex items-center gap-2 text-[10px] text-slate-500 hover:text-[#b8a164] transition-all typewriter uppercase"
          >
            <RefreshCw size={12} /> {t('assets_refresh')}
          </button>
        </div>
      </div>

      <SetupBanner />

      {/* ── Balance Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* USDC Balance */}
        <div className="glass-panel p-6 relative overflow-hidden group border-blue-900/30">
          <div className="absolute -inset-2 bg-gradient-to-r from-blue-900/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
          <div className="flex items-center gap-3 mb-4 relative">
            <div className="p-3 bg-blue-950 border border-blue-800/50 rounded-lg text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]"><Coins size={24} /></div>
            <div>
              <p className="text-[9px] text-slate-500 uppercase tracking-widest typewriter">{t('assets_usdc_balance')}</p>
              <p className="text-3xl font-black font-mono text-blue-300 drop-shadow-md">
                {usdcLoading ? '—' : fmtUsdc(usdcBalance)}
              </p>
              <p className="text-[9px] text-slate-600 typewriter">USDC</p>
            </div>
          </div>
          <button
            onClick={() => setShowMintForm(!showMintForm)}
            disabled={!SETUP_COMPLETE}
            className="w-full relative py-2 bg-blue-950 border border-blue-800/80 text-blue-400 text-xs font-bold uppercase rounded hover:bg-blue-600 hover:text-white transition-all cursor-pointer typewriter disabled:opacity-40 disabled:cursor-not-allowed shadow-inner z-10"
          >
            {t('assets_mint_usdc')} (Faucet)
          </button>
        </div>

        {/* TAX_COIN Balance */}
        <div className="glass-panel p-6 relative overflow-hidden group border-[#b8a164]/30">
          <div className="absolute -inset-2 bg-gradient-to-r from-[#b8a164]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
          <div className="flex items-center gap-3 mb-4 relative">
            <div className="p-3 bg-[#1a1710] border border-[#b8a164]/40 rounded-lg text-[#b8a164] drop-shadow-[0_0_8px_rgba(184,161,100,0.3)]"><Wallet size={24} /></div>
            <div>
              <p className="text-[9px] text-slate-500 uppercase tracking-widest typewriter">{t('assets_tax_balance')}</p>
              <p className="text-3xl font-black font-mono text-[#b8a164] drop-shadow-md">
                {taxLoading ? '—' : fmtTax(taxBalance)}
              </p>
              <p className="text-[9px] text-slate-600 typewriter">TAX</p>
            </div>
          </div>
          <button
            onClick={() => setShowBuyTaxForm(!showBuyTaxForm)}
            disabled={!SETUP_COMPLETE || usdcBalance === 0n}
            className="w-full relative py-2 bg-[#1a1710] border border-[#b8a164]/60 text-[#b8a164] text-xs font-bold uppercase rounded hover:bg-[#b8a164] hover:text-black transition-all cursor-pointer typewriter disabled:opacity-40 disabled:cursor-not-allowed shadow-inner z-10"
          >
            {t('assets_buy_tax')}
          </button>
        </div>

        {/* Invoice Count */}
        <div className="glass-panel p-6 border-purple-500/20 relative">
          <div className="flex items-center gap-3 mb-4 relative z-10">
            <div className="p-3 bg-purple-950 border border-purple-800/50 rounded-lg text-purple-400"><Trophy size={24} /></div>
            <div>
              <p className="text-[9px] text-slate-500 uppercase tracking-widest typewriter">{t('assets_lottery')}</p>
              <p className="text-3xl font-black font-mono text-purple-400 drop-shadow-md">
                {invoicesLoading ? '—' : invoices.length}
              </p>
            </div>
          </div>
          <div className="text-[10px] typewriter text-slate-500 text-center bg-black/40 border border-slate-800 p-2 rounded relative z-10">
            {invoices.length === 0
              ? t('assets_no_invoices' as TranslationKey)
              : `${invoices.length} ${t('assets_tckt' as TranslationKey)}`}
          </div>
        </div>
      </div>

      {/* ── Mint USDC Form ── */}
      {showMintForm && (
        <div className="glass-panel p-6 animate-in zoom-in-95 duration-300 border-blue-500/30">
          <h3 className="text-lg font-bold text-blue-300 mb-2 uppercase tracking-tighter typewriter">{t('assets_mint_usdc')}</h3>
          <p className="text-[10px] text-slate-400 mb-4">{t('assets_mint_usdc_desc')}</p>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-[9px] text-slate-500 uppercase mb-1 typewriter">{t('assets_mint_amount')}</label>
              <input
                type="number"
                value={mintAmount}
                onChange={e => setMintAmount(e.target.value)}
                className="w-full bg-black/40 border border-slate-700 p-3 rounded text-sm text-blue-100 outline-none focus:border-blue-500 typewriter"
              />
            </div>
            <div>
              <button
                onClick={async () => {
                  await mintUsdc(parseInt(mintAmount) * 1_000_000);
                  // 成功後刷新餘額
                  setTimeout(handleRefreshAll, 2000);
                }}
                disabled={mintStatus === 'pending'}
                className="px-8 py-3 bg-blue-600 text-black font-black uppercase rounded hover:bg-blue-400 transition-all typewriter disabled:opacity-50"
              >
                {mintStatus === 'pending' ? t('assets_minting') : t('assets_mint_btn')}
              </button>
            </div>
          </div>
          {statusBadge(mintStatus)}
        </div>
      )}

      {/* ── Buy TAX Form ── */}
      {showBuyTaxForm && (
        <div className="glass-panel p-6 animate-in zoom-in-95 duration-300 border-green-500/30">
          <h3 className="text-lg font-bold text-green-300 mb-2 uppercase tracking-tighter typewriter">{t('assets_buy_tax')}</h3>
          <p className="text-[10px] text-slate-400 mb-4">{t('assets_buy_desc')}</p>

          {!firstUsdcCoinId ? (
            <p className="text-yellow-500 text-xs typewriter">⚠ 錢包中未找到 USDC Coin 物件，請先 Mint USDC。</p>
          ) : (
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="block text-[9px] text-slate-500 uppercase mb-1 typewriter">{t('assets_usdc_amount')}</label>
                <input
                  type="number"
                  value={usdcAmount}
                  onChange={e => setUsdcAmount(e.target.value)}
                  className="w-full bg-black/40 border border-slate-700 p-3 rounded text-sm text-green-100 outline-none focus:border-green-500 typewriter"
                />
              </div>
              <div className="text-center px-4">
                <p className="text-[9px] text-slate-500 typewriter">→</p>
                <p className="text-green-400 font-bold font-mono">{(parseInt(usdcAmount) || 0) * 10} TAX</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                {!isAdmin && (
                  <p className="text-[9px] text-yellow-500 font-mono text-right w-full">⚠ 需使用 Admin 錢包才能執行此合約</p>
                )}
                <button
                  onClick={async () => {
                    await buyTax(firstUsdcCoinId!, allUsdcCoinIds, parseInt(usdcAmount) * 1_000_000);
                    setTimeout(handleRefreshAll, 2000);
                  }}
                  disabled={buyTaxStatus === 'pending' || !isAdmin}
                  className="px-8 py-3 bg-green-600 text-black font-black uppercase rounded hover:bg-green-400 transition-all typewriter disabled:opacity-50"
                >
                  {buyTaxStatus === 'pending' ? t('assets_exchanging' as TranslationKey) : t('assets_exchange' as TranslationKey)}
                </button>
              </div>
            </div>
          )}
          {statusBadge(buyTaxStatus)}
        </div>
      )}

      {/* ── Buy Potion + Lottery ── */}
      <div className="glass-panel p-8 relative overflow-hidden bg-gradient-to-r from-red-950/20 to-black border-red-900/30 animate-in zoom-in-95 duration-700">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-900/10 rounded-full blur-3xl" />
        <div className="flex items-center gap-4 mb-6 relative z-10">
          <div className="p-4 bg-red-950/50 border border-red-800/50 rounded-lg text-red-500 shadow-[0_0_15px_rgba(220,38,38,0.3)]">
            <Sparkles size={28} className="animate-pulse" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-red-400 uppercase tracking-widest font-mono drop-shadow-[0_0_8px_rgba(220,38,38,0.5)]">{t('assets_potion_title' as TranslationKey)}</h3>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">{t('assets_buy_potion_desc' as TranslationKey)}</p>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <div className="text-right">
              <p className="text-[9px] text-slate-500 uppercase tracking-widest">{t('assets_potion_price' as TranslationKey)}</p>
              {/* DEFAULT_TAX_AMOUNT 為 raw TAX，除以 1_000_000 得到 display */}
              <p className="text-xl font-bold font-mono text-green-400">
                {(DEFAULT_TAX_AMOUNT / 1_000_000).toLocaleString(undefined, { minimumFractionDigits: DEFAULT_TAX_AMOUNT % 1_000_000 ? 4 : 0 })} TAX
              </p>
            </div>
          </div>
        </div>

        {!firstTaxCoinId ? (
          <p className="text-yellow-500 text-xs typewriter max-w-sm">⚠ {t('assets_buy_desc')}</p>
        ) : (
          <button
            onClick={async () => {
              await buyItem(firstTaxCoinId);
              setTimeout(handleRefreshAll, 2000);
            }}
            disabled={buyItemStatus === 'pending' || !SETUP_COMPLETE}
            className="w-full relative overflow-hidden px-8 py-4 bg-gradient-to-r from-red-950 to-red-900 border-2 border-red-800/80 text-red-200 font-black uppercase rounded shadow-[0_0_20px_rgba(153,27,27,0.4)] hover:shadow-[0_0_30px_rgba(220,38,38,0.6)] hover:border-red-500 transition-all typewriter flex items-center justify-center gap-3 disabled:opacity-50 group hover:-translate-y-1"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500/20 to-transparent group-hover:translate-x-full transition-transform duration-1000" />
            <ShoppingCart size={18} className="text-red-400 group-hover:text-red-300" />
            <span className="tracking-widest">
              {buyItemStatus === 'pending' ? t('assets_tx_pending') : t('assets_buy_potion')}
            </span>
            <span className="text-[10px] text-red-400/70 ml-2 group-hover:text-red-200/90 tracking-widest uppercase">
              {t('assets_potion_includes' as TranslationKey)}
            </span>
          </button>
        )}
        <div className="mt-4">{statusBadge(buyItemStatus)}</div>
      </div>

      {/* ── Invoice Gallery (Lottery Terminal) ── */}
      <div className="relative p-8 overflow-hidden rounded-xl border border-slate-700/60 shadow-2xl bg-[#0a0a0a]">
        {/* Terminal Texture & Scanline */}
        <div className="absolute inset-x-0 inset-y-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] z-0 mix-blend-overlay" />

        <div className="flex items-center gap-4 border-b border-dashed border-slate-700 pb-4 mb-8 relative z-10">
          <div className="p-3 bg-black border border-slate-800 rounded">
            <Receipt size={24} className="text-slate-400 animate-pulse" />
          </div>
          <div>
            <h3 className="text-xl uppercase tracking-widest font-mono text-slate-300 font-bold">{t('assets_lottery_terminal' as TranslationKey)}</h3>
            <p className="text-[10px] text-slate-500 font-mono tracking-widest">{t('assets_model' as TranslationKey)}</p>
          </div>
          <span className="ml-auto text-xs bg-black border border-green-900/50 text-green-500 px-3 py-1 font-mono rounded typewriter">
            {invoicesLoading ? '...' : `${t('assets_prt' as TranslationKey)} ${invoices.length}`}
          </span>
          <button
            onClick={refetchInvoices}
            className="text-slate-500 hover:text-green-400 transition-colors ml-4"
            title="Refresh Terminal"
          >
            <RefreshCw size={14} />
          </button>

          {/* 執行抽獎 (Removed isAdmin restriction so it shows up) */}
          <button
            onClick={async () => {
              await drawLottery();
              setTimeout(handleRefreshAll, 2000);
            }}
            disabled={drawStatus === 'pending'}
            className="px-3 py-1 ml-4 border-2 border-[#FFD700]/70 text-[#FFD700] text-[10px] font-bold uppercase hover:bg-[#FFD700]/20 transition-all font-mono"
          >
            {t('assets_admin_draw' as TranslationKey)}
          </button>
        </div>

        {/* ── 抽獎池狀態 Banner ── */}
        {pool && (
          <div className="mb-8 p-6 bg-black border-2 border-slate-800 rounded font-mono relative z-10 shadow-[inset_0_0_20px_rgba(0,0,0,1)]">
            <div className="grid grid-cols-3 gap-6 items-center">
              <div className="text-center border-r border-dashed border-slate-700">
                <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-1">{t('assets_total_pool' as TranslationKey)}</p>
                <p className="text-2xl font-black text-slate-300">{pool.poolSize.toString().padStart(6, '0')}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-1">{t('assets_winning_ledger' as TranslationKey)}</p>
                {pool.winnerIndex === 0 || pool.winnerIndex === null ? (
                  <p className="text-slate-500 font-bold animate-pulse text-xl tracking-widest">{t('assets_awaiting' as TranslationKey)}</p>
                ) : (
                  <p className="text-4xl font-black text-[#FFD700] drop-shadow-[0_0_15px_rgba(255,215,0,0.8)] animate-pulse tracking-tighter">
                    #{pool.winnerIndex}
                  </p>
                )}
              </div>
              <div className="text-center border-l border-dashed border-slate-700">
                {pool.winnerIndex === 0 || pool.winnerIndex === null ? (
                  <span className="text-[9px] text-slate-500 block uppercase tracking-widest">{t('assets_system_armed' as TranslationKey)}</span>
                ) : (
                  <span className="text-[10px] text-[#FFD700] block uppercase tracking-widest font-bold">{t('assets_payout_authorized' as TranslationKey)}</span>
                )}
              </div>
            </div>
          </div>
        )}

        {invoicesLoading ? (
          <p className="text-center text-slate-500 text-sm py-12 font-mono animate-pulse relative z-10">{t('assets_printing' as TranslationKey)}</p>
        ) : invoices.length === 0 ? (
          <p className="text-center text-slate-600 text-sm py-12 font-mono border border-dashed border-slate-800 mx-10 relative z-10">{t('assets_no_receipts' as TranslationKey)}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
            {invoices.map((inv) => {
              const hasWinner = pool && pool.winnerIndex !== null && pool.winnerIndex > 0;
              const isWinner = hasWinner && inv.fields.invoice_number === pool!.winnerIndex;
              const isExpired = !hasWinner;

              return (
                <div
                  key={inv.objectId}
                  className={`relative p-5 transition-all overflow-hidden ${isWinner
                      ? 'bg-[#1a1500] border-2 border-y-0 border-x-[#FFD700] shadow-[0_0_25px_rgba(255,215,0,0.3)] animate-pulse group'
                      : 'bg-[#0f0f0f] border border-y-0 border-x-slate-700 hover:bg-[#141414]'
                    }`}
                >
                  {/* Top/Bottom ragged edge simulation with dashed borders */}
                  <div className={`absolute top-0 inset-x-0 border-t-2 border-dashed ${isWinner ? 'border-[#FFD700]' : 'border-slate-700'}`} />
                  <div className={`absolute bottom-0 inset-x-0 border-b-2 border-dashed ${isWinner ? 'border-[#FFD700]' : 'border-slate-700'}`} />

                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <span className="text-[8px] text-slate-500 font-mono tracking-widest block mb-1">{t('assets_invoice_no' as TranslationKey)}</span>
                        <p className={`text-4xl font-black font-mono tracking-tighter ${isWinner ? 'text-[#FFD700] drop-shadow-[0_0_10px_rgba(255,215,0,0.6)]' : 'text-slate-300'
                          }`}>
                          {String(inv.fields.invoice_number).padStart(5, '0')}
                        </p>
                      </div>
                      {isWinner && (
                        <div className="text-[10px] bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/50 px-2 py-1 rounded-sm font-bold uppercase tracking-widest label-glow">
                          {t('assets_winner_tag' as TranslationKey)}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 text-[9px] font-mono text-slate-400 border-t border-dashed border-slate-800 pt-4 pb-4">
                      <div className="flex justify-between">
                        <span>{t('assets_sys_id' as TranslationKey)}</span>
                        <span className="text-slate-500">{inv.fields.protocol}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('assets_fee' as TranslationKey)}</span>
                        <span className={isWinner ? 'text-[#FFD700]' : 'text-slate-300'}>
                          {(inv.fields.amount / 1_000_000).toLocaleString(undefined, {
                            minimumFractionDigits: inv.fields.amount % 1_000_000 ? 4 : 0
                          })} TAX
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>{t('assets_tx_hash' as TranslationKey)}</span>
                        <span className="text-slate-600">
                          {inv.objectId.slice(0, 10)}...
                        </span>
                      </div>
                    </div>

                    {isWinner ? (
                      <button
                        onClick={async () => {
                          await claim(inv.objectId);
                          setTimeout(handleRefreshAll, 2000);
                        }}
                        disabled={claimStatus === 'pending' || !SETUP_COMPLETE}
                        className="w-full relative overflow-hidden py-3 bg-[#FFD700] text-black font-bold uppercase text-[10px] tracking-widest rounded-none hover:bg-yellow-300 transition-all font-mono group-hover:shadow-[0_0_15px_rgba(255,215,0,0.8)] disabled:opacity-50"
                      >
                        {claimStatus === 'pending' ? t('assets_processing' as TranslationKey) : t('assets_claim_reward' as TranslationKey)}
                      </button>
                    ) : (
                      <div className="w-full py-3 text-center text-[9px] font-mono text-slate-600 bg-black/50 border border-slate-800 mt-2">
                        {isExpired ? t('assets_awaiting_draw' as TranslationKey) : t('assets_void' as TranslationKey)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6 p-4 parchment-panel text-[10px] text-slate-400 typewriter leading-relaxed">
          <p>{t('assets_claim_desc')}</p>
        </div>
      </div>
    </div>
  );
}
