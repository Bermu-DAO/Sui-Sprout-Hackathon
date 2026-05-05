'use client';

import React, { useState } from 'react';
import { Project } from '@/types/project';
import { Container } from '../layout/Container';
import { formatAddress, formatBalance } from '@/utils/formatters';
import { useProjectCap } from '@/hooks/useProjectCap';
import { useProjectDetail } from '@/hooks/useProjectDetail';
import { SupportPanel } from './SupportPanel';
import { ManagerPanel } from './ManagerPanel';

function formatTimestamp(timestamp: number): string {
  // Sui 區塊鏈的時間戳是毫秒級的 Unix 時間戳
  const date = new Date(timestamp);
  
  // 格式化為：Feb 10, 2026 at 3:45 PM UTC
  const formattedDate = date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC'
  });
  
  return `${formattedDate} UTC`;
}

interface ProjectDetailProps {
  project: Project;
  isCreator: boolean; // Keep for fallback, but prefer isOwner from useProjectCap
  minDonationAmount?: bigint;
}

export const ProjectDetail: React.FC<ProjectDetailProps> = ({
  project,
  minDonationAmount = BigInt(1_000_000),
}) => {
  const [activeTab, setActiveTab] = useState<'about' | 'updates' | 'supporters'>('about');
  const { isOwner, projectCapId } = useProjectCap(project.id);
  
  // 使用統一的 API 獲取項目詳情（包含 updates 和 supporters）
  const { data: projectDetail, isLoading: detailLoading, refetch: refetchDetail } = useProjectDetail(project.id);
  
  const updates = projectDetail?.updates || [];
  const supporters = projectDetail?.supporters || [];

  const tabs = [
    { id: 'about', label: 'Story' },
    { id: 'updates', label: 'Updates', badge: updates.length },
    { id: 'supporters', label: 'Supporters', badge: project.supporterCount },
  ];

  return (
    <div className="bg-canvas-default min-h-screen pb-24">
      {/* Header Section - Color Block Style */}
      <div className="bg-canvas-rose border-b border-ink-300/10 pt-24 sm:pt-28 pb-16 sm:pb-20 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-ink-900/5 rounded-full blur-3xl transform -translate-x-1/3 translate-y-1/3 pointer-events-none" />
        
        <Container className="relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-bold bg-ink-900 text-white uppercase tracking-widest shadow-sm">
              {project.category}
            </span>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-serif text-ink-900 leading-tight tracking-tight">
              {project.title}
            </h1>
            
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-ink-700 font-medium">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-ink-100 flex items-center justify-center text-xs font-mono border border-ink-200">
                  {project.creator.slice(0, 2)}
                </span>
                <span>By <span className="text-ink-900 border-b border-ink-900/20 pb-0.5">{formatAddress(project.creator)}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-ink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Launched {project.createdAt ? new Date(Number(project.createdAt)).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Recently'}</span>
              </div>
            </div>
          </div>
        </Container>
      </div>

      <Container className="-mt-12 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Left Column (Content) */}
          <div className="lg:col-span-8 space-y-10">
            {/* Hero Image */}
            {project.imageUrl && (
              <div className="rounded-3xl overflow-hidden bg-ink-100 aspect-video relative shadow-xl ring-1 ring-ink-900/5">
                <img 
                  src={project.imageUrl} 
                  alt={project.title} 
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Tabs Navigation */}
            <div className="border-b border-ink-300/10 mb-8 pt-4">
              <nav className="flex space-x-10" aria-label="Tabs">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`pb-4 text-base font-medium transition-all relative ${
                      activeTab === tab.id
                        ? 'text-ink-900'
                        : 'text-ink-400 hover:text-ink-700'
                    }`}
                  >
                    {tab.label}
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span className={`ml-2 text-xs font-bold ${
                        activeTab === tab.id ? 'text-ink-900' : 'text-ink-400'
                      }`}>
                        {tab.badge}
                      </span>
                    )}
                    {activeTab === tab.id && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-ink-900 rounded-full" />
                    )}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="min-h-[400px] py-4">
              {activeTab === 'about' && (
                <div className="prose prose-lg max-w-none prose-headings:font-serif prose-headings:text-ink-900 prose-p:text-ink-700 prose-p:leading-relaxed prose-li:text-ink-700 prose-strong:text-ink-900">
                  <div className="text-ink-700 space-y-8 text-lg">
                    <p className="lead text-xl text-ink-900 font-medium">{project.description}</p>
                    
                    <div className="bg-canvas-subtle p-8 rounded-2xl border border-ink-300/10">
                      <h3 className="text-2xl font-serif text-ink-900 mt-0 mb-6">Project Goals</h3>
                      <ul className="space-y-4 list-none pl-0 my-0">
                        {['Deploy innovative solutions to address key challenges', 'Engage community members and stakeholders', 'Achieve measurable impact within the next 12 months', 'Maintain transparency and regular communication'].map((goal, i) => (
                          <li key={i} className="flex gap-4 items-start">
                            <div className="w-6 h-6 rounded-full bg-ink-900 text-white flex items-center justify-center flex-shrink-0 mt-0.5 text-xs">
                              {i + 1}
                            </div>
                            <span>{goal}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <h3 className="text-2xl font-serif text-ink-900">Impact</h3>
                    <p>
                      Your support enables us to continue our mission and scale our impact. 
                      Every contribution helps us move closer to our goals and create lasting change.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'updates' && (
                <div className="space-y-12">
                  
                  {detailLoading ? (
                    <div className="space-y-8">
                      {[1, 2].map((i) => (
                        <div key={i} className="animate-pulse space-y-4">
                          <div className="h-6 bg-ink-100 rounded w-1/3"></div>
                          <div className="h-4 bg-ink-50 rounded w-1/4"></div>
                          <div className="h-32 bg-ink-50 rounded-2xl w-full"></div>
                        </div>
                      ))}
                    </div>
                  ) : updates.length === 0 ? (
                    <div className="text-center py-16 bg-canvas-subtle rounded-3xl border border-dashed border-ink-300/20">
                      <div className="w-16 h-16 bg-ink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-ink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                        </svg>
                      </div>
                      <p className="text-ink-600 font-medium">No updates have been posted yet</p>
                      <p className="text-sm text-ink-400 mt-1">Check back later for progress reports</p>
                    </div>
                  ) : (
                    <div className="space-y-10">
                      {updates.map((update) => (
                        <div key={update.id} className="relative group">
                          <div className="flex items-baseline gap-4 mb-4">
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-ink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span className="text-sm font-medium text-ink-500">
                                {update.timestamp ? formatTimestamp(update.timestamp) : 'Recently'}
                              </span>
                            </div>
                            <div className="h-px flex-grow bg-ink-200/50"></div>
                          </div>
                          
                          <div className="bg-white rounded-3xl p-8 shadow-sm border border-ink-200/50">
                            <h3 className="text-2xl font-serif text-ink-900 mb-4">{update.title}</h3>
                            <div className="prose prose-lg max-w-none text-ink-700">
                              <p className="whitespace-pre-wrap leading-relaxed">{update.content}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'supporters' && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-2xl font-serif text-ink-900">Active Supporters</h3>
                    <p className="text-sm text-ink-500 mt-2">
                      Showing supporters currently backing this project
                      {project.supporterCount > supporters.length && (
                        <span className="ml-1">
                          • {project.supporterCount} total supporters all-time
                        </span>
                      )}
                    </p>
                  </div>
                  
                  {detailLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-20 bg-ink-50 rounded-xl animate-pulse"></div>
                      ))}
                    </div>
                  ) : supporters.length === 0 ? (
                    <div className="text-center py-16 bg-canvas-subtle rounded-3xl border border-dashed border-ink-300/20">
                      <div className="w-16 h-16 bg-ink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-ink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </div>
                      <p className="text-ink-600 font-medium">No active supporters</p>
                      <p className="text-sm text-ink-400 mt-1">
                        {project.supporterCount > 0 
                          ? `This project had ${project.supporterCount} supporter${project.supporterCount > 1 ? 's' : ''} previously`
                          : 'Be the first to support this project!'}
                      </p>
                    </div>
                  ) : (
                    <div className="border border-ink-200 rounded-2xl overflow-hidden bg-white">
                      {supporters.map((supporter, index) => (
                        <div key={supporter.address} className={`flex items-center justify-between p-4 ${
                          index !== supporters.length - 1 ? 'border-b border-ink-100' : ''
                        }`}>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-ink-50 flex items-center justify-center text-xs font-mono text-ink-600 border border-ink-100">
                              {supporter.address.slice(0, 2)}
                            </div>
                            <div>
                              <p className="font-bold text-ink-900 font-mono text-sm tracking-tight">{formatAddress(supporter.address)}</p>
                              <p className="text-xs font-medium text-ink-400 mt-0.5">{formatTimestamp(supporter.lastUpdated)}</p>
                            </div>
                          </div>
                          <span className="font-bold text-ink-900 bg-ink-50 px-2.5 py-1 rounded-md text-sm tabular-nums border border-ink-100">
                            ${formatBalance(BigInt(supporter.amount))}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column (Sidebar) */}
          <div className="lg:col-span-4 space-y-8">
            <div className="sticky top-24 space-y-8">
              
              {/* Manager Panel (Only for Owner) */}
              {isOwner && projectCapId && (
                <ManagerPanel
                  projectId={project.id}
                  projectCapId={projectCapId}
                  coinType={project.coinType}
                  onUpdateSuccess={() => {
                    refetchDetail();
                    setActiveTab('updates');
                  }}
                />
              )}

              {/* Support Card - Hide for Owner */}
              {!isOwner && (
                <SupportPanel projectId={project.id} coinType={project.coinType || ''} minAmount={minDonationAmount} />
              )}

              {/* Stats Card */}
              <div className="bg-canvas-subtle rounded-3xl p-8 border border-ink-300/10">
                <h3 className="text-xl font-serif text-ink-900 mb-6">Overview</h3>
                <div className="space-y-6">
                  <div className="flex justify-between items-center pb-4 border-b border-ink-300/10">
                    <span className="text-sm text-ink-500 font-medium">Status</span>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                      project.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {project.isActive !== false ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-4 border-b border-ink-300/10">
                    <span className="text-sm text-ink-500 font-medium">Total Supported Amount</span>
                    <span className="font-bold text-lg text-ink-900 tabular-nums">
                      ${formatBalance(project.totalSupportAmount || project.raisedAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-4 border-b border-ink-300/10">
                    <span className="text-sm text-ink-500 font-medium">Total Supporters</span>
                    <span className="font-bold text-lg text-ink-900 tabular-nums">{project.supporterCount}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </Container>
    </div>
  );
};
