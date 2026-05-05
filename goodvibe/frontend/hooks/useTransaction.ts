import { useCurrentClient, useDAppKit } from '@mysten/dapp-kit-react';
import { Transaction } from '@mysten/sui/transactions';
import { useState } from 'react';
import { executeTransactionWithToast, ExecuteTransactionOptions } from '@/utils/transaction';

export function useTransaction() {
  const client = useCurrentClient();
  const dAppKit = useDAppKit();
  const signAndExecute = dAppKit.signAndExecuteTransaction.bind(dAppKit);
  const [isExecuting, setIsExecuting] = useState(false);

  const execute = async (
    transaction: Transaction,
    options?: ExecuteTransactionOptions
  ) => {
    setIsExecuting(true);
    try {
      const result = await executeTransactionWithToast(
        signAndExecute,
        transaction,
        { ...options, client }
      );
      return result;
    } finally {
      setIsExecuting(false);
    }
  };

  return {
    execute,
    isExecuting,
  };
}
