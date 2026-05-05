/**
 * Sui 查詢函數
 * 使用 getSuiClient() 從 ./client.ts 取得 client（SuiGrpcClient + 相容層）
 */
/** 相容 v2 json（巢狀為純物件）與舊格式（巢狀為 { fields }） */
export function structFields(x: unknown): Record<string, unknown> {
  if (x == null) return {};
  const o = x as Record<string, unknown>;
  return (o?.fields ?? o) as Record<string, unknown>;
}

export function toBigInt(x: unknown): bigint {
  if (x == null) return BigInt(0);
  if (typeof x === 'bigint') return x;
  return BigInt(Number(x));
}

/** queries 所需的 client 介面（由 createCompatClient 提供） */
type SuiQueryClient = {
  getOwnedObjects: (p: any) => Promise<any>;
  getObject: (p: any) => Promise<any>;
  getDynamicFields: (p: any) => Promise<any>;
  getDynamicFieldObject: (p: any) => Promise<any>;
  queryEvents?: (p: any) => Promise<any>;
};

export interface VaultData {
  id: string;
  owner: string;
  balance: bigint;
  globalDonationPercentage: number;
  totalDonated: bigint;
  createdAt: bigint;
}

export interface AllocationConfig {
  projectId: string;
  percentage: number;
  totalDonated: bigint;
  lastDonationAt: bigint;
}

export interface ProjectData {
  id: string;
  title: string;
  description: string;
  category: string;
  imageUrl: string;
  creator: string;
  raisedAmount: bigint;              // total_received
  supporterCount: number;
  totalSupportAmount?: bigint;       // 總支持金額
  balance?: bigint;                  // 當前餘額
  isActive?: boolean;                // 是否活躍
  createdAt?: bigint;                // 創建時間
  coinType?: string;                 // The T in Project<T>
}

/** Extract the coin type T from a Project<T> on-chain type string */
function extractProjectCoinType(objectType: string | undefined): string | undefined {
  if (!objectType) return undefined;
  // Pattern: ...::project::Project<COIN_TYPE>
  const match = objectType.match(/::project::Project<(.+)>$/);
  return match?.[1] ?? undefined;
}

export interface PlatformStatsData {
  totalProjectsCreated: number;
  totalVaultsCreated: number;
  totalValueLocked: bigint;
  createdAt: bigint;
}

/** 將 Move vector<u8> 轉為字串（支援 base64、number[]、Uint8Array） */
function bytesToString(bytes: unknown): string {
  if (bytes == null) return '';
  if (typeof bytes === 'string') {
    try {
      const decoded = atob(bytes);
      return new TextDecoder().decode(Uint8Array.from(decoded, (c) => c.charCodeAt(0)));
    } catch {
      return bytes;
    }
  }
  if (Array.isArray(bytes) || bytes instanceof Uint8Array) {
    return new TextDecoder().decode(new Uint8Array(bytes as Iterable<number>));
  }
  return String(bytes);
}

export async function getUserVault(
  client: SuiQueryClient,
  address: string,
  packageId: string,
  stableCoinType: string
): Promise<VaultData | null> {
  const vaultType = `${packageId}::vault::Vault<${stableCoinType}>`;

  const objects = await client.getOwnedObjects({
    owner: address,
    filter: {
      StructType: vaultType,
    },
    options: {
      showContent: true,
      showType: true,
    },
  });

  if (!objects.data.length) {
    return null;
  }

  const vaultObj = objects.data[0];
  const content = vaultObj.data?.content as any;
  const fields = structFields(content?.fields ?? content);
  if (!Object.keys(fields).length) return null;

  const balanceField = structFields(fields.balance);
  const balanceValue = String(balanceField?.value ?? '0');

  return {
    id: String(vaultObj.data!.objectId ?? ''),
    owner: String(fields.owner ?? ''),
    balance: BigInt(balanceValue),
    globalDonationPercentage: Number(fields.global_donation_percentage ?? 0),
    totalDonated: toBigInt(fields.total_donated),
    createdAt: toBigInt(fields.created_at),
  };
}

