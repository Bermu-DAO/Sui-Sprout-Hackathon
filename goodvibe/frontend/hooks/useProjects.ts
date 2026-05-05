import { useCompatClient } from './useCompatClient';
import { useQuery } from '@tanstack/react-query';
import { Project } from '@/types/project';
import axios from 'axios';
import { getProjectById } from '@/lib/sui/queries';
import { PACKAGE_ID } from '@/config/sui';

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await axios.get('/api/projects');
      const projects = response.data;
      return projects.map((p: any) => ({
        ...p,
        raisedAmount: BigInt(p.raisedAmount),
        totalSupportAmount: p.totalSupportAmount ? BigInt(p.totalSupportAmount) : undefined,
        createdAt: p.createdAt ? BigInt(p.createdAt) : undefined,
        balance: p.balance ? BigInt(p.balance) : undefined,
      })) as Project[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useProject(projectId: string) {
    const suiClient = useCompatClient();

    return useQuery({
        queryKey: ['project', projectId],
        queryFn: async () => {
            const project = await getProjectById(suiClient, projectId, PACKAGE_ID);
            return project as Project | null;
        },
        enabled: !!projectId,
    });
}
