"use client";

import { useState } from "react";
import { useSignAndExecuteTransaction, useCurrentAccount } from "@mysten/dapp-kit";
import { useUserOCCoins } from "@/hooks/useUserOCCoins";
import { buildStake } from "@/lib/transactions";
import { SCALING_FACTOR } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";

export function StakeForm() {
  const account = useCurrentAccount();
  const { data } = useUserOCCoins();
  const [amount, setAmount] = useState("");
  const { mutateAsync: signAndExecute, isPending: isLoading } = useSignAndExecuteTransaction();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  // Use totalBalance instead of largestCoin
  const maxAvailable = data ? data.totalBalance / Number(SCALING_FACTOR) : 0;

  const handleStake = async () => {
    if (!data?.allCoins?.length || !amount || isNaN(Number(amount))) return;
    try {
      const stakeAmount = Math.floor(Number(amount) * SCALING_FACTOR);
      const tx = buildStake(data.allCoins, stakeAmount);
      
      await signAndExecute({ transaction: tx as any });
      
      toast.success(t("stake.success"));
      setAmount("");
      
      // Invalidate queries to refetch
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["poolData"] });
        queryClient.invalidateQueries({ queryKey: ["userData"] });
        queryClient.invalidateQueries({ queryKey: ["userOCCoins"] });
      }, 1500);
      
    } catch (e: any) {
      toast.error(e.message || t("stake.failed"));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("stake.title")}</CardTitle>
        <CardDescription>
          {t("stake.available")}: {maxAvailable.toLocaleString(undefined, { maximumFractionDigits: 1 })} OC
          {data?.allCoins && data.allCoins.length > 1 && (
            <span className="text-xs text-muted-foreground ml-2">
              ({data.allCoins.length} {t("stake.objects")})
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex space-x-2">
          <Input 
            type="number" 
            placeholder={t("stake.amount")} 
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={!account}
          />
          <Button 
            variant="secondary" 
            onClick={() => setAmount(maxAvailable.toString())}
            disabled={!account || maxAvailable === 0}
          >
            {t("stake.max")}
          </Button>
        </div>
        <Button 
          variant="neon"
          className="w-full mt-4" 
          onClick={handleStake} 
          disabled={!account || !amount || Number(amount) <= 0 || Number(amount) > maxAvailable || isLoading}
        >
          {!account 
            ? t("stake.connectWallet")
            : isLoading 
            ? t("stake.staking")
            : t("stake.stakeAction")
          }
        </Button>
      </CardContent>
    </Card>
  );
}
