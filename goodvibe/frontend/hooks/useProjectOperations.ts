import { useCurrentAccount } from '@mysten/dapp-kit-react';
import { useQueryClient } from '@tanstack/react-query';
import { buildCreateProjectTx, buildPostUpdateTx } from '@/utils/projectTx';
import { txError } from '@/utils/txToast';
import { useTransaction } from './useTransaction';

export function useProjectOperations() {
  const account = useCurrentAccount();
  const { execute, isExecuting } = useTransaction();
  const queryClient = useQueryClient();

  const createProject = async (data: {
    title: string;
    description: string;
    category: string;
    imageUrl: string;
    coinType: string;
  }) => {
    if (!account) { txError('Please connect your wallet'); return { success: false }; }

    try {
      const tx = buildCreateProjectTx(data.title, data.description, data.category, data.imageUrl, data.coinType);
      const result = await execute(tx, {
        loadingMessage: 'Creating project...',
        successMessage: 'Project created!',
        errorMessage: 'Failed to create project',
        onSuccess: async () => {
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['projects'] }),
            queryClient.invalidateQueries({ queryKey: ['dashboard', account?.address] }),
          ]);
        },
      });
      return result;
    } catch {
      return { success: false };
    }
  };

  const postUpdate = async (
    projectCapId: string,
    projectId: string,
    updateId: string,
    title: string,
    content: string,
    coinType: string,
  ) => {
    if (!account) { txError('Please connect your wallet'); return { success: false }; }

    try {
      const tx = buildPostUpdateTx(projectCapId, projectId, updateId, title, content, coinType);
      const result = await execute(tx, {
        loadingMessage: 'Posting update...',
        successMessage: 'Update posted!',
        errorMessage: 'Failed to post update',
        onSuccess: async () => {
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['project', projectId] }),
            queryClient.invalidateQueries({ queryKey: ['projectUpdates', projectId] }),
          ]);
        },
      });
      return result;
    } catch {
      return { success: false };
    }
  };

  return { createProject, postUpdate, isLoading: isExecuting };
}
