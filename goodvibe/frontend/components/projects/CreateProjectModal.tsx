'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useCurrentAccount, useDAppKit } from '@mysten/dapp-kit-react';
import { useQueryClient } from '@tanstack/react-query';
import { useCreatorCap } from '@/hooks/useCreatorCap';
import { useManageableCoins } from '@/hooks/coin-publisher/useManageableCoins';
import { buildCreateProjectAsCreatorTx } from '@/utils/projectTx';
import { extractSignAndExecuteDigest, isFailedSignAndExecuteResult } from '@/lib/coin-publisher/suiTransactionResult';
import { SUI_NETWORK } from '@/config/sui';
import { txLoading, txSuccess, txError } from '@/utils/txToast';
import { AnimatePresence, motion } from 'framer-motion';
import { TxResult } from '@/components/ui/TxResult';
import dynamic from 'next/dynamic';

const CreateBrandFlow = dynamic(
  () => import('@/components/coin-publisher/CreateBrandFlow'),
  { ssr: false },
);

interface ProjectFormData {
  title: string;
  description: string;
  category: string;
  coverImageUrl: string;
}

const CATEGORIES = ['Education', 'Environment', 'Healthcare', 'Community', 'Technology', 'Art & Culture', 'Other'];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
}

export default function CreateProjectModal({ isOpen, onClose, triggerRef }: Props) {
  const account = useCurrentAccount();
  const dAppKit = useDAppKit();
  const queryClient = useQueryClient();
  const deployNetwork = SUI_NETWORK as 'mainnet' | 'testnet';
  const { creatorCap } = useCreatorCap();
  const { data: coins = [], isLoading: coinsLoading, refetch: refetchCoins } = useManageableCoins(
    account?.address ?? null, deployNetwork,
  );
  const panelRef = useRef<HTMLDivElement>(null);

  const [view, setView] = useState<'form' | 'coin' | 'done' | 'error'>('form');
  const [formData, setFormData] = useState<ProjectFormData>({
    title: '', description: '', category: CATEGORIES[0], coverImageUrl: '',
  });
  const [selectedCoinType, setSelectedCoinType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultDigest, setResultDigest] = useState<string | null>(null);

  useEffect(() => {
    if (coins.length > 0 && !selectedCoinType) setSelectedCoinType(coins[0].stableType);
  }, [coins, selectedCoinType]);

  useEffect(() => {
    if (isOpen) {
      setView('form');
      setFormData({ title: '', description: '', category: CATEGORIES[0], coverImageUrl: '' });
      setSelectedCoinType(coins[0]?.stableType ?? '');
      setError(null);
      setResultDigest(null);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Click outside
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (triggerRef?.current?.contains(target)) return;
      if (!isSubmitting) onClose();
    };
    const timer = setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => { clearTimeout(timer); document.removeEventListener('mousedown', handler); };
  }, [isOpen, isSubmitting, onClose, triggerRef]);

  // ESC
  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && !isSubmitting) onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen, isSubmitting, onClose]);

  const isFormValid =
    formData.title.trim().length > 0 &&
    formData.description.trim().length > 0 &&
    formData.coverImageUrl.trim().length > 0 &&
    selectedCoinType.length > 0;

  const handleSubmit = async () => {
    if (!account?.address || !creatorCap || !selectedCoinType) return;
    setIsSubmitting(true);
    setError(null);
    txLoading();
    try {
      const tx = buildCreateProjectAsCreatorTx(
        creatorCap.objectId, formData.title, formData.description,
        formData.category, formData.coverImageUrl, selectedCoinType,
      );
      const result = await dAppKit.signAndExecuteTransaction({ transaction: tx });
      if (isFailedSignAndExecuteResult(result)) throw new Error('Transaction failed on-chain');
      const digest = extractSignAndExecuteDigest(result);
      if (digest) {
        setResultDigest(digest);
        txSuccess(digest, `"${formData.title}" created`);
        setView('done');
        await queryClient.invalidateQueries({ queryKey: ['creatorCap'] });
        await queryClient.invalidateQueries({ queryKey: ['projects'] });
      } else {
        txError('No transaction digest');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      txError(msg);
      setError(/reject|cancelled|denied/i.test(msg) ? 'Transaction cancelled.' : msg);
      setView('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const input = 'block w-full rounded-xl border border-ink-300/30 bg-canvas-default px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-ink-900/20 focus:border-ink-900/40 transition-colors';

  // Desktop: anchored dropdown. Mobile: fixed bottom sheet.
  const panelClass = [
    // shared
    'z-50 rounded-2xl bg-surface/97 backdrop-blur-xl border border-ink-300/15 shadow-xl shadow-ink-900/8',
    // mobile: fixed bottom sheet
    'fixed inset-x-3 bottom-3 max-h-[85vh] overflow-y-auto',
    // desktop: absolute dropdown from button
    'sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-3 sm:bottom-auto sm:w-[420px] sm:max-h-none sm:overflow-visible',
  ].join(' ');

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Mobile backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-black/20 sm:hidden"
            onClick={() => !isSubmitting && onClose()}
          />

          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            style={{ transformOrigin: typeof window !== 'undefined' && window.innerWidth < 640 ? 'bottom center' : 'top right' }}
            className={panelClass}
          >
            <div className="p-5">

              {/* ── Done ── */}
              {view === 'done' && (
                <TxResult
                  status="success"
                  title={formData.title}
                  description="Your project is live and accepting supporters."
                  details={[{ label: 'Category', value: formData.category }]}
                  digests={resultDigest ? [{ label: 'Transaction', digest: resultDigest }] : []}
                  primaryAction={{ label: 'Done', onClick: onClose }}
                />
              )}

              {/* ── Error ── */}
              {view === 'error' && (
                <TxResult
                  status="error"
                  title="Something Went Wrong"
                  errorMessage={error ?? undefined}
                  primaryAction={{ label: 'Retry', onClick: () => { setView('form'); setError(null); } }}
                  secondaryAction={{ label: 'Cancel', onClick: onClose }}
                />
              )}

              {/* ── Create Coin ── */}
              {view === 'coin' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <button onClick={async () => { await refetchCoins(); setView('form'); }}
                      className="inline-flex items-center text-xs text-ink-400 hover:text-ink-900 transition-colors group">
                      <svg className="w-3.5 h-3.5 mr-1 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                      </svg>
                      Back to form
                    </button>
                    <span className="text-xs font-serif font-medium text-ink-500">Create Coin</span>
                  </div>
                  <CreateBrandFlow deployNetwork={deployNetwork} onSuccess={async () => { await refetchCoins(); setView('form'); }} />
                </div>
              )}

              {/* ── Form ── */}
              {view === 'form' && (
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-serif font-medium text-ink-500 mb-1">Title</label>
                    <input type="text" value={formData.title}
                      onChange={(e) => setFormData(d => ({ ...d, title: e.target.value }))}
                      placeholder="Ocean Cleanup Initiative" className={input} />
                  </div>
                  <div>
                    <label className="block text-xs font-serif font-medium text-ink-500 mb-1">Description</label>
                    <textarea value={formData.description}
                      onChange={(e) => setFormData(d => ({ ...d, description: e.target.value }))}
                      placeholder="Describe your project..." rows={2} className={`${input} resize-none`} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-serif font-medium text-ink-500 mb-1">Category</label>
                      <select value={formData.category}
                        onChange={(e) => setFormData(d => ({ ...d, category: e.target.value }))}
                        className={input}>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-serif font-medium text-ink-500 mb-1">Cover Image</label>
                      <input type="url" value={formData.coverImageUrl}
                        onChange={(e) => setFormData(d => ({ ...d, coverImageUrl: e.target.value }))}
                        placeholder="https://..." className={input} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-baseline justify-between mb-1">
                      <label className="text-xs font-serif font-medium text-ink-500">Brand Stablecoin</label>
                      <button onClick={() => setView('coin')}
                        className="text-[11px] text-accent-primary hover:underline font-serif">
                        Create new
                      </button>
                    </div>
                    {coinsLoading ? (
                      <div className="h-10 bg-canvas-subtle rounded-xl animate-pulse" />
                    ) : coins.length === 0 ? (
                      <button onClick={() => setView('coin')}
                        className="w-full text-left rounded-xl bg-canvas-subtle px-3.5 py-2.5 text-sm text-ink-400 hover:text-ink-600 transition-colors">
                        No coins yet — click to create one &rarr;
                      </button>
                    ) : (
                      <div className="relative">
                        <select value={selectedCoinType}
                          onChange={(e) => setSelectedCoinType(e.target.value)}
                          className={`${input} appearance-none pr-10 font-serif`}>
                          {coins.map(coin => (
                            <option key={coin.id} value={coin.stableType}>
                              {coin.name} ({coin.symbol})
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-ink-400">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                  <button disabled={!isFormValid || isSubmitting} onClick={handleSubmit}
                    className="w-full py-2.5 rounded-xl bg-ink-900 text-white font-serif font-medium text-sm hover:bg-ink-700 transition-all active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {isSubmitting && (
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    )}
                    {isSubmitting ? 'Creating...' : 'Create Project'}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
