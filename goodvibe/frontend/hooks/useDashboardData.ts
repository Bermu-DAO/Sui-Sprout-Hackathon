'use client';

import { useQuery } from '@tanstack/react-query';
import { useCurrentAccount } from '@mysten/dapp-kit-react';
import axios from 'axios';

export interface DashboardData {
  supportedProjects: Array<{
    projectId: string;
    projectName: string;
    donationAmount: bigint;
  }>;
}

export function useDashboardData() {
  const account = useCurrentAccount();
  const userAddress = account?.address;

  return useQuery({
    queryKey: ['dashboard', userAddress],
    queryFn: async () => {
      if (!userAddress) return null;
      
      const response = await axios.get(`/api/dashboard?address=${userAddress}`);
      const data = response.data;
      
      return {
        supportedProjects: (data.supportedProjects || []).map((p: {
          projectId: string;
          projectName: string;
          donationAmount: string;
        }) => ({
          projectId: p.projectId,
          projectName: p.projectName,
          donationAmount: BigInt(p.donationAmount),
        })),
      } as DashboardData;
    },
    enabled: !!userAddress,
    staleTime: 5 * 60 * 1000,
  });
}
