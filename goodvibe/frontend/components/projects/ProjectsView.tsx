'use client';

import React, { useState, useMemo } from 'react';
import { Project } from '@/types/project';
import Link from 'next/link';
import { Card } from '../ui/Card';
import { formatBalance } from '@/utils/formatters';

interface ProjectsViewProps {
  projects: Project[];
  isLoading: boolean;
  error: Error | null;
  onRefetch: () => void;
  isRefetching: boolean;
}

const PROJECTS_PER_PAGE = 9;

export const ProjectsView: React.FC<ProjectsViewProps> = ({ 
  projects, 
  isLoading, 
  error, 
  onRefetch,
  isRefetching 
}) => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Get available categories from projects
  const availableCategories = useMemo(() => {
    if (!projects || projects.length === 0) return ['All'];
    
    const categories = new Set(projects.map(p => p.category));
    return ['All', ...Array.from(categories).sort()];
  }, [projects]);

  // Filter projects
  const filteredProjects = useMemo(() => {
    if (!projects) return [];
    
    return projects.filter(project => {
      const matchesCategory = selectedCategory === 'All' || project.category === selectedCategory;
      const matchesSearch = searchQuery === '' || 
        project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesCategory && matchesSearch;
    });
  }, [projects, selectedCategory, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredProjects.length / PROJECTS_PER_PAGE);
  const paginatedProjects = useMemo(() => {
    const startIndex = (currentPage - 1) * PROJECTS_PER_PAGE;
    return filteredProjects.slice(startIndex, startIndex + PROJECTS_PER_PAGE);
  }, [filteredProjects, currentPage]);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchQuery]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!projects) return { total: 0, totalRaised: BigInt(0), totalSupporters: 0 };
    
    return {
      total: projects.length,
      totalRaised: projects.reduce((sum, p) => sum + (p.totalSupportAmount || p.raisedAmount), BigInt(0)),
      totalSupporters: projects.reduce((sum, p) => sum + p.supporterCount, 0)
    };
  }, [projects]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-ink-300 border-t-ink-900 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-ink-500">Loading projects...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
        <p className="text-red-700 font-medium mb-2">Failed to load projects</p>
        <p className="text-red-600 text-sm">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Statistics Section */}
      <div className="bg-canvas-rose rounded-3xl p-6 md:p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div>
            <div className="text-3xl font-serif text-ink-900 mb-1">{stats.total}</div>
            <div className="text-xs text-ink-500 uppercase tracking-wide">Active Projects</div>
          </div>
          <div>
            <div className="text-3xl font-serif text-ink-900 mb-1">
              ${formatBalance(stats.totalRaised)}
            </div>
            <div className="text-xs text-ink-500 uppercase tracking-wide">Total Raised (USDC)</div>
          </div>
          <div>
            <div className="text-3xl font-serif text-ink-900 mb-1">{stats.totalSupporters}</div>
            <div className="text-xs text-ink-500 uppercase tracking-wide">Total Supporters</div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="space-y-4">
        {/* Search Bar - Underline Style */}
        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-2 py-2.5 bg-transparent border-0 border-b border-ink-300/30 text-ink-900 placeholder-ink-400 focus:outline-none focus:border-ink-900 transition-colors font-sans text-base"
            />
            <svg className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-ink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap justify-center gap-2">
          {availableCategories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                selectedCategory === category
                  ? 'bg-ink-900 text-white shadow-sm'
                  : 'bg-transparent text-ink-700 border border-ink-300/30 hover:border-ink-900 hover:bg-canvas-subtle'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Results Count & Refresh */}
        <div className="flex justify-between items-center pt-2 border-t border-ink-300/20">
          <p className="text-xs text-ink-500">
            Showing <span className="font-medium text-ink-900">{paginatedProjects.length}</span> of <span className="font-medium text-ink-900">{filteredProjects.length}</span> project{filteredProjects.length !== 1 ? 's' : ''}
          </p>
          <button
            onClick={onRefetch}
            disabled={isRefetching}
            className="text-xs text-ink-500 hover:text-ink-900 transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <svg className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="text-center py-24 bg-surface rounded-xl border border-dashed border-ink-300/40">
          <svg className="w-16 h-16 text-ink-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-xl font-serif text-ink-900 mb-2">No projects found</h3>
          <p className="text-ink-500">Try adjusting your search or filter criteria</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {paginatedProjects.map((project: Project) => (
              <Link key={project.id} href={`/project/${project.id}`}>
                <Card className="bg-transparent border-0 shadow-none hover:shadow-none p-0 group h-full flex flex-col">
                  {project.imageUrl && (
                    <div className="overflow-hidden rounded-xl mb-4 bg-canvas-subtle relative pt-[60%] border border-ink-300/20">
                      <img 
                        src={project.imageUrl} 
                        alt={project.title} 
                        className="absolute inset-0 w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500" 
                      />
                    </div>
                  )}
                  <div className="flex flex-col flex-grow">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-xs font-medium text-ink-700 uppercase tracking-wide bg-canvas-subtle px-3 py-1 rounded-full border border-ink-300/30">
                        {project.category}
                      </span>
                      <span className="text-xs text-ink-400 font-mono">
                        {project.createdAt 
                          ? new Date(Number(project.createdAt)).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric' 
                            })
                          : 'Recently'
                        }
                      </span>
                    </div>
                    <h4 className="font-serif text-xl text-ink-900 group-hover:text-accent-primary transition-colors mb-2 leading-tight">
                      {project.title}
                    </h4>
                    <p className="text-sm text-ink-500 line-clamp-3 font-sans leading-relaxed mb-4 flex-grow">
                      {project.description}
                    </p>
                    
                    {/* Progress Info */}
                    <div className="pt-4 border-t border-ink-300/20 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-ink-500">Raised</span>
                        <span className="font-medium text-ink-900">
                          ${formatBalance(project.totalSupportAmount || project.raisedAmount)} USDC
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-ink-500">Supporters</span>
                        <span className="font-medium text-ink-900">{project.supporterCount}</span>
                      </div>
                      <div className="pt-2">
                        <span className="text-sm font-medium text-ink-900 group-hover:text-accent-primary flex items-center transition-colors">
                          View project
                          <svg className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 pt-6">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-lg text-sm font-medium text-ink-700 border border-ink-300/30 hover:border-ink-900 hover:bg-canvas-subtle transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-ink-300/30 disabled:hover:bg-transparent"
              >
                Previous
              </button>
              
              <div className="flex gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                      currentPage === page
                        ? 'bg-ink-900 text-white'
                        : 'text-ink-700 border border-ink-300/30 hover:border-ink-900 hover:bg-canvas-subtle'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-lg text-sm font-medium text-ink-700 border border-ink-300/30 hover:border-ink-900 hover:bg-canvas-subtle transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-ink-300/30 disabled:hover:bg-transparent"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
