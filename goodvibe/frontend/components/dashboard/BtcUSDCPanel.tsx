'use client';

import React from 'react';
import { useCurrentAccount, useCurrentClient } from '@mysten/dapp-kit-react';
import { useQuery } from '@tanstack/react-query';
import { formatBalance } from '@/utils/formatters';
import { USDC_TYPE } from '@/config/sui';

export const BtcUSDCPanel: React.FC = () => {
  const client = useCurrentClient();
  const account = useCurrentAccount();
  const address = account?.address;

  const { data: balance = BigInt(0), isLoading } = useQuery({
    queryKey: ['usdcBalance', address],
    queryFn: async () => {
      if (!address) return BigInt(0);
      const { objects } = await client.listCoins({ owner: address, coinType: USDC_TYPE });
      return objects.reduce((sum, coin) => sum + BigInt(coin.balance), BigInt(0));
    },
    enabled: !!address,
    refetchInterval: 30000,
  });

  return (
    <div className="bg-canvas-sand rounded-3xl p-8 relative overflow-hidden h-full flex flex-col justify-between">
      {/* Decorative */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-white/15 rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/3 pointer-events-none" />

      <div className="relative z-10">
        <h2 className="text-2xl font-serif font-medium text-ink-900 leading-tight">
          Wallet Balance
        </h2>
        <p className="text-xs text-ink-500 mt-1">Available USDC</p>
      </div>

      <div className="relative z-10 mt-6">
        <p className="text-4xl font-serif font-bold tracking-tight text-ink-900">
          {isLoading ? (
            <span className="animate-pulse opacity-50">...</span>
          ) : (
            `$${formatBalance(balance)}`
          )}
        </p>
      </div>
    </div>
  );
};
