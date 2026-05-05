'use client';

import React, { useState } from 'react';
import { PostUpdateForm } from './PostUpdateForm';
import { ClaimRewardPanel } from './ClaimRewardPanel';
import { AnimatePresence, motion } from 'framer-motion';

interface ManagerPanelProps {
  projectId: string;
  projectCapId: string;
  coinType?: string;
  onUpdateSuccess?: () => void;
}

type ManagerTab = 'updates' | 'rewards';

export const ManagerPanel: React.FC<ManagerPanelProps> = ({
  projectId,
  projectCapId,
  coinType,
  onUpdateSuccess
}) => {
  const [activeTab, setActiveTab] = useState<ManagerTab>('updates');

  const tabs: { id: ManagerTab; label: string }[] = [
    { id: 'updates', label: 'Updates' },
    { id: 'rewards', label: 'Yield' },
  ];

  return (
    <div className="bg-white rounded-3xl shadow-lg shadow-ink-900/5 border border-ink-200/50 overflow-hidden mb-8">
      <div className="p-6 border-b border-ink-100 bg-canvas-subtle/50 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-serif font-bold text-ink-900">Project Management</h3>
          <span className="px-2 py-1 rounded bg-ink-900 text-white text-[10px] uppercase tracking-wider font-bold">Owner</span>
        </div>

        {/* Segmented Control */}
        <div className="flex p-1.5 bg-ink-50/50 rounded-xl border border-ink-100/50">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-white text-ink-900 shadow-sm ring-1 ring-ink-900/5'
                  : 'text-ink-400 hover:text-ink-600 hover:bg-white/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 bg-white">
        <AnimatePresence mode="wait">
          {activeTab === 'updates' && (
            <motion.div
              key="updates"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="space-y-6">
                <PostUpdateForm
                  projectId={projectId}
                  projectCapId={projectCapId}
                  coinType={coinType || ''}
                  onSuccess={onUpdateSuccess}
                  defaultExpanded={true}
                />
              </div>
            </motion.div>
          )}

          {activeTab === 'rewards' && (
            <motion.div
              key="rewards"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <ClaimRewardPanel
                projectId={projectId}
                projectCapId={projectCapId}
                coinType={coinType}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
