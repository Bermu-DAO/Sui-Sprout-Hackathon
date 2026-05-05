'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useCurrentAccount } from '@mysten/dapp-kit-react';
import { useCompatClient } from '@/hooks/useCompatClient';
import { useQuery } from '@tanstack/react-query';
import { formatBalance } from '@/utils/formatters';
import { PACKAGE_ID } from '@/config/sui';
import { getProjectById, getProjectUpdates, getProjectSupportersFromEvents } from '@/lib/sui/queries';
import toast from 'react-hot-toast';

interface MyProjectsManagerProps {
  userAddress: string;
  className?: string;
}

interface OwnedProjectData {
  projectId: string;
  projectCapId: string;
  title: string;
  description: string;
  category: string;
  imageUrl: string;
  balance: bigint;
  totalReceived: bigint;
  totalSupportAmount: bigint;
  supporterCount: number;
  updatesCount: number;
  isActive: boolean;
  createdAt: bigint;
}

/**
 * 我的項目管理器 - 垂直版
 * 顯示用戶創建的所有項目及其統計數據，適合放在側邊欄
 */
const COLLAPSED_COUNT = 3;

function ProjectsList({
  projects,
  isLoading,
  exportingProjectId,
  onExport,
}: {
  projects: OwnedProjectData[];
  isLoading: boolean;
  exportingProjectId: string | null;
  onExport: (projectId: string, title: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const showAll = expanded || projects.length <= COLLAPSED_COUNT;
  const visible = showAll ? projects : projects.slice(0, COLLAPSED_COUNT);
  const hiddenCount = projects.length - COLLAPSED_COUNT;

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-16 bg-white/20 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-white/40 rounded-xl border border-white/50 text-center">
        <p className="text-ink-500 text-sm">No projects yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {visible.map((project) => (
        <Link
          key={project.projectId}
          href={`/project/${project.projectId}/manage`}
          className="group flex items-center gap-3 bg-white/40 hover:bg-white/80 rounded-xl px-4 py-3 border border-transparent hover:border-white hover:shadow-sm transition-all duration-200"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-serif font-medium text-ink-900 text-sm truncate group-hover:text-accent-primary transition-colors">
                {project.title}
              </h3>
              <span className={`shrink-0 inline-block w-1.5 h-1.5 rounded-full ${project.isActive ? 'bg-green-500' : 'bg-ink-300'}`} />
            </div>
            <p className="text-[10px] text-ink-400 mt-0.5">
              {project.supporterCount} supporters &middot; ${formatBalance(project.totalSupportAmount)}
            </p>
          </div>
          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onExport(project.projectId, project.title); }}
            disabled={exportingProjectId === project.projectId || project.supporterCount === 0}
            className="shrink-0 w-6 h-6 flex items-center justify-center text-ink-300 hover:text-ink-900 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="Export supporters"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
        </Link>
      ))}

      {!showAll && hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="w-full text-center py-2 text-xs font-serif text-ink-400 hover:text-ink-900 transition-colors"
        >
          Show {hiddenCount} more &darr;
        </button>
      )}
      {expanded && projects.length > COLLAPSED_COUNT && (
        <button
          onClick={() => setExpanded(false)}
          className="w-full text-center py-2 text-xs font-serif text-ink-400 hover:text-ink-900 transition-colors"
        >
          Show less &uarr;
        </button>
      )}
    </div>
  );
}

