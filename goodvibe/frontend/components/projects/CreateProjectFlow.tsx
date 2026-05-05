'use client';

import React, { useState } from 'react';
import { useCurrentAccount, useDAppKit } from '@mysten/dapp-kit-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/Button';
import { useCreatorCap } from '@/hooks/useCreatorCap';
import { useManageableCoins, type ManageableCoin } from '@/hooks/coin-publisher/useManageableCoins';
import { buildCreateProjectAsCreatorTx } from '@/utils/projectTx';
import { extractSignAndExecuteDigest, isFailedSignAndExecuteResult } from '@/lib/coin-publisher/suiTransactionResult';
import { SUI_NETWORK } from '@/config/sui';
import dynamic from 'next/dynamic';

const CreateBrandFlow = dynamic(
  () => import('@/components/coin-publisher/CreateBrandFlow'),
  { ssr: false },
);

type Step = 'info' | 'coin' | 'confirm' | 'creating-coin' | 'done' | 'error';

interface ProjectFormData {
  title: string;
  description: string;
  category: string;
  coverImageUrl: string;
}

const CATEGORIES = [
  'Education',
  'Environment',
  'Healthcare',
  'Community',
  'Technology',
  'Art & Culture',
  'Other',
];

export default function CreateProjectFlow() {
  const account = useCurrentAccount();
  const dAppKit = useDAppKit();
  const queryClient = useQueryClient();
  const deployNetwork = SUI_NETWORK as 'mainnet' | 'testnet';
  const { creatorCap, hasCreatorCap, canCreateMore, isLoading: capLoading } = useCreatorCap();
  const { data: coins = [], isLoading: coinsLoading, refetch: refetchCoins } = useManageableCoins(
    account?.address ?? null,
    deployNetwork,
  );

  const [step, setStep] = useState<Step>('info');
  const [formData, setFormData] = useState<ProjectFormData>({
    title: '',
    description: '',
    category: CATEGORIES[0],
    coverImageUrl: '',
  });
  const [coinChoice, setCoinChoice] = useState<'existing' | 'new'>('existing');
  const [selectedCoinType, setSelectedCoinType] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultDigest, setResultDigest] = useState<string | null>(null);

  // When coins load, auto-select the first one
  React.useEffect(() => {
    if (coins.length > 0 && !selectedCoinType) {
      setSelectedCoinType(coins[0].stableType);
    }
  }, [coins, selectedCoinType]);

  const isFormValid =
    formData.title.trim().length > 0 &&
    formData.description.trim().length > 0 &&
    formData.coverImageUrl.trim().length > 0;

  const canProceedToCoin = isFormValid;
  const canSubmit =
    coinChoice === 'existing' ? !!selectedCoinType : false; // new coin flow handles its own submit

  const handleSubmitProject = async () => {
    if (!account?.address || !creatorCap || !selectedCoinType) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const tx = buildCreateProjectAsCreatorTx(
        creatorCap.objectId,
        formData.title,
        formData.description,
        formData.category,
        formData.coverImageUrl,
        selectedCoinType,
      );

      const result = await dAppKit.signAndExecuteTransaction({ transaction: tx });
      if (isFailedSignAndExecuteResult(result)) {
        throw new Error('Transaction failed on-chain');
      }
      const digest = extractSignAndExecuteDigest(result);
      if (digest) {
        setResultDigest(digest);
        setStep('done');
        await queryClient.invalidateQueries({ queryKey: ['creatorCap'] });
        await queryClient.invalidateQueries({ queryKey: ['projects'] });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/reject|cancelled|denied/i.test(msg)) {
        setError('Transaction cancelled.');
      } else {
        setError(msg);
      }
      setStep('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- No wallet ---
  if (!account) {
    return (
      <div className="bg-canvas-subtle rounded-3xl p-8 lg:p-12 text-center">
        <h2 className="text-2xl font-serif font-bold text-ink-900 mb-2">Connect Wallet</h2>
        <p className="text-ink-500">Connect your Sui wallet to create a project.</p>
      </div>
    );
  }

  // --- No CreatorCap ---
  if (!capLoading && !hasCreatorCap) {
    return (
      <div className="bg-canvas-subtle rounded-3xl p-8 lg:p-12 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-canvas-sand">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-700">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <h2 className="text-2xl font-serif font-bold text-ink-900 mb-2">Creator Access Required</h2>
        <p className="text-ink-500 max-w-md mx-auto">
          You need a Project Creator Cap to create projects. Please contact the platform admin to request access.
        </p>
        <p className="text-xs text-ink-400 mt-4 font-mono">{account.address}</p>
      </div>
    );
  }

  // --- Limit reached ---
  if (!capLoading && hasCreatorCap && !canCreateMore) {
    return (
      <div className="bg-canvas-subtle rounded-3xl p-8 lg:p-12 text-center">
        <h2 className="text-2xl font-serif font-bold text-ink-900 mb-2">Project Limit Reached</h2>
        <p className="text-ink-500">
          You have created {creatorCap!.projectsCreated} / {creatorCap!.maxProjects} projects.
          Contact admin for a higher limit.
        </p>
      </div>
    );
  }

  if (capLoading) {
    return (
      <div className="bg-canvas-subtle rounded-3xl p-8 text-center text-ink-500">
        Checking creator access...
      </div>
    );
  }

  // --- Done ---
  if (step === 'done') {
    return (
      <div className="bg-canvas-sage rounded-3xl p-8 lg:p-12 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white/60">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-ink-900">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
        </div>
        <h2 className="text-2xl font-serif font-bold text-ink-900 mb-2">Project Created!</h2>
        <p className="text-ink-500 mb-6">Your project &ldquo;{formData.title}&rdquo; is now live.</p>
        {resultDigest && (
          <p className="text-xs text-ink-400 mb-6">
            Tx:{' '}
            <a href={`https://suiscan.xyz/${deployNetwork}/tx/${resultDigest}`} target="_blank" rel="noopener noreferrer" className="text-accent-primary hover:underline font-mono">
              {resultDigest.slice(0, 10)}...
            </a>
          </p>
        )}
        <Button variant="primary" size="lg" onClick={() => { setStep('info'); setFormData({ title: '', description: '', category: CATEGORIES[0], coverImageUrl: '' }); setResultDigest(null); }}>
          Create Another
        </Button>
      </div>
    );
  }

  // --- Error ---
  if (step === 'error') {
    return (
      <div className="bg-canvas-rose rounded-3xl p-8 lg:p-12 text-center">
        <h2 className="text-2xl font-serif font-bold text-ink-900 mb-2">Failed</h2>
        <p className="text-sm text-ink-700 mb-6 break-words">{error}</p>
        <Button variant="primary" size="lg" onClick={() => { setStep('confirm'); setError(null); }}>
          Try Again
        </Button>
      </div>
    );
  }

  // --- Creating new coin (embedded CreateBrandFlow) ---
  if (step === 'creating-coin') {
    return (
      <div>
        <button
          onClick={() => setStep('coin')}
          className="inline-flex items-center text-sm font-medium text-ink-500 hover:text-ink-900 transition-colors group mb-6"
        >
          <svg className="w-4 h-4 mr-1.5 transform group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to coin selection
        </button>
        <div className="bg-canvas-subtle rounded-3xl p-8 lg:p-12">
          <h3 className="text-xl font-serif font-bold text-ink-900 mb-6 text-center">Create Brand Stablecoin</h3>
          <CreateBrandFlow deployNetwork={deployNetwork} />
          <div className="mt-6 text-center">
            <button
              onClick={async () => { await refetchCoins(); setStep('coin'); setCoinChoice('existing'); }}
              className="text-sm font-serif font-medium text-accent-primary hover:underline"
            >
              Done creating? Back to select coin &rarr;
            </button>
          </div>
        </div>
      </div>
    );
  }

  const inputClass =
    'block w-full rounded-lg border border-ink-300/40 bg-white px-4 py-3 text-sm text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-ink-900 transition-colors';

  return (
    <div className="bg-canvas-subtle rounded-3xl p-8 lg:p-12">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {['info', 'coin', 'confirm'].map((s, i) => (
          <React.Fragment key={s}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              step === s ? 'bg-ink-900 text-white' :
              ['info', 'coin', 'confirm'].indexOf(step) > i ? 'bg-ink-900/20 text-ink-900' :
              'bg-ink-300/20 text-ink-400'
            }`}>
              {i + 1}
            </div>
            {i < 2 && <div className="w-8 h-px bg-ink-300/30" />}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Project Info */}
      {step === 'info' && (
        <div className="space-y-6">
          <h3 className="text-xl font-serif font-bold text-ink-900 text-center">Project Details</h3>
          <div>
            <label className="block text-sm font-serif font-medium text-ink-700 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData((d) => ({ ...d, title: e.target.value }))}
              placeholder="My Awesome Project"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-serif font-medium text-ink-700 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((d) => ({ ...d, description: e.target.value }))}
              placeholder="What is this project about?"
              rows={4}
              className={`${inputClass} resize-none`}
            />
          </div>
          <div>
            <label className="block text-sm font-serif font-medium text-ink-700 mb-2">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData((d) => ({ ...d, category: e.target.value }))}
              className={`${inputClass} font-serif`}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-serif font-medium text-ink-700 mb-2">
              Cover Image URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              value={formData.coverImageUrl}
              onChange={(e) => setFormData((d) => ({ ...d, coverImageUrl: e.target.value }))}
              placeholder="https://..."
              className={inputClass}
            />
          </div>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            disabled={!canProceedToCoin}
            onClick={() => setStep('coin')}
          >
            Next: Choose Coin
          </Button>
        </div>
      )}

      {/* Step 2: Coin Selection */}
      {step === 'coin' && (
        <div className="space-y-6">
          <h3 className="text-xl font-serif font-bold text-ink-900 text-center">Choose Brand Stablecoin</h3>
          <p className="text-sm text-ink-500 text-center">
            Your project will earn yield from this coin. This cannot be changed later.
          </p>

          {/* Toggle */}
          <div className="flex justify-center">
            <div className="inline-flex rounded-xl bg-white p-1">
              <button
                onClick={() => setCoinChoice('existing')}
                className={`px-5 py-2 text-sm font-serif font-medium rounded-lg transition-all ${
                  coinChoice === 'existing' ? 'bg-ink-900 text-white shadow-sm' : 'text-ink-500 hover:text-ink-900'
                }`}
              >
                Use Existing
              </button>
              <button
                onClick={() => setCoinChoice('new')}
                className={`px-5 py-2 text-sm font-serif font-medium rounded-lg transition-all ${
                  coinChoice === 'new' ? 'bg-ink-900 text-white shadow-sm' : 'text-ink-500 hover:text-ink-900'
                }`}
              >
                Create New
              </button>
            </div>
          </div>

          {coinChoice === 'existing' ? (
            <div className="space-y-3">
              {coinsLoading ? (
                <div className="h-20 bg-white/40 rounded-xl animate-pulse" />
              ) : coins.length === 0 ? (
                <div className="bg-white/40 rounded-xl p-6 text-center">
                  <p className="text-sm text-ink-500 mb-3">No branded stablecoins found in your wallet.</p>
                  <button
                    onClick={() => setCoinChoice('new')}
                    className="text-sm font-serif font-medium text-accent-primary hover:underline"
                  >
                    Create one first &rarr;
                  </button>
                </div>
              ) : (
                coins.map((coin) => (
                  <button
                    key={coin.id}
                    onClick={() => setSelectedCoinType(coin.stableType)}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                      selectedCoinType === coin.stableType
                        ? 'border-ink-900 bg-white shadow-sm'
                        : 'border-transparent bg-white/40 hover:bg-white/80'
                    }`}
                  >
                    {coin.iconUrl ? (
                      <img src={coin.iconUrl} alt="" className="h-10 w-10 rounded-full object-cover border border-ink-300/20" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-ink-900 flex items-center justify-center text-white font-serif font-bold">
                        {coin.symbol[0]}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-serif font-medium text-ink-900 truncate">{coin.name}</p>
                      <p className="text-xs text-ink-500">{coin.symbol}</p>
                    </div>
                    {selectedCoinType === coin.stableType && (
                      <svg className="w-5 h-5 text-ink-900 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))
              )}

              <div className="flex gap-3 pt-4">
                <Button variant="ghost" size="lg" onClick={() => setStep('info')} className="flex-1">
                  Back
                </Button>
                <Button
                  variant="primary"
                  size="lg"
                  disabled={!selectedCoinType}
                  onClick={() => setStep('confirm')}
                  className="flex-1"
                >
                  Next: Confirm
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-ink-500 text-center">
                Create a new branded stablecoin, then come back to select it.
              </p>
              <div className="flex gap-3">
                <Button variant="ghost" size="lg" onClick={() => setStep('info')} className="flex-1">
                  Back
                </Button>
                <Button variant="primary" size="lg" onClick={() => setStep('creating-coin')} className="flex-1">
                  Create Coin
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === 'confirm' && (
        <div className="space-y-6">
          <h3 className="text-xl font-serif font-bold text-ink-900 text-center">Confirm & Create</h3>

          <div className="bg-white/60 rounded-xl p-5 space-y-3">
            <div className="flex justify-between">
              <span className="text-xs text-ink-500 uppercase tracking-widest">Title</span>
              <span className="text-sm font-medium text-ink-900">{formData.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-ink-500 uppercase tracking-widest">Category</span>
              <span className="text-sm font-medium text-ink-900">{formData.category}</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-xs text-ink-500 uppercase tracking-widest shrink-0">Coin</span>
              <span className="text-sm font-mono text-ink-700 text-right ml-4 break-all">
                {selectedCoinType.split('::').pop()}
              </span>
            </div>
          </div>

          {formData.coverImageUrl && (
            <div className="rounded-xl overflow-hidden border border-ink-300/20">
              <img src={formData.coverImageUrl} alt="Cover" className="w-full h-40 object-cover" />
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="ghost" size="lg" onClick={() => setStep('coin')} className="flex-1">
              Back
            </Button>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleSubmitProject}
              isLoading={isSubmitting}
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Creating...' : 'Create Project'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
