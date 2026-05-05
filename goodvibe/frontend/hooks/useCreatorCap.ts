'use client';

import { useQuery } from '@tanstack/react-query';
import { useCurrentAccount } from '@mysten/dapp-kit-react';
import { useCompatClient } from './useCompatClient';

// ProjectCreatorCap was introduced in V2 upgrade — its type is permanently bound to V2 package ID
const CREATOR_CAP_PACKAGE = '0x735c683644ffbd1448d977749fec23f4e9ea2d8e0922c6edc155e7f6d1d83cc7';

export interface CreatorCapData {
  objectId: string;
  maxProjects: number;
  projectsCreated: number;
}

export function useCreatorCap() {
  const account = useCurrentAccount();
  const client = useCompatClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['creatorCap', account?.address],
    queryFn: async (): Promise<CreatorCapData | null> => {
      if (!account?.address) return null;

      const result = await client.getOwnedObjects({
        owner: account.address,
        filter: {
          StructType: `${CREATOR_CAP_PACKAGE}::project::ProjectCreatorCap`,
        },
        options: { showContent: true },
      });

      if (!result.data.length) return null;

      const obj = result.data[0];
      const content = obj.data?.content as any;
      const fields = content?.fields ?? content;
      if (!fields) return null;

      return {
        objectId: obj.data!.objectId!,
        maxProjects: Number(fields.max_projects ?? 0),
        projectsCreated: Number(fields.projects_created ?? 0),
      };
    },
    enabled: !!account?.address,
    staleTime: 30_000,
  });

  return {
    creatorCap: data ?? null,
    isLoading,
    hasCreatorCap: !!data,
    canCreateMore: data ? (data.maxProjects === 0 || data.projectsCreated < data.maxProjects) : false,
    refetch,
  };
}
