'use client';

import { useQuery } from '@tanstack/react-query';
import { bcs, TypeTagSerializer } from '@mysten/sui/bcs';
import type { SuiClientTypes } from '@mysten/sui/client';
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { deriveDynamicFieldID, SUI_ADDRESS_LENGTH } from '@mysten/sui/utils';
import {
  STABLE_REGISTRY_MAINNET,
  STABLE_REGISTRY_TESTNET,
  STABLE_LAYER_PACKAGE_MAINNET,
  STABLE_LAYER_PACKAGE_MAINNET_ALT,
  STABLE_LAYER_PACKAGE_TESTNET,
  STABLE_REGISTRY_MAINNET_ALT,
} from '@/lib/coin-publisher/constants';

const GRPC_URLS: Record<string, string> = {
  testnet: 'https://fullnode.testnet.sui.io:443',
  mainnet: 'https://fullnode.mainnet.sui.io:443',
};

export interface ManageableCoin {
  id: string;
  factoryCapId: string;
  stableType: string;
  usdType: string;
  name: string;
  symbol: string;
  iconUrl: string | null;
  maxSupply: string;
  totalSupply: string;
  registry: string;
  network: 'mainnet' | 'testnet';
}

const WRAPPED_TYPE_TAG = TypeTagSerializer.parseFromStr(
  '0x0000000000000000000000000000000000000000000000000000000000000002::dynamic_object_field::Wrapper<0x0000000000000000000000000000000000000000000000000000000000000001::type_name::TypeName>',
);
const TypeName = bcs.struct('TypeName', { name: bcs.string() });

function parseFactoryCapTypeParams(type: string): { stable: string; usd: string } | null {
  const prefix = '::FactoryCap<';
  const idx = type.indexOf(prefix);
  if (idx === -1) return null;
  const start = idx + prefix.length;
  let depth = 0;
  let commaPos = -1;
  for (let i = start; i < type.length; i++) {
    if (type[i] === '<') depth++;
    else if (type[i] === '>') {
      depth--;
      if (depth < 0) break;
    } else if (type[i] === ',' && depth === 0) {
      commaPos = i;
      break;
    }
  }
  if (commaPos === -1) return null;
  const endBracket = type.lastIndexOf('>');
  const stable = type.slice(start, commaPos).trim();
  const usd = type.slice(commaPos + 1, endBracket).trim();
  return { stable, usd };
}

interface FactoryCapEntry {
  objectId: string;
  stable: string;
  usd: string;
  nameBcs: Uint8Array;
  fieldId: string;
}

async function fetchManageableCoins(
  owner: string,
  network: 'mainnet' | 'testnet',
): Promise<ManageableCoin[]> {
  const registry =
    network === 'mainnet' ? STABLE_REGISTRY_MAINNET : STABLE_REGISTRY_TESTNET;
  const packageId =
    network === 'mainnet'
      ? registry === STABLE_REGISTRY_MAINNET_ALT
        ? STABLE_LAYER_PACKAGE_MAINNET_ALT
        : STABLE_LAYER_PACKAGE_MAINNET
      : STABLE_LAYER_PACKAGE_TESTNET;

  if (!registry) return [];

  const client = new SuiGrpcClient({
    network,
    baseUrl: GRPC_URLS[network] ?? GRPC_URLS.mainnet,
  });

  const caps: FactoryCapEntry[] = [];
  let cursor: string | null = null;
  const factoryCapType = `${packageId}::stable_layer::FactoryCap`;

  do {
    const result: SuiClientTypes.ListOwnedObjectsResponse =
      await client.core.listOwnedObjects({
        owner,
        type: factoryCapType,
        limit: 50,
        cursor,
      });

    for (const o of result.objects) {
      if (!o.type) continue;
      const params = parseFactoryCapTypeParams(o.type);
      if (!params) continue;

      const nameBcs = TypeName.serialize({
        name: params.stable.startsWith('0x')
          ? params.stable.slice(2)
          : params.stable,
      }).toBytes();

      caps.push({
        objectId: o.objectId,
        stable: params.stable,
        usd: params.usd,
        nameBcs,
        fieldId: deriveDynamicFieldID(registry, WRAPPED_TYPE_TAG, nameBcs),
      });
    }

    cursor = result.hasNextPage ? result.cursor : null;
  } while (cursor);

  if (caps.length === 0) return [];

  const fieldResults = await client.core.getObjects({
    objectIds: caps.map((c) => c.fieldId),
    include: { content: true },
  });

  const childIds: (string | null)[] = fieldResults.objects.map((obj, i) => {
    if (obj instanceof Error || !obj.content) return null;
    try {
      const content = obj.content as Uint8Array;
      const valueBcs = content.slice(SUI_ADDRESS_LENGTH + caps[i].nameBcs.length);
      return bcs.Address.parse(valueBcs);
    } catch {
      return null;
    }
  });

  const validChildIndices: number[] = [];
  const validChildIds: string[] = [];
  childIds.forEach((id, i) => {
    if (id) {
      validChildIndices.push(i);
      validChildIds.push(id);
    }
  });

  const [factoryResults, ...metadataResults] = await Promise.all([
    validChildIds.length > 0
      ? client.core.getObjects({
          objectIds: validChildIds,
          include: { json: true },
        })
      : Promise.resolve({ objects: [] as (SuiClientTypes.Object<{ json: true }> | Error)[] }),
    ...caps.map((cap) =>
      client.core
        .getCoinMetadata({ coinType: cap.stable })
        .catch((): SuiClientTypes.GetCoinMetadataResponse => ({ coinMetadata: null })),
    ),
  ]);

  const factoryJsonByIndex = new Map<number, Record<string, unknown>>();
  validChildIndices.forEach((capIdx, j) => {
    const obj = factoryResults.objects[j];
    if (!(obj instanceof Error) && obj?.json) {
      factoryJsonByIndex.set(capIdx, obj.json as Record<string, unknown>);
    }
  });

  return caps.map((cap, i) => {
    const metadata = metadataResults[i]?.coinMetadata ?? null;
    const factoryJson = factoryJsonByIndex.get(i) ?? null;

    const maxSupply =
      factoryJson?.max_supply != null ? String(factoryJson.max_supply) : '0';
    const treasuryCap = factoryJson?.treasury_cap as
      | { total_supply?: { value?: string } }
      | undefined;
    const totalSupply =
      treasuryCap?.total_supply?.value != null
        ? String(treasuryCap.total_supply.value)
        : '0';

    return {
      id: cap.objectId,
      factoryCapId: cap.objectId,
      stableType: cap.stable,
      usdType: cap.usd,
      name: metadata?.name ?? 'Unknown',
      symbol: metadata?.symbol ?? '?',
      iconUrl: metadata?.iconUrl ?? null,
      maxSupply,
      totalSupply,
      registry,
      network,
    };
  });
}

export function useManageableCoins(
  owner: string | null,
  deployNetwork: 'mainnet' | 'testnet',
) {
  return useQuery({
    queryKey: ['manageable-coins', owner ?? '', deployNetwork],
    queryFn: () => (owner ? fetchManageableCoins(owner, deployNetwork) : []),
    enabled: !!owner,
  });
}
