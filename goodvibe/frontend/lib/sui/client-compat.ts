/**
 * 相容層：將 SuiGrpcClient v2 API 轉為 queries 期望的格式
 * 僅保留此精簡層，直接使用 SuiGrpcClient
 */
import { bcs } from '@mysten/sui/bcs';
import type { SuiGrpcClient } from '@mysten/sui/grpc';
import type { SuiJsonRpcClient } from '@mysten/sui/jsonRpc';

const WRAPPED_PREFIX = '0x2::dynamic_object_field::Wrapper<';

function tryDecodeId(bytes: Uint8Array): string | undefined {
  try {
    if (bytes?.length === 32) return bcs.Address.parse(bytes);
    return undefined;
  } catch {
    return undefined;
  }
}

function toQueryObject(obj: { objectId: string; type: string; json?: Record<string, unknown> | null }) {
  if (!obj) return { data: { objectId: '', type: '' } };
  const fields = obj.json ?? {};
  const content =
    obj.type && obj.type !== 'package'
      ? {
          dataType: 'moveObject' as const,
          type: obj.type,
          hasPublicTransfer: false,
          fields,
        }
      : undefined;
  return {
    data: {
      objectId: obj.objectId,
      type: obj.type,
      ...(content && { content }),
    },
  };
}

export function createCompatClient(
  grpcClient: SuiGrpcClient,
  /** 僅用於 queryEvents（gRPC 無此 API） */
  jsonRpcClient: { queryEvents: (params: any) => Promise<any> }
) {
  return {
    async getObject(params: { id: string; options?: { showContent?: boolean } }) {
      const res = await grpcClient.getObject({
        objectId: params.id,
        include: params.options?.showContent ? { json: true } : undefined,
      });
      return toQueryObject(res.object);
    },

    async getOwnedObjects(params: any) {
      const res = await grpcClient.listOwnedObjects({
        owner: params.owner,
        type: params.filter?.StructType,
        include: params.options?.showContent ? { json: true } : undefined,
        limit: params.limit,
        cursor: params.cursor,
      });
      return {
        data: res.objects.map((o) => ({ data: toQueryObject(o).data })),
        nextCursor: res.cursor ?? undefined,
        hasNextPage: res.hasNextPage,
      };
    },

    async getDynamicFields(params: { parentId: string; cursor?: string; limit?: number }) {
      const res = await grpcClient.listDynamicFields({
        parentId: params.parentId,
        cursor: params.cursor ?? undefined,
        limit: params.limit,
      });
      return {
        data: res.dynamicFields.map((f: any) => {
          const name = f.name ?? {};
          return {
            objectId: f.fieldId ?? f.childId,
            name: {
              ...name,
              value: name.bcs ? tryDecodeId(name.bcs) : undefined,
            },
            objectType: f.type,
          };
        }),
        nextCursor: res.cursor ?? undefined,
        hasNextPage: res.hasNextPage,
      };
    },

    async getDynamicFieldObject(params: { parentId: string; name: { type: string; value?: unknown; bcs?: Uint8Array } }) {
      const name = params.name as { type: string; bcs: Uint8Array };
      if (!name.bcs) throw new Error('getDynamicFieldObject requires name.bcs');
      const wrappedType = name.type.startsWith(WRAPPED_PREFIX)
        ? name.type
        : `${WRAPPED_PREFIX}${name.type}>`;
      const { dynamicField } = await grpcClient.getDynamicField({
        parentId: params.parentId,
        name: { type: wrappedType, bcs: name.bcs },
      });
      const childId = bcs.Address.parse(dynamicField.value.bcs);
      const { object } = await grpcClient.getObject({
        objectId: childId,
        include: { json: true },
      });
      return toQueryObject(object);
    },

    async queryEvents(params: any) {
      return jsonRpcClient.queryEvents(params);
    },

    async waitForTransaction(opts: { digest: string }) {
      return grpcClient.waitForTransaction({ digest: opts.digest });
    },

    /** Stable Layer SDK、projectTx 等需用 */
    async listCoins(params: { owner: string; coinType?: string; limit?: number; cursor?: string | null }) {
      return grpcClient.listCoins({
        owner: params.owner,
        coinType: params.coinType,
        limit: params.limit,
        cursor: params.cursor ?? undefined,
      });
    },
  };
}
