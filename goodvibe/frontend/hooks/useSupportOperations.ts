import { useCurrentAccount, useDAppKit } from '@mysten/dapp-kit-react';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { createStableLayerClient } from '@/utils/stableLayerTx';
import { buildStartSupportingTx, buildIncreaseSupportTx, buildWithdrawSupportTx } from '@/utils/projectTx';
import { buildCreateSupportRecordTx } from '@/utils/supportRecordTx';
import { buildDonateYieldTx } from '@/utils/yieldTx';
import { executeTransactionWithToast } from '@/utils/transaction';
import { txError } from '@/utils/txToast';
import { getUserSupportRecord } from '@/lib/sui/queries';
import { PACKAGE_ID } from '@/config/sui';
import { useSupportRecord } from './useSupportRecord';
import { useCompatClient } from './useCompatClient';

function invalidateAfterSupportOp(
  queryClient: ReturnType<typeof import('@tanstack/react-query').useQueryClient>,
  projectId: string,
  supportRecordId: string,
  accountAddress: string | undefined
) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['project', projectId] }),
    queryClient.invalidateQueries({ queryKey: ['projectDetail', projectId] }),
    queryClient.invalidateQueries({ queryKey: ['supportRecord', accountAddress] }),
    queryClient.invalidateQueries({ queryKey: ['supportedProjects', supportRecordId] }),
    queryClient.invalidateQueries({ queryKey: ['supportedProjectsDetails'] }),
    queryClient.invalidateQueries({ queryKey: ['usdcBalance', accountAddress] }),
    queryClient.invalidateQueries({ queryKey: ['dashboard', accountAddress] }),
  ]);
}

export function useSupportOperations() {
  const client = useCompatClient();
  const account = useCurrentAccount();
  const dAppKit = useDAppKit();
  const signAndExecute = dAppKit.signAndExecuteTransaction.bind(dAppKit);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();
  const { supportRecordId } = useSupportRecord();

  const createSupportRecord = async () => {
    if (!account?.address) { txError('Please connect wallet'); return null; }

    setIsLoading(true);
    try {
      const tx = buildCreateSupportRecordTx(account.address);
      const { success } = await executeTransactionWithToast(signAndExecute, tx, {
        loadingMessage: 'Creating support record...',
        successMessage: 'Support record created!',
        errorMessage: 'Failed to create support record',
        client,
        onSuccess: async () => {
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['supportRecord', account.address] }),
            queryClient.invalidateQueries({ queryKey: ['dashboard', account.address] }),
          ]);
        },
      });
      if (!success) return null;
      return await getUserSupportRecord(client, account.address, PACKAGE_ID);
    } catch (error: any) {
      txError(error.message || 'Failed to create support record');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const startSupporting = async (
    projectId: string,
    supportRecordId: string,
    amount: bigint,
    coinType: string,
  ) => {
    if (!account?.address) { txError('Please connect wallet'); return false; }

    setIsLoading(true);
    try {
      const stableClient = await createStableLayerClient(account.address);
      const tx = await buildStartSupportingTx(
        stableClient, client, account.address, projectId, supportRecordId, amount, coinType,
      );
      const { success } = await executeTransactionWithToast(signAndExecute, tx, {
        loadingMessage: 'Minting stablecoin & starting support...',
        successMessage: 'Support started!',
        errorMessage: 'Failed to start supporting',
        client,
        onSuccess: async () => {
          await invalidateAfterSupportOp(queryClient, projectId, supportRecordId, account?.address);
        },
      });
      return success;
    } catch (error: any) {
      txError(error.message || 'Failed to start supporting');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const increaseSupport = async (
    projectId: string,
    supportRecordId: string,
    additionalAmount: bigint,
    coinType: string,
  ) => {
    if (!account?.address) { txError('Please connect wallet'); return false; }

    setIsLoading(true);
    try {
      const stableClient = await createStableLayerClient(account.address);
      const tx = await buildIncreaseSupportTx(
        stableClient, client, account.address, projectId, supportRecordId, additionalAmount, coinType,
      );
      const { success } = await executeTransactionWithToast(signAndExecute, tx, {
        loadingMessage: 'Adding more support...',
        successMessage: 'Support increased!',
        errorMessage: 'Failed to increase support',
        client,
        onSuccess: async () => {
          await invalidateAfterSupportOp(queryClient, projectId, supportRecordId, account?.address);
        },
      });
      return success;
    } catch (error: any) {
      txError(error.message || 'Failed to increase support');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const withdrawSupport = async (
    projectId: string,
    supportRecordId: string,
    amount: bigint,
    coinType: string,
  ) => {
    if (!account?.address) { txError('Please connect wallet'); return false; }

    setIsLoading(true);
    try {
      const stableClient = await createStableLayerClient(account.address);
      const tx = await buildWithdrawSupportTx(
        stableClient, account.address, projectId, supportRecordId, amount, coinType,
      );
      const { success } = await executeTransactionWithToast(signAndExecute, tx, {
        loadingMessage: 'Withdrawing support...',
        successMessage: 'Support withdrawn!',
        errorMessage: 'Failed to withdraw support',
        client,
        onSuccess: async () => {
          await invalidateAfterSupportOp(queryClient, projectId, supportRecordId, account?.address);
        },
      });
      return success;
    } catch (error: any) {
      txError(error.message || 'Failed to withdraw support');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const donateYield = async (projectId: string, coinType: string) => {
    if (!account?.address) { txError('Please connect wallet'); return false; }

    setIsLoading(true);
    try {
      const stableClient = await createStableLayerClient(account.address);
      const tx = await buildDonateYieldTx(stableClient, account.address, projectId, coinType);
      const { success } = await executeTransactionWithToast(signAndExecute, tx, {
        loadingMessage: 'Donating yield...',
        successMessage: 'Yield donated!',
        errorMessage: 'Failed to donate yield',
        client,
        onSuccess: async () => {
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ['project', projectId] }),
            queryClient.invalidateQueries({ queryKey: ['usdcBalance', account?.address] }),
            queryClient.invalidateQueries({ queryKey: ['dashboard', account?.address] }),
          ]);
        },
      });
      return success;
    } catch (error: any) {
      txError(error.message || 'Failed to donate yield');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { createSupportRecord, startSupporting, increaseSupport, withdrawSupport, donateYield, isLoading };
}
