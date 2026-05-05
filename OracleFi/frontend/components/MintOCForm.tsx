"use client";

import { useState, useEffect } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { CircleDollarSign } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { buildAdminMint } from '@/lib/transactions';
import { SCALING_FACTOR } from '@/lib/constants';
import { useLanguage } from '@/contexts/LanguageContext';

interface MintOCFormProps {
  adminCapId: string; // PoolAdminCap ID — passed from AdminPanel
}

export function MintOCForm({ adminCapId }: MintOCFormProps) {
  const currentAccount = useCurrentAccount();
  const queryClient = useQueryClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const { t } = useLanguage();
  
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (currentAccount?.address && !recipient) {
      setRecipient(currentAccount.address);
    }
  }, [currentAccount, recipient]);

  const handleMint = () => {
    if (!currentAccount) {
      toast.error(t("toasts.connectWallet"));
      return;
    }

    if (!recipient) {
      toast.error(t("toasts.txFailed"));
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error(t("toasts.enterAmount"));
      return;
    }

    if (numAmount > 1000000000) {
      toast.error(t("toasts.amountExceedsLimit"));
      return;
    }

    setIsLoading(true);
    try {
      const amountScaled = Math.floor(numAmount * Number(SCALING_FACTOR));
      const tx = buildAdminMint(adminCapId, amountScaled, recipient);
      
      signAndExecute({ transaction: tx }, {
        onSuccess: () => {
          toast.success(t("toasts.ocMinted"));
          setAmount('');
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
          <CircleDollarSign className="h-5 w-5" />
          {t("admin.mintOC")}
        </CardTitle>
        <CardDescription>{t("admin.mintOCDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-yellow-600 dark:text-yellow-500 mb-2">
          {t("admin.limitWarning")}
        </div>
        
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium pl-1 text-muted-foreground">{t("admin.recipient")}</label>
            <Input
              type="text"
              placeholder="0x..."
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              disabled={isLoading || !currentAccount}
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-medium pl-1 text-muted-foreground">{t("admin.mintAmount")}</label>
            <Input
              type="number"
              placeholder={t("admin.amount")}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isLoading || !currentAccount}
              min="0"
              max="1000000000"
              step="1"
            />
          </div>
        </div>

        <Button 
          className="w-full mt-2" 
          onClick={handleMint} 
          disabled={isLoading || !currentAccount}
        >
          {isLoading ? t("toasts.processing") : t("admin.mintAction")}
        </Button>
      </CardContent>
    </Card>
  );
}