export async function getVaultAllocations(
  client: SuiQueryClient,
  vaultId: string
): Promise<AllocationConfig[]> {
  const dynamicFields = await client.getDynamicFields({
    parentId: vaultId,
  });

  const allocations: AllocationConfig[] = [];

  for (const field of dynamicFields.data) {
    try {
      const nameValue = (field as any).name?.value;
      const projectId =
        typeof nameValue === 'string' ? nameValue : nameValue?.toString() ?? '';

      const fieldObj = await client.getDynamicFieldObject({
        parentId: vaultId,
        name: (field as any).name,
      });

      const content = fieldObj.data?.content as any;
      const fields = content?.fields;
      if (!fields) {
        continue;
      }

      allocations.push({
        projectId,
        percentage: Number(fields.percentage ?? 0),
        totalDonated: toBigInt(fields.total_donated),
        lastDonationAt: toBigInt(fields.last_donation_at),
      });
    } catch {
      continue;
    }
  }

  return allocations;
}

export async function getAllProjects(
  client: SuiQueryClient,
  packageId: string
): Promise<ProjectData[]> {
  if (!client.queryEvents) return [];
  const events = await client.queryEvents({
    query: {
      MoveEventType: `${packageId}::project::ProjectCreatedEvent`,
    },
    limit: 50,
  });

  const projects: ProjectData[] = [];

  for (const event of events.data) {
    try {
      const parsed = event.parsedJson as any;
      const projectId = parsed?.project_id;
      if (!projectId) {
        continue;
      }

      // 獲取事件時間戳作為備用
      const eventTimestamp = typeof event.timestampMs === 'string' 
        ? parseInt(event.timestampMs, 10) 
        : (event.timestampMs ?? 0);

      const projectObj = await client.getObject({
        id: projectId,
        options: { showContent: true, showType: true },
      });

      const content = projectObj.data?.content as any;
      const fields = content?.fields;
      if (!fields) {
        continue;
      }

      const metadata = structFields(fields.metadata);
      const financial = structFields(fields.financial);
      const stats = structFields(fields.stats);
      const balanceField = structFields(financial.balance);
      const balanceValue = String(balanceField?.value ?? '0');

      // 優先使用合約的 created_at，如果為 0 則使用事件時間戳
      const contractCreatedAt = toBigInt(stats.created_at);
      const finalCreatedAt = contractCreatedAt > BigInt(0) ? contractCreatedAt : BigInt(eventTimestamp);

      const coinType = extractProjectCoinType(content?.type ?? projectObj.data?.type);

      projects.push({
        id: projectId,
        title: bytesToString(metadata.title),
        description: bytesToString(metadata.description),
        category: bytesToString(metadata.category),
        imageUrl: bytesToString(metadata.cover_image_url),
        creator: fields.creator ?? '',
        raisedAmount: toBigInt(financial.total_received),
        totalSupportAmount: toBigInt(financial.total_support_amount),
        balance: BigInt(balanceValue),
        supporterCount: Number(stats.supporter_count ?? 0),
        isActive: Boolean(stats.is_active ?? true),
        createdAt: finalCreatedAt,
        coinType,
      });
    } catch {
      continue;
    }
  }

  return projects;
}

