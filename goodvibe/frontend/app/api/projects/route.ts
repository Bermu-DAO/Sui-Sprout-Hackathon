import { NextResponse } from 'next/server';
import { PACKAGE_ID } from '@/config/sui';
import { Project } from '@/types/project';
import { getSuiClient } from '@/lib/sui/client';  // ✅ 改用 getSuiClient（自動選擇 gRPC）
import { getAllProjects } from '@/lib/sui/queries';

// Simple in-memory cache
let cachedProjects: Project[] | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 10 * 1000; // 10 seconds

export async function GET() {
    const now = Date.now();
    if (cachedProjects && (now - lastFetchTime < CACHE_TTL)) {
        const serializedProjects = cachedProjects.map(p => ({
            ...p,
            raisedAmount: p.raisedAmount.toString(),
        }));
        return NextResponse.json(serializedProjects);
    }

    try {
        let realProjects: Project[] = [];

        // Prioritize real chain data if PACKAGE_ID is configured
        if (PACKAGE_ID) {
            try {
                const client = getSuiClient();  // ✅ 使用 gRPC（如已設定）
                const chainProjects = await getAllProjects(client, PACKAGE_ID);
                // Filter: only include projects created with the upgraded contract
                // Old projects used btcUSDC, new ones use branded coins (e.g. FINALUSDC)
                const LEGACY_COIN = '0x6d9fc33611f4881a3f5c0cd4899d95a862236ce52b3a38fef039077b0c5b5834::btc_usdc::BtcUSDC';
                realProjects = chainProjects
                    .filter((p) => p.coinType && p.coinType !== LEGACY_COIN)
                    .map((p) => ({
                        id: p.id,
                        title: p.title,
                        description: p.description,
                        category: p.category,
                        imageUrl: p.imageUrl,
                        creator: p.creator,
                        raisedAmount: p.totalSupportAmount || p.raisedAmount,
                        totalSupportAmount: p.totalSupportAmount,
                        supporterCount: p.supporterCount,
                        createdAt: p.createdAt,
                        isActive: p.isActive,
                        balance: p.balance,
                        coinType: p.coinType,
                    }));
            } catch (err) {
                console.warn('[api/projects] getAllProjects failed:', err instanceof Error ? err.message : err);
            }
        }

        cachedProjects = realProjects;
        lastFetchTime = now;

        const serializedProjects = realProjects.map(p => ({
            ...p,
            raisedAmount: p.raisedAmount.toString(),
            totalSupportAmount: p.totalSupportAmount?.toString(),
            createdAt: p.createdAt?.toString(),
            balance: p.balance?.toString(),
        }));
        return NextResponse.json(serializedProjects);
    } catch (err) {
        console.warn('[api/projects] GET failed:', err instanceof Error ? err.message : err);
        return NextResponse.json([]);
    }
}
