'use client';

import React from 'react';
import Link from 'next/link';
import { useSupportRecord } from '@/hooks/useSupportRecord';
import { useCompatClient } from '@/hooks/useCompatClient';
import { useQuery } from '@tanstack/react-query';
import { formatBalance } from '@/utils/formatters';
import { structFields } from '@/lib/sui/queries';

function bytesToString(bytes: unknown): string {
  if (bytes == null) return '';
  if (typeof bytes === 'string') {
    try {
      const decoded = atob(bytes);
      return new TextDecoder().decode(Uint8Array.from(decoded, (c) => c.charCodeAt(0)));
    } catch {
      return bytes;
    }
  }
  if (Array.isArray(bytes) || bytes instanceof Uint8Array) {
    return new TextDecoder().decode(new Uint8Array(bytes as Iterable<number>));
  }
  return String(bytes);
}

interface SupportedProjectsListProps {
  className?: string;
}

export const SupportedProjectsList: React.FC<SupportedProjectsListProps> = ({ className = '' }) => {
  const client = useCompatClient();
  const { supportedProjects, isLoading: isLoadingProjects } = useSupportRecord();

  const { data: projectDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['supportedProjectsDetails', supportedProjects.map(p => p.projectId)],
    queryFn: async () => {
      if (supportedProjects.length === 0) return [];
      const details = await Promise.all(
        supportedProjects.map(async (project) => {
          try {
            const obj = await client.getObject({ id: project.projectId, options: { showContent: true } });
            const content = obj.data?.content as any;
            const fields = content?.fields ?? content;
            if (!fields) throw new Error('no fields');
            const metadata = structFields(fields.metadata);
            const title = bytesToString(metadata.title);
            if (title) return { projectId: project.projectId, projectName: title, supportAmount: project.amount };
          } catch { /* fall through */ }
          return { projectId: project.projectId, projectName: 'Unknown Project', supportAmount: project.amount };
        })
      );
      return details;
    },
    enabled: supportedProjects.length > 0,
  });

  const isLoading = isLoadingProjects || isLoadingDetails;
  const totalSupport = projectDetails?.reduce((sum, p) => sum + p.supportAmount, BigInt(0)) || BigInt(0);
  const hasProjects = projectDetails && projectDetails.length > 0;

  return (
    <div className={`rounded-3xl p-8 flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-serif font-medium text-ink-900 leading-tight">
            Your Impact
          </h2>
          <p className="text-sm text-ink-500 mt-1">
            Supporting <span className="font-bold text-ink-900">{supportedProjects.length}</span> project{supportedProjects.length !== 1 ? 's' : ''}
          </p>
        </div>
        {hasProjects && (
          <div className="text-right">
            <p className="text-xs text-ink-400 uppercase tracking-widest">Total</p>
            <p className="text-2xl font-serif font-bold text-ink-900">${formatBalance(totalSupport)}</p>
          </div>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 bg-white/30 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : !hasProjects ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
          <p className="text-ink-400 mb-3 lg:text-lg">No supported projects yet.</p>
          <Link
            href="/?view=projects"
            className="font-serif font-medium text-ink-900 hover:text-accent-primary transition-colors lg:text-lg"
          >
            Explore Projects &rarr;
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {projectDetails.map((project) => (
            <Link
              key={project.projectId}
              href={`/project/${project.projectId}`}
              className="group flex items-center gap-4 bg-white/40 hover:bg-white/80 rounded-xl px-5 py-4 border border-transparent hover:border-white hover:shadow-sm transition-all duration-200"
            >
              <div className="flex-1 min-w-0">
                <h3 className="font-serif font-medium text-ink-900 truncate group-hover:text-accent-primary transition-colors">
                  {project.projectName}
                </h3>
                <p className="text-xs text-ink-400 mt-0.5">
                  ${formatBalance(project.supportAmount)} USDC
                </p>
              </div>
              <svg className="w-4 h-4 text-ink-300 group-hover:text-ink-900 shrink-0 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
