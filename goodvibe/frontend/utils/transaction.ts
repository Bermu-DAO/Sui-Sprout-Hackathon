import { Transaction } from '@mysten/sui/transactions';
import { txLoading, txSuccess, txError } from './txToast';

export interface ExecuteTransactionOptions {
  loadingMessage?: string;
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: (digest: string) => void | Promise<void>;
  onError?: (error: Error) => void | Promise<void>;
  client?: { waitForTransaction: (opts: any) => Promise<any> };
}

/** Resolve tx status from result (conservative: digest = success unless explicitly failed) */
async function resolveTransactionStatus(
  result: any,
  client?: { waitForTransaction: (opts: any) => Promise<any> }
): Promise<{ success: boolean; error?: string }> {
  const digest = result.digest ?? result.Transaction?.digest;
  if (!digest) return { success: false, error: 'No transaction digest' };
  if (result.FailedTransaction) {
    return { success: false, error: result.FailedTransaction.status?.error?.message ?? 'Transaction failed' };
  }
  const directStatus = result.effects?.status?.status ?? result.Transaction?.effects?.status?.success;
  if (directStatus === true || directStatus === 'success') return { success: true };
  if (directStatus === false || directStatus === 'failure') {
    return { success: false, error: result.effects?.status?.error ?? 'Transaction failed' };
  }
  if (!client) return { success: true };
  try {
    const tx = await client.waitForTransaction({ digest });
    const txStatus = (tx as any).effects?.status?.status;
    if (txStatus === 'failure') return { success: false, error: (tx as any).effects?.status?.error || 'Transaction failed' };
    return { success: true };
  } catch {
    return { success: true };
  }
}

export async function executeTransactionWithToast(
  signAndExecute: (params: { transaction: any }) => Promise<any>,
  transaction: Transaction,
  options: ExecuteTransactionOptions = {}
): Promise<{ success: boolean; digest?: string }> {
  const {
    loadingMessage,
    successMessage = 'Transaction successful',
    errorMessage = 'Transaction failed',
    onSuccess,
    onError,
    client,
  } = options;

  txLoading(loadingMessage);
  try {
    const result = await signAndExecute({ transaction });
    const digest = result.Transaction?.digest ?? result.digest;
    if (!digest) {
      txError(errorMessage + ': No digest');
      return { success: false };
    }

    const { success, error } = await resolveTransactionStatus(result, client);
    if (success) {
      txSuccess(digest, successMessage);
      if (onSuccess) await onSuccess(digest);
      return { success: true, digest };
    }
    txError(`${errorMessage}: ${error || 'Unknown error'}`);
    if (onError) await onError(new Error(error || 'Unknown error'));
    return { success: false, digest };
  } catch (error: any) {
    txError(error.message || errorMessage);
    if (onError) await onError(error);
    return { success: false };
  }
}