/** 依 projectId 取得單一專案（與 getAllProjects 相同解析邏輯） */
export async function getProjectById(
  client: SuiQueryClient,
  projectId: string,
  packageId?: string
): Promise<ProjectData | null> {
  try {
    const projectObj = await client.getObject({
      id: projectId,
      options: { showContent: true, showType: true },
    });

    const content = projectObj.data?.content as any;
    const fields = content?.fields;
    if (!fields) return null;

    const metadata = structFields(fields.metadata);
    const financial = structFields(fields.financial);
    const stats = structFields(fields.stats);
    const balanceField = structFields(financial.balance);
    const balanceValue = String(balanceField?.value ?? '0');
    const coinType = extractProjectCoinType(content?.type ?? projectObj.data?.type);

    // 獲取 created_at，如果為 0 則嘗試從事件獲取
    let finalCreatedAt = toBigInt(stats.created_at);
    
    if (finalCreatedAt === BigInt(0) && packageId && client.queryEvents) {
      try {
        const events = await client.queryEvents({
          query: {
            MoveEventType: `${packageId}::project::ProjectCreatedEvent`,
          },
          limit: 50,
        });
        
        const projectEvent = events.data.find((e: any) => {
          const parsed = e.parsedJson as any;
          return parsed?.project_id === projectId;
        });
        
        if (projectEvent) {
          const eventTimestamp = typeof projectEvent.timestampMs === 'string' 
            ? parseInt(projectEvent.timestampMs, 10) 
            : (projectEvent.timestampMs ?? 0);
          finalCreatedAt = BigInt(eventTimestamp);
        }
      } catch {
        // 忽略事件查詢錯誤
      }
    }

    return {
      id: projectId,
      title: bytesToString(metadata.title),
      description: bytesToString(metadata.description),
      category: bytesToString(metadata.category),
      imageUrl: bytesToString(metadata.cover_image_url),
      creator: fields.creator ?? '',
      raisedAmount: toBigInt(financial.total_received),
      totalSupportAmount: toBigInt(financial.total_support_amount),
      balance: BigInt(balanceValue),
      supporterCount: Number(stats.supporter_count ?? 0),
      isActive: Boolean(stats.is_active ?? true),
      createdAt: finalCreatedAt,
      coinType,
    };
  } catch {
    return null;
  }
}

export async function getPlatformStats(
  client: SuiQueryClient,
  platformId: string
): Promise<PlatformStatsData | null> {
  const platform = await client.getObject({
    id: platformId,
    options: { showContent: true },
  });

  const content = platform.data?.content as any;
  const fields = structFields(content?.fields ?? content);
  if (!Object.keys(fields).length) return null;

  return {
    totalProjectsCreated: Number(fields.total_projects_created ?? 0),
    totalVaultsCreated: Number(fields.total_vaults_created ?? 0),
    totalValueLocked: toBigInt(fields.total_value_locked),
    createdAt: toBigInt(fields.created_at),
  };
}

export interface SupportBadge {
  projectId: string;
  projectName: string;
  donationAmount: bigint;
  donatedAt: bigint;
}

export async function getUserSupportRecord(
  client: SuiQueryClient,
  address: string,
  packageId: string
): Promise<string | null> {
  const recordType = `${packageId}::support_record::SupportRecord`;

  const objects = await client.getOwnedObjects({
    owner: address,
    filter: {
      StructType: recordType,
    },
    options: {
      showContent: true,
      showType: true,
    },
  });

  if (!objects.data.length) {
    return null;
  }

  return objects.data[0].data!.objectId;
}

export async function getSupportRecordBadges(
  client: SuiQueryClient,
  recordId: string
): Promise<SupportBadge[]> {
  const dynamicFields = await client.getDynamicFields({
    parentId: recordId,
  });

  const badges: SupportBadge[] = [];

  for (const field of dynamicFields.data) {
    try {
      const nameValue = (field as any).name?.value;
      const projectId =
        typeof nameValue === 'string' ? nameValue : nameValue?.toString() ?? '';

      const fieldObj = await client.getDynamicFieldObject({
        parentId: recordId,
        name: (field as any).name,
      });

      const content = fieldObj.data?.content as any;
      const fields = structFields(content?.fields ?? content);
      if (!Object.keys(fields).length) continue;

      badges.push({
        projectId,
        projectName: bytesToString(fields.project_name),
        donationAmount: toBigInt(fields.donation_amount),
        donatedAt: toBigInt(fields.donated_at),
      });
    } catch {
      continue;
    }
  }

  return badges;
}

