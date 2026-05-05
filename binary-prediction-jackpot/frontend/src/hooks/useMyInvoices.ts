import { useCurrentAccount } from "@mysten/dapp-kit";
import { useQuery } from "@tanstack/react-query";
import { suiClient } from "../lib/sui";
import { PACKAGE_ID } from "../lib/constants";

export interface Invoice {
  id: string;
  event_id: string;
  outcome: number;
  amount: string;
  timestamp: string;
  invoice_number: string;
}

export function useMyInvoices() {
  const account = useCurrentAccount();

  return useQuery({
    queryKey: ["invoices", account?.address],
    queryFn: async () => {
      if (!account?.address) return [];

      try {
        const objects = await suiClient.getOwnedObjects({
          owner: account.address,
          filter: {
            StructType: `${PACKAGE_ID}::event_market::Invoice`,
          },
          options: { showContent: true },
        });

        const invoices = objects.data
          .map((obj) => {
            if (obj.data?.content?.dataType === "moveObject") {
              const fields = obj.data.content.fields as any;
              return {
                id: obj.data.objectId,
                event_id: fields.event_id,
                outcome: fields.outcome,
                amount: fields.amount,
                timestamp: fields.timestamp,
                invoice_number: fields.invoice_number,
              } as Invoice;
            }
            return null;
          })
          .filter((inv): inv is Invoice => inv !== null);

        return invoices;
      } catch (error) {
        console.error("Error fetching invoices:", error);
        return [];
      }
    },
    enabled: !!account?.address,
    refetchInterval: 5000,
  });
}
