'use client';

import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { txError } from '@/utils/txToast';
import { useProjectOperations } from '@/hooks/useProjectOperations';

interface PostUpdateFormProps {
  projectId: string;
  projectCapId: string;
  coinType: string;
  onSuccess?: () => void;
  defaultExpanded?: boolean;
}

export const PostUpdateForm: React.FC<PostUpdateFormProps> = ({
  projectId,
  projectCapId,
  coinType,
  onSuccess,
  defaultExpanded = false,
}) => {
  const { postUpdate, isLoading } = useProjectOperations();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [expanded, setExpanded] = useState(defaultExpanded);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      txError('Please fill in title and content');
      return;
    }
    const updateId = `update-${Date.now()}`;
    const result = await postUpdate(projectCapId, projectId, updateId, title.trim(), content.trim(), coinType);
    if (result.success) {
      setTitle('');
      setContent('');
      // If we started expanded, we might want to stay expanded or collapse? 
      // User likely wants to post another one or is done. Let's keep it expanded for now or reset if it wasn't default.
      if (!defaultExpanded) setExpanded(false);
      
      // Wait a bit for the chain to index the dynamic field, then trigger refresh
      setTimeout(() => {
        onSuccess?.();
      }, 1500);
    }
  };

  if (!expanded) {
    return (
      <button 
        onClick={() => setExpanded(true)}
        className="w-full py-4 border-2 border-dashed border-ink-200 rounded-2xl text-ink-500 hover:border-ink-400 hover:text-ink-700 hover:bg-ink-50/50 transition-all font-medium flex items-center justify-center gap-2 group"
      >
        <span className="w-8 h-8 rounded-full bg-ink-100 flex items-center justify-center group-hover:bg-ink-200 transition-colors">
          <svg className="w-5 h-5 text-ink-500 group-hover:text-ink-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </span>
        Write a new update...
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-ink-100 shadow-sm transition-shadow hover:shadow-md">
      <div className="p-6 space-y-6">
        <div>
          <label className="block text-sm font-bold text-ink-900 mb-2 uppercase tracking-wide">Update Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="block w-full rounded-xl border-ink-200 bg-ink-50/30 px-4 py-3 text-lg font-medium focus:border-ink-900 focus:ring-ink-900/10 placeholder:text-ink-300 transition-all"
            placeholder="e.g., We reached our first milestone!"
            required
            disabled={isLoading}
          />
        </div>
        
        <div>
          <label className="block text-sm font-bold text-ink-900 mb-2 uppercase tracking-wide">Update Content</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={8}
            className="block w-full rounded-xl border-ink-200 bg-ink-50/30 px-4 py-3 focus:border-ink-900 focus:ring-ink-900/10 placeholder:text-ink-300 resize-y min-h-[150px] transition-all"
            placeholder="Share details about your progress, challenges, and what's coming next..."
            required
            disabled={isLoading}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-ink-100">
          {!defaultExpanded && (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-ink-500 hover:text-ink-900 hover:bg-ink-50 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
          )}
          <Button 
            type="submit" 
            disabled={isLoading}
            className="px-8 py-2.5 rounded-xl bg-ink-900 text-white font-bold hover:bg-ink-800 transition-all shadow-lg shadow-ink-900/20"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Publishing...
              </span>
            ) : (
              'Post Update'
            )}
          </Button>
        </div>
      </div>
    </form>
  );
};
