import { NextResponse } from 'next/server';
import { getSuiClient } from '@/lib/sui/client';  // ✅ 使用 gRPC
import { getPlatformStats, getAllProjects } from '@/lib/sui/queries';
import { PLATFORM_ID, PACKAGE_ID } from '@/config/sui';

type StatsResponse = {
  totalProjectsCreated: number;
  totalVaultsCreated: number;
  totalValueLocked: string;
  totalDonated: string;
  activeProjects: number;
  activeDonors: number;
  createdAt: string;
};

const MOCK_PLATFORM_STATS: StatsResponse = {
  totalProjectsCreated: 12,
  totalVaultsCreated: 156,
  totalValueLocked: BigInt(1_500_000_000_000).toString(),
  totalDonated: BigInt(78_000_000_000).toString(),
  activeProjects: 12,
  activeDonors: 156,
  createdAt: BigInt(Date.now() - 180 * 24 * 60 * 60 * 1000).toString(),
};

let cachedStats: StatsResponse | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

export async function GET() {
  const now = Date.now();

  if (cachedStats && now - lastFetchTime < CACHE_TTL) {
    return NextResponse.json(cachedStats);
  }

  try {
    // Fallback to mock if PLATFORM_ID is not configured
    if (!PLATFORM_ID) {
      cachedStats = MOCK_PLATFORM_STATS;
      lastFetchTime = now;
      return NextResponse.json(MOCK_PLATFORM_STATS);
    }

    const client = getSuiClient();  // ✅ 使用 gRPC
    const platformStats = await getPlatformStats(client, PLATFORM_ID);

    if (!platformStats) {
      // Platform not found, fallback to mock
      cachedStats = MOCK_PLATFORM_STATS;
      lastFetchTime = now;
      return NextResponse.json(MOCK_PLATFORM_STATS);
    }

    // Calculate activeProjects from chain if PACKAGE_ID is available
    let activeProjects = MOCK_PLATFORM_STATS.activeProjects;
    if (PACKAGE_ID) {
      try {
        const projects = await getAllProjects(client, PACKAGE_ID);
        // Count projects with raisedAmount > 0 as active
        activeProjects = projects.filter(p => p.raisedAmount > BigInt(0)).length;
      } catch {
        // If query fails, use mock value
        activeProjects = MOCK_PLATFORM_STATS.activeProjects;
      }
    }

    // Calculate totalDonated from all vaults' totalDonated
    // Note: This would require querying all vaults, which is expensive
    // For now, we use mock value. In production, consider caching this or
    // adding it to the platform object
    const totalDonated = MOCK_PLATFORM_STATS.totalDonated;

    // activeDonors would require querying all vaults with allocations
    // For now, use mock value
    const activeDonors = MOCK_PLATFORM_STATS.activeDonors;

    const statsData: StatsResponse = {
      totalProjectsCreated: platformStats.totalProjectsCreated,
      totalVaultsCreated: platformStats.totalVaultsCreated,
      totalValueLocked: platformStats.totalValueLocked.toString(),
      totalDonated,
      activeProjects,
      activeDonors,
      createdAt: platformStats.createdAt.toString(),
    };

    cachedStats = statsData;
    lastFetchTime = now;

    return NextResponse.json(statsData);
  } catch {
    // On error, fallback to mock data
    cachedStats = MOCK_PLATFORM_STATS;
    lastFetchTime = now;
    return NextResponse.json(MOCK_PLATFORM_STATS);
  }
}