export const MyProjectsManager: React.FC<MyProjectsManagerProps> = ({ userAddress, className = '' }) => {
  const client = useCompatClient();
  const account = useCurrentAccount();
  const [exportingProjectId, setExportingProjectId] = useState<string | null>(null);

  // 導出 Active Supporters
  const handleExportSupporters = async (projectId: string, projectTitle: string) => {
    setExportingProjectId(projectId);
    try {
      toast.loading('Fetching supporters data...');
      
      // 獲取項目的 active supporters
      const supporters = await getProjectSupportersFromEvents(client, PACKAGE_ID, projectId);
      
      if (supporters.length === 0) {
        toast.dismiss();
        toast.error('No active supporters found for this project');
        return;
      }

      // 格式化為 CSV
      const csvHeaders = 'Address,Support Amount (USDC),Last Updated\n';
      const csvRows = supporters.map(supporter => {
        const amount = (Number(supporter.amount) / 1_000_000).toFixed(2); // 轉換為 USDC
        const date = new Date(supporter.lastUpdated).toISOString();
        return `${supporter.address},${amount},${date}`;
      }).join('\n');
      
      const csvContent = csvHeaders + csvRows;
      
      // 創建並下載文件
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      // 使用項目標題和日期生成文件名
      const fileName = `${projectTitle.replace(/[^a-z0-9]/gi, '_')}_supporters_${new Date().toISOString().split('T')[0]}.csv`;
      
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.dismiss();
      toast.success(`Exported ${supporters.length} active supporters`);
    } catch (error: any) {
      toast.dismiss();
      toast.error(`Failed to export: ${error.message}`);
    } finally {
      setExportingProjectId(null);
    }
  };

  // 查詢用戶擁有的 ProjectCap 並獲取項目數據
  const { data: myProjects = [], isLoading } = useQuery({
    queryKey: ['ownedProjects', userAddress],
    queryFn: async () => {
      // 1. 獲取用戶擁有的所有 ProjectCap
      const capsResponse = await client.getOwnedObjects({
        owner: userAddress,
        filter: { StructType: `${PACKAGE_ID}::project::ProjectCap` },
        options: { showContent: true },
      });
      if (capsResponse.data.length === 0) {
        return [];
      }

      // 2. 並行獲取每個項目的詳細信息
      const projects = await Promise.all(
        capsResponse.data.map(async (capObj: { data?: { objectId?: string; content?: unknown } }) => {
          try {
            const capFields = (capObj.data?.content as any)?.fields;
            if (!capFields) return null;

            const projectId = capFields.project_id;
            const projectCapId = capObj.data!.objectId;

            // 並行獲取項目數據和 updates
            const [projectData, updates] = await Promise.all([
              getProjectById(client, projectId, PACKAGE_ID),
              getProjectUpdates(client, projectId, PACKAGE_ID),
            ]);

            if (!projectData) return null;

            // Skip legacy projects (old btcUSDC coin type)
            const LEGACY_COIN = '0x6d9fc33611f4881a3f5c0cd4899d95a862236ce52b3a38fef039077b0c5b5834::btc_usdc::BtcUSDC';
            if (!projectData.coinType || projectData.coinType === LEGACY_COIN) return null;

            return {
              projectId,
              projectCapId,
              title: projectData.title,
              description: projectData.description,
              category: projectData.category,
              imageUrl: projectData.imageUrl,
              balance: projectData.balance || BigInt(0),
              totalReceived: projectData.raisedAmount,
              totalSupportAmount: projectData.totalSupportAmount || BigInt(0),
              supporterCount: projectData.supporterCount,
              updatesCount: updates.length,
              isActive: projectData.isActive ?? true,
              createdAt: projectData.createdAt || BigInt(0),
            } as OwnedProjectData;
          } catch {
            return null;
          }
        })
      );

      const validProjects = projects.filter((p: OwnedProjectData | null): p is OwnedProjectData => p !== null);
      validProjects.sort((a: OwnedProjectData, b: OwnedProjectData) => Number(b.createdAt) - Number(a.createdAt));
      return validProjects;
    },
    enabled: !!userAddress && !!PACKAGE_ID,
    staleTime: 30000,
  });

  // Calculate stats
  const stats = React.useMemo(() => {
    return {
      totalProjects: myProjects.length,
      totalSupportReceived: myProjects.reduce((sum: bigint, p: OwnedProjectData) => sum + p.totalSupportAmount, BigInt(0)),
      totalSupporters: myProjects.reduce((sum: number, p: OwnedProjectData) => sum + p.supporterCount, 0),
    };
  }, [myProjects]);

  return (
    <div className={`rounded-3xl p-8 ${className}`}>
      {/* Header Section */}
      <div className="mb-6">
        <h2 className="text-2xl font-serif font-medium text-ink-900 mb-2 leading-tight">
          My Projects
        </h2>
        <div className="flex gap-4 text-xs font-bold text-ink-500 uppercase tracking-widest">
           <span>{stats.totalProjects} Created</span>
           <span>•</span>
           <span>${formatBalance(stats.totalSupportReceived)} Raised</span>
        </div>
      </div>

      {/* Projects List */}
      <ProjectsList
        projects={myProjects}
        isLoading={isLoading}
        exportingProjectId={exportingProjectId}
        onExport={handleExportSupporters}
      />
    </div>
  );
};
