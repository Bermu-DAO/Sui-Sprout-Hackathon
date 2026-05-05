"use client";

import { useCurrentAccount } from "@mysten/dapp-kit-react";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { Container } from "@/components/layout/Container";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { MyProjectsManager } from "@/components/dashboard/MyProjectsManager";
import { ProjectsView } from "@/components/projects/ProjectsView";
import { EmptyStateCard } from "@/components/dashboard/EmptyStateCard";
import dynamic from "next/dynamic";
const CreateProjectModal = dynamic(() => import("@/components/projects/CreateProjectModal"), { ssr: false });
import { useProjects } from "@/hooks/useProjects";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import React, { Suspense, useState, useRef } from "react";
import { useCreatorCap } from "@/hooks/useCreatorCap";
import { useDashboardData } from "@/hooks/useDashboardData";

function ProjectsPage({ projects, isLoading, error, onRefetch, isRefetching }: {
  projects: import("@/types/project").Project[];
  isLoading: boolean;
  error: Error | null;
  onRefetch: () => void;
  isRefetching: boolean;
}) {
  const { hasCreatorCap, canCreateMore, isLoading: capLoading } = useCreatorCap();
  const account = useCurrentAccount();
  const [modalOpen, setModalOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  const buttonDisabled = !account || capLoading || !hasCreatorCap || !canCreateMore;
  const tooltipText = !account
    ? 'Connect wallet first'
    : capLoading
      ? 'Checking access...'
      : !hasCreatorCap
        ? 'Creator access is not yet open to the public.'
        : !canCreateMore
          ? 'Project limit reached — contact admin'
          : '';

  return (
    <main className="bg-canvas-default min-h-screen pt-24 pb-12">
      <Container>
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center text-sm font-medium text-ink-500 hover:text-ink-900 transition-colors group">
            <svg className="w-4 h-4 mr-1.5 transform group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
        </div>

        <div className="mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <h1 className="text-4xl font-serif text-ink-900 mb-2">Explore Projects</h1>
            <p className="text-lg text-ink-700 max-w-2xl sm:whitespace-nowrap">
              Discover initiatives making a real impact through sustainable yield donation.
            </p>
          </div>

          {/* + New Project button + anchored panel */}
          <div className="relative group shrink-0">
            <button
              ref={btnRef}
              onClick={() => setModalOpen(!modalOpen)}
              disabled={buttonDisabled}
              className="inline-flex items-center gap-2 bg-ink-900 text-white rounded-full pl-5 pr-6 py-3 font-serif font-medium text-sm hover:bg-ink-700 transition-all shadow-sm hover:shadow active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-ink-900 disabled:hover:shadow-sm disabled:active:scale-100"
            >
              <svg className={`w-4 h-4 transition-transform duration-200 ${modalOpen ? 'rotate-45' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              {modalOpen ? 'Close' : 'New Project'}
            </button>
            {/* Tooltip on disabled hover */}
            {buttonDisabled && tooltipText && (
              <div className="absolute right-0 top-full mt-2 w-64 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                <div className="bg-ink-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg border border-white/10">
                  {tooltipText}
                </div>
              </div>
            )}
            {/* Inline expanding panel */}
            <CreateProjectModal isOpen={modalOpen} onClose={() => setModalOpen(false)} triggerRef={btnRef} />
          </div>
        </div>

        <ProjectsView
          projects={projects}
          isLoading={isLoading}
          error={error}
          onRefetch={onRefetch}
          isRefetching={isRefetching}
        />
      </Container>
    </main>
  );
}

function HomeContent() {
  const account = useCurrentAccount();
  const searchParams = useSearchParams();
  const viewProjects = searchParams.get('view') === 'projects';
  const viewDashboard = searchParams.get('view') === 'dashboard';

  const { data: dashboardData } = useDashboardData();
  const { data: projects, refetch: refetchProjects, isRefetching, isLoading: isLoadingProjects, error: projectsError } = useProjects();


  // --- Projects View ---
  if (viewProjects) {
    return <ProjectsPage
      projects={projects || []}
      isLoading={isLoadingProjects}
      error={projectsError as Error | null}
      onRefetch={refetchProjects}
      isRefetching={isRefetching}
    />;
  }

  // --- Dashboard View (only when explicitly requested via ?view=dashboard) ---
  if (viewDashboard) {
    return (
      <main className="bg-canvas-default min-h-screen pt-24 pb-12">
        <Container>
          {/* Back to Home */}
          <div className="mb-8">
            <Link href="/" className="inline-flex items-center text-sm font-medium text-ink-500 hover:text-ink-900 transition-colors group">
              <svg className="w-4 h-4 mr-1.5 transform group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Home
            </Link>
          </div>

          {/* Page Header */}
          <div className="mb-12">
            <h1 className="text-4xl font-serif text-ink-900 mb-2">Dashboard</h1>
            <p className="text-lg text-ink-500">
              {account 
                ? `Welcome back, ${account.address.slice(0, 6)}...${account.address.slice(-4)}`
                : 'Connect your wallet to get started'
              }
            </p>
          </div>

          {/* Wallet Connection Prompt */}
          {!account && (
            <div className="mb-8">
              <EmptyStateCard
                icon={
                  <svg className="w-16 h-16 text-ink-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
                  </svg>
                }
                title="Connect Your Wallet"
                description="Please connect your Sui wallet to access the Dashboard and manage your donations."
                variant="minimal"
              />
            </div>
          )}

          {account ? (
            <div className="mt-8">
              <DashboardOverview />
            </div>
          ) : null}
        </Container>
      </main>
    );
  }

  // --- Landing Page (default, not connected, no view param) ---
  return (
    <main className="bg-canvas-default min-h-screen">
      <Hero />
      <Features />
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <main className="bg-canvas-default min-h-screen">
        <Hero />
        <Features />
      </main>
    }>
      <HomeContent />
    </Suspense>
  );
}
