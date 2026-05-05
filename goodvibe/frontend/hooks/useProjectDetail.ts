import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export interface ProjectDetailData {
  project: {
    id: string;
    title: string;
    description: string;
    category: string;
    imageUrl: string;
    creator: string;
    raisedAmount: string;
    totalSupportAmount?: string;
    balance?: string;
    supporterCount: number;
    isActive?: boolean;
    createdAt?: string;
  };
  updates: Array<{
    id: string;
    title: string;
    content: string;
    timestamp: number;
    author: string;
  }>;
  supporters: Array<{
    address: string;
    amount: string;
    lastUpdated: number;
  }>;
}

/**
 * 統一的項目詳情 hook - 從 API 獲取所有數據
 * 包含 project、updates、supporters
 */
export function useProjectDetail(projectId: string) {
  return useQuery({
    queryKey: ['projectDetail', projectId],
    queryFn: async () => {
      const response = await axios.get<ProjectDetailData>(`/api/projects/${projectId}`);
      return response.data;
    },
    enabled: !!projectId,
    staleTime: 30000, // 30 seconds
  });
}
