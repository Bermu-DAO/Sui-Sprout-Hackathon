'use client';

import React from 'react';
import { ConnectButton } from '@mysten/dapp-kit-react';
import Link from 'next/link';
import { useSearchParams, usePathname } from 'next/navigation';

const navLinkClass = 'text-sm font-medium text-ink-500 hover:text-ink-900 transition-colors';

type NavLinks = { dashboard?: boolean; projects?: boolean };

function getHeaderNavLinks(pathname: string, view: string | null): NavLinks {
  const isRoot = pathname === '/';
  const isProjectDetail = pathname.startsWith('/project/');

  if (isRoot && view === null) return {};
  if (isRoot && view === 'dashboard') return { projects: true };
  if (isRoot && view === 'projects') return { dashboard: true };
  if (isProjectDetail) return { dashboard: true, projects: true };

  return {};
}

export const Header: React.FC = () => {
  const pathname = usePathname();
  const view = useSearchParams().get('view');
  const navLinks = getHeaderNavLinks(pathname, view);

  return (
    <header className="bg-canvas-default/80 backdrop-blur-md border-b border-ink-300/20 fixed top-0 w-full z-40 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center group">
              <span className="text-2xl font-serif font-medium text-ink-900 group-hover:text-ink-700 transition-colors">
                GoodVibe
              </span>
            </Link>
            <nav className="hidden md:flex space-x-6">
              {navLinks.dashboard && (
                <Link href="/?view=dashboard" className={navLinkClass}>
                  Dashboard
                </Link>
              )}
              {navLinks.projects && (
                <Link href="/?view=projects" className={navLinkClass}>
                  Projects
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center">
            <ConnectButton className="goodvibe-connect" />
          </div>
        </div>
      </div>
    </header>
  );
};
