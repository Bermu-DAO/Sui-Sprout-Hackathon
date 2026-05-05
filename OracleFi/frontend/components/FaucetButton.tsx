'use client';

import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { Button } from '@/components/ui/button';
import { Droplets } from 'lucide-react';
import { toast } from 'sonner';
import { FAUCET_STATE_ID } from '@/lib/constants';
import { buildFaucet } from '@/lib/transactions';
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export function FaucetButton() {
  const { t } = useLanguage();
  const account = useCurrentAccount();
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();

  const FAUCET_AMOUNT = 100; // 每次領取 100 OC
  const COOLDOWN_MINUTES = 5; // 冷卻時間 5 分鐘

  const handleFaucet = () => {
    if (!account) {
      toast.error(t('faucet.connectFirst'));
      return;
    }

    // 檢查冷卻時間
    const storageKey = `faucet_last_claim_${account.address}`;
    const lastClaimStr = localStorage.getItem(storageKey);
    
    if (lastClaimStr) {
      const lastClaimTime = parseInt(lastClaimStr);
      const now = Date.now();
      const timePassed = now - lastClaimTime;
      const cooldownMs = COOLDOWN_MINUTES * 60 * 1000;
      
      if (timePassed < cooldownMs) {
        const remainingMinutes = Math.ceil((cooldownMs - timePassed) / 60000);
        toast.error(`⏰ ${t('faucet.waitMinutes', { minutes: remainingMinutes })}`);
        return;
      }
    }

    // 建立交易
    const tx = buildFaucet(FAUCET_STATE_ID);

    // 執行交易
    signAndExecute(
      { transaction: tx },
      {
        onSuccess: () => {
          toast.success(`🎉 ${t('faucet.success', { amount: FAUCET_AMOUNT })}`);
          const now = Date.now();
          localStorage.setItem(storageKey, now.toString());
        },
        onError: (error) => {
          console.error('Faucet claim error:', error);
          toast.error(t('faucet.failed'));
        },
      }
    );
  };

  return (
    <Button 
      onClick={handleFaucet}
      variant="outline"
      className="gap-1 sm:gap-2 bg-blue-600/10 hover:bg-blue-600/20 border-blue-600/50 px-2 sm:px-4"
      disabled={!account || isPending}
    >
      <Droplets className="h-4 w-4 text-blue-400 flex-shrink-0" />
      <span className="hidden sm:inline">
        {isPending ? t('faucet.claiming') : t('faucet.button', { amount: FAUCET_AMOUNT })}
      </span>
      <span className="inline-block sm:hidden text-xs font-semibold">
        {isPending ? "..." : `${FAUCET_AMOUNT} OC`}
      </span>
    </Button>
  );
}
