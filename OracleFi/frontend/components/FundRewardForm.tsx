"use client";

import { useState } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Coins } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePoolData } from '@/hooks/usePoolData';
import { useUserOCCoins } from '@/hooks/useUserOCCoins';
import { buildFundReward } from '@/lib/transactions';
import { SCALING_FACTOR } from '@/lib/constants';
import { useLanguage } from '@/contexts/LanguageContext';

interface FundRewardFormProps {
  adminCapId: string;
}

export function FundRewardForm({ adminCapId }: FundRewardFormProps) {
  const currentAccount = useCurrentAccount();
  const queryClient = useQueryClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const { t } = useLanguage();
  
  const { data: poolData } = usePoolData();
  const { data: userData } = useUserOCCoins();
  
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const rewardBalanceDisplay = poolData ? (poolData.rewardBalance / Number(SCALING_FACTOR)).toLocaleString('en-US', { maximumFractionDigits: 4 }) : '0';
  const userBalanceDisplay = userData ? (userData.totalBalance / Number(SCALING_FACTOR)).toLocaleString('en-US', { maximumFractionDigits: 4 }) : '0';

  const handleFund = () => {
    if (!currentAccount) {
      toast.error(t("toasts.connectWallet"));
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error(t("toasts.enterAmount"));
      return;
    }

    if (!userData || !userData.coins || userData.coins.length === 0) {
      toast.error(t("toasts.insufficientBalance"));
      return;
    }

    const userBalanceNum = userData.totalBalance / Number(SCALING_FACTOR);
    if (numAmount > userBalanceNum) {
      toast.error(t("toasts.insufficientBalance"));
      return;
    }

    setIsLoading(true);
    try {
      const amountScaled = (numAmount * Number(SCALING_FACTOR)).toString();
      const tx = buildFundReward(
        adminCapId,
        userData.coins[0].coinObjectId,
        amountScaled
      );
      
      signAndExecute({ transaction: tx }, {
        onSuccess: () => {
          toast.success(t("toasts.rewardFunded"));
          setAmount('');
          setTimeout(() => queryClient.invalidateQueries({ queryKey: ['pool'] }), 1500);
          setTimeout(() => queryClient.invalidateQueries({ queryKey: ['userOCCoins'] }), 1500);
        },
        onError: (error) => {
          toast.error(`${t("toasts.txFailed")}: ${error.message}`);
        },
        onSettled: () => {
          setIsLoading(false);
        }
      });
    } catch (e: any) {
      toast.error(`${t("toasts.txFailed")}: ${e.message}`);
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-5 w-5" />
          {t("admin.fundPool")}
        </CardTitle>
        <CardDescription>{t("admin.fundPoolDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("stats.rewardBalance")}:</span>
            <span className="font-medium">{rewardBalanceDisplay} OC</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("stake.available")}:</span>
            <span className="font-medium">{userBalanceDisplay} OC</span>
          </div>
        </div>
        
        <div className="space-y-2">
          <Input
            type="number"
            placeholder={t("admin.amount")}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isLoading || !currentAccount}
            min="0"
            step="0.01"
          />
        </div>

        <Button 
          className="w-full" 
          onClick={handleFund} 
          disabled={isLoading || !currentAccount}
        >
          {isLoading ? t("toasts.processing") : t("admin.fundAction")}
        </Button>
      </CardContent>
    </Card>
  );
}
