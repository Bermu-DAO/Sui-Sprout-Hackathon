import { useCurrentAccount } from '@mysten/dapp-kit-react';
import { useQuery } from '@tanstack/react-query';
import { normalizeSuiAddress } from '@mysten/sui/utils';
import { PACKAGE_ID } from '@/config/sui';
import { structFields, toBigInt } from '@/lib/sui/queries';
import { useCompatClient } from './useCompatClient';

/** 正規化專案 ID 以利比對 */
function normId(id: string | { id?: string } | undefined): string {
  if (id == null) return '';
  const s = typeof id === 'string' ? id : (id as { id?: string })?.id ?? String(id);
  if (!s) return '';
  try {
    return normalizeSuiAddress(s);
  } catch {
    return s.toLowerCase();
  }
}

interface SupportedProject {
  projectId: string;
  amount: bigint;
  startedAt: bigint;
  lastUpdated: bigint;
}

export function useSupportRecord() {
  const client = useCompatClient();
  const account = useCurrentAccount();
  const address = account?.address;

  const { data: supportRecordId, isLoading: isLoadingRecord } = useQuery({
    queryKey: ['supportRecord', address],
    queryFn: async () => {
      if (!address) return null;

      const objects = await client.getOwnedObjects({
        owner: address,
        filter: {
          StructType: `${PACKAGE_ID}::support_record::SupportRecord`,
        },
        options: { showContent: true },
      });

      return objects.data[0]?.data?.objectId || null;
    },
    enabled: !!address,
  });

  const { data: supportedProjects, isLoading: isLoadingProjects } = useQuery({
    queryKey: ['supportedProjects', supportRecordId],
    queryFn: async () => {
      if (!supportRecordId) return [];

      const dynamicFields = await client.getDynamicFields({
        parentId: supportRecordId,
      });

      const projects: SupportedProject[] = [];

      for (const field of dynamicFields.data) {
        try {
          const fieldObject = await client.getObject({
            id: field.objectId,
            options: { showContent: true },
          });

          const content = fieldObject.data?.content as Record<string, unknown> | undefined;
          if (!content) continue;

          const fields = structFields(content);
          const rawValue = fields.value;
          const value = structFields(rawValue);

          const projectId = normId((value.project_id ?? fields.name ?? field.name?.value) as string | { id?: string });
          if (!projectId) continue;

          projects.push({
            projectId,
            amount: toBigInt(value.amount),
            startedAt: toBigInt(value.started_at),
            lastUpdated: toBigInt(value.last_updated),
          });
        } catch {
          continue;
        }
      }

      return projects;
    },
    enabled: !!supportRecordId,
  });

  return {
    supportRecordId,
    supportedProjects: supportedProjects || [],
    isLoading: isLoadingRecord || isLoadingProjects,
    hasRecord: !!supportRecordId,
  };
}

export function useIsSupportingProject(projectId: string) {
  const { supportedProjects } = useSupportRecord();
  const norm = normId(projectId);

  const supportInfo = supportedProjects.find(
    (p) => normId(p.projectId) === norm
  );

  return {
    isSupporting: !!supportInfo,
    supportAmount: supportInfo?.amount || BigInt(0),
    startedAt: supportInfo?.startedAt,
  };
}
