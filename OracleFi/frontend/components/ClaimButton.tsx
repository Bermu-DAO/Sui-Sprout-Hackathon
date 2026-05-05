"use client";

import { useSignAndExecuteTransaction, useCurrentAccount } from "@mysten/dapp-kit";
import { useUserData } from "@/hooks/useUserData";
import { buildClaimReward } from "@/lib/transactions";
import { SCALING_FACTOR } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";

export function ClaimButton() {
  const account = useCurrentAccount();
  const { data } = useUserData();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  const pendingRewards = data?.pendingRewards ? data.pendingRewards / SCALING_FACTOR : 0;

  const handleClaim = async () => {
    if (pendingRewards <= 0) return;
    try {
      const tx = buildClaimReward();
      
      await signAndExecute({ transaction: tx as any });
      
      toast.success(t("claim.success"));
      
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["poolData"] });
        queryClient.invalidateQueries({ queryKey: ["userData"] });
        queryClient.invalidateQueries({ queryKey: ["userOCCoins"] });
      }, 1500);
      
    } catch (e: any) {
      toast.error(e.message || t("claim.failed"));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("claim.title")}</CardTitle>
        <CardDescription>{t("claim.claimPending")}</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <div className="font-semibold text-lg">
          {pendingRewards.toLocaleString(undefined, { maximumFractionDigits: 4 })} OC
        </div>
        <Button 
          onClick={handleClaim} 
          disabled={!account || pendingRewards <= 0}
        >
          {t("claim.claimAction")}
        </Button>
      </CardContent>
    </Card>
  );
}
