"use client";

import { useState } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { toast } from 'sonner';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { buildUpdateOraclePrice } from '@/lib/transactions';
import { PACKAGE_ID, REGISTRY_ID } from '@/lib/constants';
import { useLanguage } from '@/contexts/LanguageContext';

interface UpdatePriceFormProps {
  adminCapId: string; // Oracle AdminCap ID — passed from AdminPanel
}

export function UpdatePriceForm({ adminCapId }: UpdatePriceFormProps) {
  const currentAccount = useCurrentAccount();
  const queryClient = useQueryClient();
  const { mutate: signAndExecute } = useSignAndExecuteTransaction();
  const suiClient = useSuiClient();
  const { t } = useLanguage();
  
  const { data: currentPrice } = useQuery({
    queryKey: ['oracle-price'],
    queryFn: async () => {
      const tx = new Transaction();
      tx.moveCall({
        target: `${PACKAGE_ID}::multi_oracle_registry::get_oracle_price`,
        arguments: [
          tx.object(REGISTRY_ID),
          tx.pure.string('OC'),
          tx.pure.string('USD'),
        ],
      });
      
      const result = await suiClient.devInspectTransactionBlock({
        sender: '0x0000000000000000000000000000000000000000000000000000000000000000',
        transactionBlock: tx,
      });
      
      if (result.results?.[0]?.returnValues?.[0]) {
        const bytes = result.results[0].returnValues[0][0];
        const price = new DataView(new Uint8Array(bytes).buffer).getBigUint64(0, true);
        return Number(price) / 1e8;
      }
      return 2.5;
    },
    refetchInterval: 5000,
  });

  const calculateAPY = (price: number) => {
    const MIN_RATE = 500;   // 5%
    const MAX_RATE = 2000;  // 20%
    const MIN_PRICE = 0.5;
    const MAX_PRICE = 5.0;

    if (price >= MAX_PRICE) return MAX_RATE / 100;
    if (price <= MIN_PRICE) return MIN_RATE / 100;

    const rate = MIN_RATE + (price - MIN_PRICE) * (MAX_RATE - MIN_RATE) / (MAX_PRICE - MIN_PRICE);
    return rate / 100;
  };

  const currentPriceDisplay = currentPrice?.toFixed(4) || '2.5000';
  const currentAPY = currentPrice ? calculateAPY(currentPrice) : null;
  
  const [newPrice, setNewPrice] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const previewPrice = parseFloat(newPrice);
  const isValidPrice = !isNaN(previewPrice) && previewPrice >= 0.1 && previewPrice <= 10;
  const apyPreview = isValidPrice ? calculateAPY(previewPrice) : null;

  const handleUpdatePrice = () => {
    if (!currentAccount) {
      toast.error(t("toasts.connectWallet"));
      return;
    }

    if (!isValidPrice) {
      toast.error(t("toasts.enterAmount"));
      return;
    }

    setIsLoading(true);
    try {
      // Use the Oracle AdminCap passed in from AdminPanel
      const tx = buildUpdateOraclePrice(
        adminCapId,  // ← dynamically passed Oracle AdminCap
        previewPrice
      );
      
      signAndExecute({ transaction: tx }, {
        onSuccess: () => {
          toast.success(t("toasts.priceUpdated"));
          setNewPrice('');
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['oracle-price'] });
            queryClient.invalidateQueries({ queryKey: ['pool'] });
          }, 1500);
        },
        onError: (error) => {
          console.error('Update price error:', error);
          toast.error(`${t("toasts.txFailed")}: ${error.message}`);
        },
        onSettled: () => {
          setIsLoading(false);
        }
      });
    } catch (e: any) {
      console.error('Transaction build error:', e);
      toast.error(`${t("toasts.txFailed")}: ${e.message}`);
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          {t("admin.updatePrice")}
        </CardTitle>
        <CardDescription>{t("admin.updatePriceDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("stats.currentPrice")}:</span>
            <span className="font-medium">${currentPriceDisplay} USD</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("stats.currentAPY")}:</span>
            <span className="font-medium text-green-600 dark:text-green-400">
              {currentAPY !== null ? `${currentAPY.toFixed(2)}%` : '-'}
            </span>
          </div>
          <div className="flex justify-between min-h-[20px]">
            <span className="text-muted-foreground">→</span>
            <span className={apyPreview !== null ? "font-medium text-blue-600 dark:text-blue-400" : "text-muted-foreground"}>
              {apyPreview !== null ? `→ ${apyPreview.toFixed(2)}%` : '-'}
            </span>
          </div>
        </div>
        
        <div className="space-y-2">
          <Input
            type="number"
            placeholder={t("admin.newPrice")}
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
            disabled={isLoading || !currentAccount}
            min="0.1"
            max="10"
            step="0.01"
          />
        </div>

        <Button 
          className="w-full" 
          onClick={handleUpdatePrice} 
          disabled={isLoading || !currentAccount || !isValidPrice}
        >
          {isLoading ? t("toasts.processing") : t("admin.updateAction")}
        </Button>
      </CardContent>
    </Card>
  );
}
