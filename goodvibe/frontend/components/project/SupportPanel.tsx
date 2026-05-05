'use client';

import React, { useState } from 'react';
import { useSupportRecord, useIsSupportingProject } from '@/hooks/useSupportRecord';
import { useSupportOperations } from '@/hooks/useSupportOperations';
import { useCurrentAccount } from '@mysten/dapp-kit-react';
import { formatBalance } from '@/utils/formatters';
import { txError } from '@/utils/txToast';
import { MIN_SUPPORT_AMOUNT } from '@/config/sui';

interface SupportPanelProps {
  projectId: string;
  coinType: string;
  minAmount?: bigint;
}

export const SupportPanel: React.FC<SupportPanelProps> = ({
  projectId,
  coinType,
  minAmount = MIN_SUPPORT_AMOUNT,
}) => {
  const account = useCurrentAccount();
  const { supportRecordId, hasRecord } = useSupportRecord();
  const { isSupporting, supportAmount } = useIsSupportingProject(projectId);
  const {
    createSupportRecord,
    startSupporting,
    increaseSupport,
    withdrawSupport,
    isLoading,
  } = useSupportOperations();

  const [amount, setAmount] = useState('');

  const handleCreateRecord = async () => {
    await createSupportRecord();
  };

  const amountBigInt = () => BigInt(Math.floor(parseFloat(amount || '0') * 1_000_000));

  const handleDeposit = async () => {
    if (!supportRecordId) return;
    const value = amountBigInt();
    if (value < minAmount) {
      txError(`Minimum support is ${Number(minAmount) / 1_000_000} USDC`);
      return;
    }
    const success = await startSupporting(projectId, supportRecordId, value, coinType);
    if (success) setAmount('');
  };

  const handleAddMore = async () => {
    if (!supportRecordId) return;
    const value = amountBigInt();
    if (value < minAmount) {
      txError(`Minimum is ${Number(minAmount) / 1_000_000} USDC`);
      return;
    }
    const success = await increaseSupport(projectId, supportRecordId, value, coinType);
    if (success) setAmount('');
  };

  const handleWithdrawAll = async () => {
    if (!supportRecordId || supportAmount <= BigInt(0)) return;
    const success = await withdrawSupport(projectId, supportRecordId, supportAmount, coinType);
    if (success) setAmount('');
  };

  const coinLabel = coinType.split('::').pop() ?? 'Stablecoin';

  if (!account) {
    return (
      <div className="bg-surface rounded-2xl p-6 border border-ink-300/20 text-center">
        <p className="text-ink-500">Connect wallet to support this project</p>
      </div>
    );
  }

  if (!hasRecord) {
    return (
      <div className="bg-surface rounded-2xl p-6 border border-ink-300/20">
        <h3 className="text-xl font-serif text-ink-900 mb-4">Start Supporting</h3>
        <p className="text-ink-500 mb-4">
          Create your support record to start backing projects
        </p>
        <button
          onClick={handleCreateRecord}
          disabled={isLoading}
          className="w-full py-3 bg-ink-900 text-surface rounded-lg font-medium hover:bg-ink-700 transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Creating...' : 'Create Support Record'}
        </button>
      </div>
    );
  }

  if (isSupporting) {
    return (
      <div className="bg-surface rounded-2xl p-6 border border-ink-300/20 space-y-4">
        <div className="pb-4 border-b border-ink-300/20">
          <p className="text-sm text-ink-500 mb-1">Your Support</p>
          <p className="text-3xl font-serif text-ink-900">
            ${formatBalance(supportAmount)}
          </p>
        </div>

        <div className="pt-0">
          <p className="text-sm text-ink-500 mb-3">Add more support</p>
          <div className="flex gap-2">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount (USDC)"
              min={Number(minAmount) / 1_000_000}
              step="0.01"
              className="flex-1 px-4 py-2 bg-canvas-subtle border border-ink-300/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-ink-900"
            />
            <button
              onClick={handleAddMore}
              disabled={isLoading || !amount}
              className="px-6 py-2 bg-ink-900 text-surface rounded-lg font-medium hover:bg-ink-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? '...' : 'Add'}
            </button>
          </div>
          <p className="text-xs text-ink-400 mt-2">Min {Number(minAmount) / 1_000_000} USDC</p>
        </div>

        <button
          onClick={handleWithdrawAll}
          disabled={isLoading}
          className="w-full py-3 bg-white text-ink-900 border border-ink-200 rounded-lg font-bold shadow-sm hover:bg-ink-50 hover:border-ink-300 transition-all disabled:opacity-50"
        >
          {isLoading ? 'Processing...' : 'Withdraw All'}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-2xl p-6 border border-ink-300/20">
      <h3 className="text-xl font-serif text-ink-900 mb-4">Support This Project</h3>
      <p className="text-ink-500 mb-4 text-sm">
        Deposit USDC to mint {coinLabel} and support this project. You can withdraw your full support at any time.
      </p>

      <div className="space-y-3">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount (USDC)"
          min={Number(minAmount) / 1_000_000}
          step="0.01"
          className="w-full px-4 py-3 bg-canvas-subtle border border-ink-300/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-ink-900"
        />
        <p className="text-xs text-ink-400">Minimum {Number(minAmount) / 1_000_000} USDC</p>
        <button
          onClick={handleDeposit}
          disabled={isLoading || !amount}
          className="w-full py-3 bg-ink-900 text-surface rounded-lg font-medium hover:bg-ink-700 transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Processing...' : 'Deposit & Support'}
        </button>
      </div>
    </div>
  );
};
