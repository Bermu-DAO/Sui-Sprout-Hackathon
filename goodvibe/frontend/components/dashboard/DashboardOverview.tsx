'use client';

import React from 'react';
import { BtcUSDCPanel } from './BtcUSDCPanel';
import { SupportedProjectsList } from './SupportedProjectsList';
import { MyProjectsManager } from './MyProjectsManager';
import { WithdrawPanel } from './WithdrawPanel';
import { useCurrentAccount } from '@mysten/dapp-kit-react';

export const DashboardOverview: React.FC = () => {
  const account = useCurrentAccount();
  const userAddress = account?.address;

  if (!userAddress) return null;

  return (
    <div className="space-y-6">
      {/* ── Desktop (lg+) ── */}
      <div className="hidden lg:block space-y-6">
        {/* Row 1: Your Impact (8) + My Projects (4) — aligned height */}
        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <SupportedProjectsList className="bg-canvas-subtle h-full" />
          </div>
          <div className="lg:col-span-4">
            <MyProjectsManager userAddress={userAddress} className="bg-canvas-sage h-full" />
          </div>
        </div>

        {/* Row 2: Wallet (4) + Did You Know (4) + Claim Yield (4) — aligned height */}
        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4">
            <BtcUSDCPanel />
          </div>
          <div className="lg:col-span-4">
            <div className="bg-canvas-rose rounded-3xl p-8 flex flex-col justify-center h-full">
              <h3 className="text-2xl font-serif font-bold text-ink-900 mb-3">Did you know?</h3>
              <p className="text-ink-800 text-sm leading-relaxed font-medium">
                By keeping your USDC in Stable Layer, you are automatically earning yield that supports your favorite projects.
                You can withdraw your principal at any time without penalty.
              </p>
            </div>
          </div>
          <div className="lg:col-span-4">
            <WithdrawPanel className="bg-canvas-slate h-full" />
          </div>
        </div>
      </div>

      {/* ── Tablet / Mobile ── */}
      <div className="lg:hidden space-y-6">
        <SupportedProjectsList className="bg-canvas-subtle" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <BtcUSDCPanel />
          <WithdrawPanel className="bg-canvas-slate" />
        </div>
        <MyProjectsManager userAddress={userAddress} className="bg-canvas-sage" />
        <div className="bg-canvas-rose rounded-3xl p-8">
          <h3 className="text-2xl font-serif font-bold text-ink-900 mb-3">Did you know?</h3>
          <p className="text-ink-800 text-sm leading-relaxed font-medium">
            By keeping your USDC in Stable Layer, you are automatically earning yield that supports your favorite projects.
            You can withdraw your principal at any time without penalty.
          </p>
        </div>
      </div>
    </div>
  );
};
