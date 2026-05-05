"use client";

import { useProject } from "@/hooks/useProjects";
import { ProjectDetail } from "@/components/project/ProjectDetail";
import Link from "next/link";
import { useCurrentAccount } from "@mysten/dapp-kit-react";
import { useParams } from "next/navigation";
import { MIN_SUPPORT_AMOUNT } from "@/config/sui";

export default function ProjectPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { data: project, isLoading } = useProject(projectId);
  const account = useCurrentAccount();

  if (isLoading) {
    return (
      <div className="bg-canvas-default min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-ink-300 border-t-ink-900 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-ink-500">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="bg-canvas-default min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-serif text-ink-900 mb-2">Project not found</h2>
          <p className="text-ink-500 mb-6">The project you're looking for doesn't exist.</p>
          <Link href="/?view=projects" className="text-accent-primary hover:underline">
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  const isCreator = account?.address === project.creator;

  return (
    <main className="bg-canvas-default min-h-screen">
      {/* Floating Back Button */}
      <Link
        href="/?view=projects"
        className="fixed top-24 left-4 sm:left-6 z-50 group"
      >
        <div className="flex items-center gap-0 group-hover:gap-3 bg-surface/90 backdrop-blur-md rounded-full p-3 group-hover:pl-3 group-hover:pr-5 shadow-lg border border-ink-300/20 hover:shadow-xl transition-all duration-300">
          <div className="w-8 h-8 rounded-full bg-canvas-subtle flex items-center justify-center group-hover:bg-ink-900 transition-colors duration-300">
            <svg className="w-4 h-4 text-ink-700 group-hover:text-white transform group-hover:-translate-x-0.5 transition-all duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </div>
          <span className="text-sm font-medium text-ink-900 w-0 overflow-hidden group-hover:w-auto whitespace-nowrap transition-all duration-300">
            Back
          </span>
        </div>
      </Link>
      
      <ProjectDetail 
        project={project}
        isCreator={isCreator}
        minDonationAmount={MIN_SUPPORT_AMOUNT}
      />
      
      <div className="py-12"></div>
    </main>
  );
}
