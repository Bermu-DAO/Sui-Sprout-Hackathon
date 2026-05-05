'use client';

import dynamic from 'next/dynamic';
import { Toaster } from 'react-hot-toast';

const Providers = dynamic(() => import('./providers').then((m) => ({ default: m.Providers })), {
  ssr: false,
  loading: () => null,
});
const Header = dynamic(
  () => import('@/components/layout/Header').then((m) => ({ default: m.Header })),
  { ssr: false, loading: () => <header className="bg-canvas-default/80 backdrop-blur-md border-b border-ink-300/20 fixed top-0 w-full z-40 h-20" /> }
);

export function ClientAppShell({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <div suppressHydrationWarning>
        <Header />
      </div>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#FFFFFF',
            color: '#191919',
            borderRadius: '16px',
            padding: '14px 18px',
            fontSize: '14px',
            fontFamily: 'Georgia, Cambria, "Times New Roman", Times, serif',
            border: '1px solid #E5E5E5',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
            maxWidth: '380px',
          },
          success: {
            iconTheme: { primary: '#191919', secondary: '#C8D8D5' },
            style: { border: '1px solid #C8D8D5' },
            duration: 5000,
          },
          error: {
            iconTheme: { primary: '#DC2626', secondary: '#FEF2F2' },
            style: {
              background: '#FEF2F2',
              border: '1px solid #FCA5A5',
              color: '#991B1B',
            },
            duration: 5000,
          },
          loading: {
            iconTheme: { primary: '#191919', secondary: '#F3F1F0' },
            style: { border: '1px solid #E5E5E5' },
          },
        }}
      />
      {children}
    </Providers>
  );
}
