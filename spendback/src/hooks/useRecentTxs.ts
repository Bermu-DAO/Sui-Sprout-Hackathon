import { useCurrentAccount } from "@mysten/dapp-kit-react";
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import type { SuiTransactionBlockResponse } from "@mysten/sui/jsonRpc";
import { useQuery } from "@tanstack/react-query";

export const rpc = new SuiJsonRpcClient({
  network: "testnet",
  url: getJsonRpcFullnodeUrl("testnet"),
});

export function useRecentTxs() {
  const account = useCurrentAccount();
  const address = account?.address;

  return useQuery<SuiTransactionBlockResponse[]>({
    queryKey: ["recentTxs", address],
    queryFn: async () => {
      const result = await rpc.queryTransactionBlocks({
        filter: { FromAddress: address! },
        options: {
          showInput: true,
          showBalanceChanges: true,
          showEffects: true,
        },
        limit: 10,
        order: "descending",
      });
      return result.data;
    },
    enabled: !!address,
  });
}
