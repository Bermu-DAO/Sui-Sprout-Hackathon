'use client';

import React from 'react';
import { SUI_NETWORK } from '@/config/sui';

function truncateDigest(digest: string): string {
  if (digest.length <= 16) return digest;
  return `${digest.slice(0, 10)}...${digest.slice(-6)}`;
}

interface TxResultProps {
  /** 'success' or 'error' */
  status: 'success' | 'error';
  /** Main heading */
  title: string;
  /** Optional subtitle / description */
  description?: string;
  /** Transaction digest(s) — shown as suiscan links */
  digests?: { label?: string; digest: string }[];
  /** Optional detail lines (key-value) */
  details?: { label: string; value: string }[];
  /** Error message (only for status='error') */
  errorMessage?: string;
  /** Primary action */
  primaryAction?: { label: string; onClick: () => void };
  /** Secondary / ghost action */
  secondaryAction?: { label: string; onClick: () => void };
}

export const TxResult: React.FC<TxResultProps> = ({
  status,
  title,
  description,
  digests,
  details,
  errorMessage,
  primaryAction,
  secondaryAction,
}) => {
  const network = SUI_NETWORK;
  const isSuccess = status === 'success';

  return (
    <div className="text-center">
      {/* Icon */}
      <div className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full ${
        isSuccess ? 'bg-canvas-sage' : 'bg-canvas-rose'
      }`}>
        {isSuccess ? (
          <svg className="w-7 h-7 text-ink-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ) : (
          <svg className="w-7 h-7 text-ink-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        )}
      </div>

      {/* Title */}
      <h3 className="text-xl font-serif font-bold text-ink-900 mb-1">{title}</h3>

      {/* Description */}
      {description && (
        <p className="text-sm text-ink-500 mb-5">{description}</p>
      )}

      {/* Error message */}
      {errorMessage && (
        <div className="bg-canvas-rose/60 rounded-xl px-4 py-3 mb-5 text-left">
          <p className="text-sm text-ink-700 break-words">{errorMessage}</p>
        </div>
      )}

      {/* Details card */}
      {((details && details.length > 0) || (digests && digests.length > 0)) && (
        <div className="bg-canvas-subtle rounded-xl mb-5 text-left overflow-hidden">
          {details?.map(({ label, value }) => (
            <div key={label} className={`px-4 py-3 border-b border-ink-300/10 last:border-0 ${
              details.length === 1 ? 'text-center' : 'flex justify-between items-start'
            }`}>
              {details.length === 1 ? (
                <>
                  <p className="text-xs text-ink-400 uppercase tracking-widest mb-1">{label}</p>
                  <p className="text-sm text-ink-900 font-medium break-all">{value}</p>
                </>
              ) : (
                <>
                  <span className="text-xs text-ink-400 uppercase tracking-widest shrink-0">{label}</span>
                  <span className="text-sm text-ink-900 font-medium text-right ml-4 break-all">{value}</span>
                </>
              )}
            </div>
          ))}
          {digests?.map(({ label, digest }) => (
            <div key={digest} className="flex justify-between items-center px-4 py-3 border-b border-ink-300/10 last:border-0">
              <span className="text-xs text-ink-400 uppercase tracking-widest shrink-0">{label || 'Tx'}</span>
              <a
                href={`https://suiscan.xyz/${network}/tx/${digest}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-mono text-accent-primary hover:underline"
              >
                {truncateDigest(digest)}
              </a>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {(primaryAction || secondaryAction) && (
        <div className="flex gap-3">
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="flex-1 py-2.5 rounded-xl text-ink-500 font-serif text-sm hover:text-ink-900 hover:bg-canvas-subtle transition-colors"
            >
              {secondaryAction.label}
            </button>
          )}
          {primaryAction && (
            <button
              onClick={primaryAction.onClick}
              className="flex-1 py-2.5 rounded-xl bg-ink-900 text-white font-serif font-medium text-sm hover:bg-ink-700 transition-all active:scale-[0.98]"
            >
              {primaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
