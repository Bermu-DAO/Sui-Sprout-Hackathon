import { useQuery } from '@tanstack/react-query';
import { getProjectUpdates } from '@/lib/sui/queries';
import { useCompatClient } from './useCompatClient';

export function useProjectUpdates(projectId: string) {
  const client = useCompatClient();

  return useQuery({
    queryKey: ['projectUpdates', projectId],
    queryFn: async () => getProjectUpdates(client, projectId),
    enabled: !!projectId,
    refetchInterval: false,
    staleTime: 10000, // 10 seconds
  });
}
