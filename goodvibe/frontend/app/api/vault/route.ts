import { NextResponse } from 'next/server';
import { getSuiClient } from '@/lib/sui/client';  // ✅ 使用 gRPC
import { getUserVault, getVaultAllocations } from '@/lib/sui/queries';
import { PACKAGE_ID, STABLE_COIN_TYPE } from '@/config/sui';

type VaultResponse = {
  vault: {
    id: string;
    owner: string;
    balance: string;
    globalDonationPercentage: number;
    totalDonated: string;
    createdAt: string;
  };
  allocations: Array<{
    projectId: string;
    percentage: number;
    totalDonated: string;
    lastDonationAt: string;
  }>;
  stats: {
    estimatedAnnualYield: string;
    donationPool: string;
    retainedYield: string;
    activeProjects: number;
  };
};

const MOCK_VAULT_DATA = {
  vault: {
    id: 'mock-vault-1',
    owner: 'mock-owner-address',
    balance: BigInt(10000_000_000),
    globalDonationPercentage: 50,
    totalDonated: BigInt(2600_000_000),
    createdAt: BigInt(Date.now() - 90 * 24 * 60 * 60 * 1000),
  },
  allocations: [
    {
      projectId: 'mock-1',
      percentage: 40,
      totalDonated: BigInt(1040_000_000),
      lastDonationAt: BigInt(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
    {
      projectId: 'mock-2',
      percentage: 35,
      totalDonated: BigInt(910_000_000),
      lastDonationAt: BigInt(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
    {
      projectId: 'mock-3',
      percentage: 25,
      totalDonated: BigInt(650_000_000),
      lastDonationAt: BigInt(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
  ],
  stats: {
    estimatedAnnualYield: BigInt(520_000_000),
    donationPool: BigInt(260_000_000),
    retainedYield: BigInt(260_000_000),
    activeProjects: 3,
  },
};

let cachedData: VaultResponse | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 60 * 1000;

function calculateStats(
  balance: bigint,
  globalPercentage: number,
  allocationsCount: number
) {
  const balanceNumber = Number(balance);
  const estimatedAnnualYield = BigInt(
    Math.floor((balanceNumber * 52) / 1000)
  );
  const donationPool = BigInt(
    Math.floor(
      Number(estimatedAnnualYield) * (globalPercentage / 100)
    )
  );
  const retainedYield = estimatedAnnualYield - donationPool;

  return {
    estimatedAnnualYield,
    donationPool,
    retainedYield,
    activeProjects: allocationsCount,
  };
}

export async function GET(request: Request) {
  const now = Date.now();
  const { searchParams } = new URL(request.url);
  const userAddress = searchParams.get('address');

  if (cachedData && now - lastFetchTime < CACHE_TTL) {
    return NextResponse.json(cachedData);
  }

  try {
    if (!userAddress || !PACKAGE_ID) {
      const vaultData: VaultResponse = {
        vault: {
          id: MOCK_VAULT_DATA.vault.id,
          owner: MOCK_VAULT_DATA.vault.owner,
          balance: MOCK_VAULT_DATA.vault.balance.toString(),
          globalDonationPercentage:
            MOCK_VAULT_DATA.vault.globalDonationPercentage,
          totalDonated: MOCK_VAULT_DATA.vault.totalDonated.toString(),
          createdAt: MOCK_VAULT_DATA.vault.createdAt.toString(),
        },
        allocations: MOCK_VAULT_DATA.allocations.map((a) => ({
          projectId: a.projectId,
          percentage: a.percentage,
          totalDonated: a.totalDonated.toString(),
          lastDonationAt: a.lastDonationAt.toString(),
        })),
        stats: {
          estimatedAnnualYield:
            MOCK_VAULT_DATA.stats.estimatedAnnualYield.toString(),
          donationPool: MOCK_VAULT_DATA.stats.donationPool.toString(),
          retainedYield: MOCK_VAULT_DATA.stats.retainedYield.toString(),
          activeProjects: MOCK_VAULT_DATA.stats.activeProjects,
        },
      };

      cachedData = vaultData;
      lastFetchTime = now;
      return NextResponse.json(vaultData);
    }

    const client = getSuiClient();  // ✅ 使用 gRPC
    const vault = await getUserVault(
      client,
      userAddress,
      PACKAGE_ID,
      STABLE_COIN_TYPE
    );

    if (!vault) {
      return NextResponse.json(
        { error: 'Vault not found' },
        { status: 404 }
      );
    }

    const allocations = await getVaultAllocations(client, vault.id);
    const stats = calculateStats(
      vault.balance,
      vault.globalDonationPercentage,
      allocations.length
    );

    const vaultData: VaultResponse = {
      vault: {
        id: vault.id,
        owner: vault.owner,
        balance: vault.balance.toString(),
        globalDonationPercentage: vault.globalDonationPercentage,
        totalDonated: vault.totalDonated.toString(),
        createdAt: vault.createdAt.toString(),
      },
      allocations: allocations.map((a) => ({
        projectId: a.projectId,
        percentage: a.percentage,
        totalDonated: a.totalDonated.toString(),
        lastDonationAt: a.lastDonationAt.toString(),
      })),
      stats: {
        estimatedAnnualYield: stats.estimatedAnnualYield.toString(),
        donationPool: stats.donationPool.toString(),
        retainedYield: stats.retainedYield.toString(),
        activeProjects: stats.activeProjects,
      },
    };

    cachedData = vaultData;
    lastFetchTime = now;

    return NextResponse.json(vaultData);
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch vault data' },
      { status: 500 }
    );
  }
}

