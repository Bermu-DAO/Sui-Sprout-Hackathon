"use client";

import { useState } from "react";
import { useSignAndExecuteTransaction, useCurrentAccount } from "@mysten/dapp-kit";
import { useUserData } from "@/hooks/useUserData";
import { buildWithdraw } from "@/lib/transactions";
import { SCALING_FACTOR } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";

export function WithdrawForm() {
  const account = useCurrentAccount();
  const { data } = useUserData();
  const [amount, setAmount] = useState("");
  const { mutateAsync: signAndExecute, isPending: isLoading } = useSignAndExecuteTransaction();
  const queryClient = useQueryClient();
  const { t } = useLanguage();

  const maxWithdraw = data?.stakeAmount ? data.stakeAmount / SCALING_FACTOR : 0;

  const handleWithdraw = async () => {
    if (!amount || isNaN(Number(amount))) return;
    try {
      const withdrawAmount = Math.floor(Number(amount) * SCALING_FACTOR);
      const tx = buildWithdraw(withdrawAmount);
      
      await signAndExecute({ transaction: tx as any });
      
      toast.success(t("withdraw.success"));
      setAmount("");
      
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["poolData"] });
        queryClient.invalidateQueries({ queryKey: ["userData"] });
        queryClient.invalidateQueries({ queryKey: ["userOCCoins"] });
      }, 1500);
      
    } catch (e: any) {
      toast.error(e.message || t("withdraw.failed"));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("withdraw.title")}</CardTitle>
        <CardDescription>{t("withdraw.stakedBalance")}: {maxWithdraw.toLocaleString()} OC</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex space-x-2">
          <Input 
            type="number" 
            placeholder={t("withdraw.amount")} 
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={!account}
          />
          <Button 
            variant="secondary" 
            onClick={() => setAmount(maxWithdraw.toString())}
            disabled={!account || maxWithdraw === 0}
          >
            {t("withdraw.max")}
          </Button>
        </div>
        <Button 
          className="w-full mt-4" 
          variant="neon"
          onClick={handleWithdraw} 
          disabled={!account || !amount || Number(amount) <= 0 || Number(amount) > maxWithdraw || isLoading}
        >
          {!account 
            ? t("withdraw.connectWallet")
            : isLoading 
            ? t("withdraw.withdrawing")
            : t("withdraw.withdrawAction")
          }
        </Button>
      </CardContent>
    </Card>
  );
}