// ==================== Project supporters (from events) ====================

export interface ProjectSupporter {
  address: string;
  amount: bigint;
  lastUpdated: number;
}

const SUPPORT_EVENT_TYPES = [
  'SupportStartedEvent',
  'SupportIncreasedEvent',
  'SupportDecreasedEvent',
  'SupportEndedEvent',
] as const;

/** 從鏈上事件彙總單一專案的支持者列表（地址、當前金額、最後更新時間） */
export async function getProjectSupportersFromEvents(
  client: SuiQueryClient,
  packageId: string,
  projectId: string
): Promise<ProjectSupporter[]> {
  const baseType = `${packageId}::project::`;
  const allEvents: Array<{ type: string; parsed: any; timestamp: number }> = [];

  if (!client.queryEvents) return [];
  for (const eventType of SUPPORT_EVENT_TYPES) {
    try {
      const fullType = baseType + eventType;
      const res = await client.queryEvents({
        query: { MoveEventType: fullType },
        limit: 100,
        order: 'ascending',
      });
      let matchedCount = 0;
      for (const e of res.data) {
        const parsed = e.parsedJson as any;
        if (parsed?.project_id !== projectId) continue;
        matchedCount++;
        // 使用事件實際發生的時間（timestampMs），而不是事件內的 timestamp
        const ts = typeof e.timestampMs === 'string' ? parseInt(e.timestampMs, 10) : (e.timestampMs ?? 0);
        allEvents.push({ type: eventType, parsed, timestamp: ts });
      }
    } catch {
      continue;
    }
  }

  if (allEvents.length === 0) {
    return [];
  }

  allEvents.sort((a, b) => a.timestamp - b.timestamp);

  const current: Record<string, { amount: bigint; lastUpdated: number }> = {};
  for (const { type, parsed, timestamp } of allEvents) {
    const addr = parsed?.supporter ?? '';
    if (!addr) continue;
    switch (type) {
      case 'SupportStartedEvent':
        current[addr] = { amount: BigInt(parsed.amount ?? 0), lastUpdated: timestamp };
        break;
      case 'SupportIncreasedEvent':
        current[addr] = { amount: BigInt(parsed.new_total ?? 0), lastUpdated: timestamp };
        break;
      case 'SupportDecreasedEvent':
        current[addr] = { amount: BigInt(parsed.new_total ?? 0), lastUpdated: timestamp };
        break;
      case 'SupportEndedEvent':
        delete current[addr];
        break;
    }
  }
  const supporters = Object.entries(current)
    .filter(([, v]) => v.amount > BigInt(0))
    .map(([address, v]) => ({ address, amount: v.amount, lastUpdated: v.lastUpdated }))
    .sort((a, b) => b.lastUpdated - a.lastUpdated);
  return supporters;
}

// ==================== Project updates (dynamic fields) ====================

export interface ProjectUpdateData {
  id: string;
  title: string;
  content: string;
  timestamp: number;
  author: string;
}

