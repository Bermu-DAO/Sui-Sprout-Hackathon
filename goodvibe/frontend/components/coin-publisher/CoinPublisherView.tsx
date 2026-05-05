'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { SUI_NETWORK } from '@/config/sui';

const CreateBrandFlow = dynamic(() => import('./CreateBrandFlow'), { ssr: false });
const ManageCoinsContent = dynamic(() => import('./ManageCoinsContent'), { ssr: false });

type Tab = 'create' | 'manage';

export function CoinPublisherView() {
  const [activeTab, setActiveTab] = useState<Tab>('create');
  const deployNetwork = SUI_NETWORK as 'mainnet' | 'testnet';

  return (
    <div>
      {/* Sub-tabs: Create / Manage */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex gap-4 border-b border-ink-300/20">
          <button
            onClick={() => setActiveTab('create')}
            className={`pb-2 text-sm font-serif font-medium transition-all duration-200 border-b-2 ${
              activeTab === 'create'
                ? 'border-ink-900 text-ink-900'
                : 'border-transparent text-ink-400 hover:text-ink-700'
            }`}
          >
            Create
          </button>
          <button
            onClick={() => setActiveTab('manage')}
            className={`pb-2 text-sm font-serif font-medium transition-all duration-200 border-b-2 ${
              activeTab === 'manage'
                ? 'border-ink-900 text-ink-900'
                : 'border-transparent text-ink-400 hover:text-ink-700'
            }`}
          >
            Manage
          </button>
        </div>
      </div>

      {/* Network Badge */}
      <div className="flex justify-center mb-6">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-500 bg-canvas-subtle rounded-full px-3 py-1">
          <span className={`w-1.5 h-1.5 rounded-full ${deployNetwork === 'mainnet' ? 'bg-green-500' : 'bg-yellow-500'}`} />
          {deployNetwork}
        </span>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto">
        {activeTab === 'create' && (
          <div className="bg-canvas-subtle rounded-3xl p-8 lg:p-12">
            <CreateBrandFlow deployNetwork={deployNetwork} />
          </div>
        )}
        {activeTab === 'manage' && (
          <div className="bg-canvas-subtle rounded-3xl p-8 lg:p-12">
            <ManageCoinsContent deployNetwork={deployNetwork} />
          </div>
        )}
      </div>
    </div>
  );
}
