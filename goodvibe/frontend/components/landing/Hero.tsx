'use client';

import React, { useState, useEffect } from 'react';
import { Container } from '../layout/Container';
import { Button } from '../ui/Button';
import Link from 'next/link';

export const Hero: React.FC = () => {
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollIndicator(window.scrollY <= 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-canvas-default flex items-center relative">
      <Container>
        <div className="pt-20 sm:pt-28 pb-8">
          <div className="mx-auto max-w-2xl text-center mb-8 sm:mb-16">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-medium tracking-tight text-ink-900 mb-4 sm:mb-6">
              Make Giving Painless
            </h1>
            <p className="text-base sm:text-xl leading-7 sm:leading-8 text-ink-700 font-sans mb-8 sm:mb-10 max-w-xl sm:max-w-2xl mx-auto">
              Support projects you believe in with the yield from your idle funds.
              <br className="hidden sm:block" />
              Keep your principal safe &mdash; withdraw anytime.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-x-6">
              <Link href="/?view=projects">
                <Button size="lg" className="rounded-full px-8 w-full sm:w-auto">
                  Explore Projects
                </Button>
              </Link>
              <Link href="/?view=dashboard">
                <Button variant="outline" size="lg" className="rounded-full px-8 w-full sm:w-auto border-ink-900 text-ink-900 hover:bg-ink-900 hover:text-white transition-colors">
                  Go to Dashboard
                </Button>
              </Link>
            </div>
          </div>

          {/* StableLayer Section */}
          <div className="bg-canvas-slate rounded-3xl p-6 sm:p-8 md:p-12 mb-8 sm:mb-16">
            {/* Desktop layout */}
            <div className="hidden sm:grid md:grid-cols-12 gap-8 md:gap-12 items-start">
              <div className="md:col-span-4">
                <h2 className="text-3xl sm:text-4xl font-serif text-ink-900 mb-4">Powered by StableLayer</h2>
                <p className="text-ink-700 text-base sm:text-lg">
                  GoodVibe leverages StableLayer to let projects issue their own branded stablecoins that generate sustainable yield &mdash; your assets stay in your control.
                </p>
              </div>
              <div className="md:col-span-8 grid sm:grid-cols-2 gap-4 sm:gap-6">
                <a href="https://stablelayer.site/" target="_blank" rel="noopener noreferrer" className="bg-surface-slate/50 p-6 sm:p-8 rounded-xl hover:bg-surface-slate transition-colors cursor-pointer group">
                  <div className="text-sm font-medium text-ink-500 mb-2 uppercase tracking-wide">Website</div>
                  <h3 className="text-xl sm:text-2xl font-serif text-ink-900 mb-8 sm:mb-12 group-hover:text-ink-700">StableLayer</h3>
                  <div className="flex justify-end">
                    <span className="text-2xl group-hover:translate-x-1 transition-transform">&rarr;</span>
                  </div>
                </a>
                <a href="https://docs.stablelayer.site/" target="_blank" rel="noopener noreferrer" className="bg-surface-slate/50 p-6 sm:p-8 rounded-xl hover:bg-surface-slate transition-colors cursor-pointer group">
                  <div className="text-sm font-medium text-ink-500 mb-2 uppercase tracking-wide">Documentation</div>
                  <h3 className="text-xl sm:text-2xl font-serif text-ink-900 mb-8 sm:mb-12 group-hover:text-ink-700">Litepaper</h3>
                  <div className="flex justify-end">
                    <span className="text-2xl group-hover:translate-x-1 transition-transform">&rarr;</span>
                  </div>
                </a>
              </div>
            </div>

            {/* Mobile layout — compact horizontal */}
            <div className="sm:hidden">
              <h2 className="text-lg font-serif text-ink-900 mb-3">Powered by StableLayer</h2>
              <div className="grid grid-cols-2 gap-3">
                <a href="https://stablelayer.site/" target="_blank" rel="noopener noreferrer" className="bg-surface-slate/50 px-4 py-3 rounded-xl">
                  <div className="text-[10px] text-ink-500 uppercase tracking-wide">Website</div>
                  <div className="text-sm font-serif text-ink-900 mt-0.5">StableLayer &rarr;</div>
                </a>
                <a href="https://docs.stablelayer.site/" target="_blank" rel="noopener noreferrer" className="bg-surface-slate/50 px-4 py-3 rounded-xl">
                  <div className="text-[10px] text-ink-500 uppercase tracking-wide">Docs</div>
                  <div className="text-sm font-serif text-ink-900 mt-0.5">Litepaper &rarr;</div>
                </a>
              </div>
            </div>
          </div>

          {/* Scroll Indicator */}
          {showScrollIndicator && (
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce transition-opacity duration-300">
              <svg className="w-5 h-5 text-ink-300 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          )}
        </div>
      </Container>
    </div>
  );
};
