import { useCurrentAccount } from '@mysten/dapp-kit-react';
import { useQuery } from '@tanstack/react-query';
import { PACKAGE_ID } from '@/config/sui';
import { getProjectCapForProject } from '@/lib/sui/queries';
import { useCompatClient } from './useCompatClient';

/** 當前錢包是否擁有該專案的 ProjectCap（可發布更新、提款） */
export function useProjectCap(projectId: string) {
  const client = useCompatClient();
  const account = useCurrentAccount();
  const address = account?.address;

  const { data: projectCapId } = useQuery({
    queryKey: ['projectCap', address, projectId],
    queryFn: async () => {
      if (!address) return null;
      return getProjectCapForProject(client, address, projectId, PACKAGE_ID);
    },
    enabled: !!address && !!projectId,
  });

  return {
    projectCapId: projectCapId ?? null,
    isOwner: !!projectCapId,
  };
}
