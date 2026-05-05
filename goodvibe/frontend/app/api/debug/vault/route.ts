import { NextResponse } from 'next/server';
import { getSuiClient } from '@/lib/sui/client';  // ✅ 使用 gRPC
import { getUserVault, getVaultAllocations } from '@/lib/sui/queries';
import { PACKAGE_ID, STABLE_COIN_TYPE } from '@/config/sui';

const TEST_ADDRESS =
  '0x006d980cadd43c778e628201b45cfd3ba6e1047c65f67648a88f635108ffd6eb';

export async function GET() {
  if (!PACKAGE_ID) {
    return NextResponse.json(
      { error: 'PACKAGE_ID not configured' },
      { status: 500 }
    );
  }

  try {
    const client = getSuiClient();  // ✅ 使用 gRPC
    const vault = await getUserVault(
      client,
      TEST_ADDRESS,
      PACKAGE_ID,
      STABLE_COIN_TYPE
    );

    if (!vault) {
      return NextResponse.json({
        success: false,
        address: TEST_ADDRESS,
        message: 'No vault found for test address',
      });
    }

    const allocations = await getVaultAllocations(client, vault.id);

    return NextResponse.json({
      success: true,
      address: TEST_ADDRESS,
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
    });
  } catch (error: unknown) {
    const message =
      typeof error === 'object' && error && 'message' in error
        ? String((error as { message: unknown }).message)
        : 'Unknown error';

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}


