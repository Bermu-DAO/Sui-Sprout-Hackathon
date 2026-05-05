import React from 'react';
import toast from 'react-hot-toast';
import { SUI_NETWORK } from '@/config/sui';

function suiscanUrl(digest: string): string {
  return `https://suiscan.xyz/${SUI_NETWORK}/tx/${digest}`;
}

function normalizeError(msg: string): string {
  if (/reject|rejected|cancelled|canceled|denied/i.test(msg)) return 'Transaction cancelled by user.';
  if (/vec_map/.test(msg) && /get_idx/.test(msg)) return 'No yield available yet.';
  if (/origin not allowed/i.test(msg)) return 'Wallet blocked the request.';
  if (/insufficient/i.test(msg)) return 'Insufficient balance.';
  return msg;
}

export function txLoading(message = 'Awaiting approval...') {
  return toast.loading(message, { id: 'tx-pending' });
}

export function txSuccess(digest: string, message = 'Transaction successful') {
  toast.dismiss('tx-pending');
  toast(
    () => (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontFamily: 'Georgia, serif', fontWeight: 600, color: '#191919', fontSize: 14 }}>
          {message}
        </span>
        <a
          href={suiscanUrl(digest)}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontFamily: 'monospace', fontSize: 11, color: '#D97757', textDecoration: 'none' }}
        >
          {digest.slice(0, 20)}...
        </a>
      </div>
    ),
    {
      duration: 6000,
      style: {
        background: '#FFFFFF',
        color: '#191919',
        border: '1px solid #C8D8D5',
        borderRadius: '16px',
        padding: '14px 18px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      },
      icon: '✓',
      iconTheme: { primary: '#191919', secondary: '#C8D8D5' },
    },
  );
}

export function txError(rawMessage: string) {
  toast.dismiss('tx-pending');
  const message = normalizeError(rawMessage);
  toast.error(message, {
    duration: 5000,
    style: {
      background: '#FEF2F2',
      color: '#991B1B',
      border: '1px solid #FCA5A5',
      borderRadius: '16px',
      padding: '14px 18px',
      fontFamily: 'Georgia, serif',
      fontSize: '14px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    },
    iconTheme: { primary: '#DC2626', secondary: '#FEF2F2' },
  });
}

export async function withTxToast(
  fn: () => Promise<{ digest: string | null; failed?: boolean }>,
  opts: { loading?: string; success?: string } = {},
): Promise<string | null> {
  txLoading(opts.loading);
  try {
    const { digest, failed } = await fn();
    if (failed || !digest) {
      txError('Transaction failed on-chain.');
      return null;
    }
    txSuccess(digest, opts.success);
    return digest;
  } catch (e) {
    txError(e instanceof Error ? e.message : String(e));
    return null;
  }
}