/** 取得專案的所有進度更新（從事件獲取時間戳 + dynamic fields 獲取內容） */
export async function getProjectUpdates(
  client: SuiQueryClient,
  projectId: string,
  packageId?: string
): Promise<ProjectUpdateData[]> {
  try {
    if (!client.queryEvents) return [];
    // 首先從事件獲取時間戳映射
    const pkgId = packageId || process.env.NEXT_PUBLIC_PACKAGE_ID || '';
    const eventType = `${pkgId}::project::UpdatePostedEvent`;
    
    const eventsRes = await client.queryEvents({
      query: { MoveEventType: eventType },
      limit: 100,
      order: 'descending',
    });
    
    // 建立 updateId -> eventTimestamp 的映射
    const timestampMap: Record<string, number> = {};
    for (const event of eventsRes.data) {
      const parsed = event.parsedJson as any;
      if (parsed?.project_id !== projectId) continue;
      
      // 解析 update_id（可能是 byte array）
      const updateIdBytes = parsed.update_id;
      const updateId = Array.isArray(updateIdBytes) 
        ? new TextDecoder().decode(new Uint8Array(updateIdBytes))
        : String(updateIdBytes);
      
      // 使用事件實際發生的時間
      const eventTimestamp = typeof event.timestampMs === 'string' 
        ? parseInt(event.timestampMs, 10) 
        : (event.timestampMs ?? 0);
      
      if (eventTimestamp > 0) {
        timestampMap[updateId] = eventTimestamp;
      }
    }
    const dynamicFields = await client.getDynamicFields({
      parentId: projectId,
    });
    const updates: ProjectUpdateData[] = [];

    for (const field of dynamicFields.data) {
      try {
        const fieldMeta = field as any;
        const name = fieldMeta.name;
        
        // 解析 updateId (用於識別和排序)
        let updateId: string;
        if (typeof name === 'string') {
          updateId = name;
        } else if (name && typeof name === 'object') {
          const nameVal = name.value ?? name;
          if (typeof nameVal === 'string') {
            updateId = nameVal;
          } else if (Array.isArray(nameVal)) {
            updateId = new TextDecoder().decode(new Uint8Array(nameVal));
          } else {
            updateId = String(nameVal);
          }
        } else {
          continue;
        }
        
        // 重要：使用 objectId 直接獲取對象，而不是用 getDynamicFieldObject
        // 因為 getDynamicFieldObject 可能會有緩存問題
        const fieldObjectId = fieldMeta.objectId;
        if (!fieldObjectId) {
          console.warn(`[getProjectUpdates] Missing objectId for updateId: ${updateId}`);
          continue;
        }
        
        const fieldObj = await client.getObject({
          id: fieldObjectId,
          options: { showContent: true },
        });
        if (!fieldObj.data) {
          console.warn(`[getProjectUpdates] No data for objectId: ${fieldObjectId}`);
          continue;
        }
        
        const content = fieldObj.data.content as any;
        if (!content || content.dataType !== 'moveObject') {
          console.warn(`[getProjectUpdates] Invalid content for updateId: ${updateId}`);
          continue;
        }
        
        const fields = structFields(content?.fields ?? content);
        if (!Object.keys(fields).length) {
          console.warn(`[getProjectUpdates] No fields for updateId: ${updateId}`);
          continue;
        }
        const updateData = structFields(fields.value);
        if (!Object.keys(updateData).length) {
          console.warn(`[getProjectUpdates] Missing value for updateId: ${updateId}`, fields);
          continue;
        }
        
        const title = bytesToString(updateData.title);
        const body = bytesToString(updateData.content);
        const author = String(updateData.author ?? '');
        const timestamp = timestampMap[updateId] ?? Number(updateData.timestamp ?? 0);
        updates.push({
          id: updateId,
          title,
          content: body,
          timestamp,
          author,
        });
      } catch {
        continue;
      }
    }
    updates.sort((a, b) => b.timestamp - a.timestamp);
    return updates;
  } catch {
    return [];
  }
}

// ==================== ProjectCap ====================

/** 取得當前用戶對某專案的 ProjectCap object id（若有） */
export async function getProjectCapForProject(
  client: SuiQueryClient,
  ownerAddress: string,
  projectId: string,
  packageId: string
): Promise<string | null> {
  const objects = await client.getOwnedObjects({
    owner: ownerAddress,
    filter: { StructType: `${packageId}::project::ProjectCap` },
    options: { showContent: true },
  });

  const cap = objects.data.find((obj: { data?: { content?: unknown } }) => {
    const content = obj.data?.content as { fields?: { project_id?: string } } | undefined;
    const fields = structFields(content?.fields ?? content);
    return fields?.project_id === projectId;
  });

  return cap?.data?.objectId ?? null;
}
