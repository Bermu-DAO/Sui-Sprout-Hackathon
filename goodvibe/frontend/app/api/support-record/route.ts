import { NextRequest, NextResponse } from 'next/server';
import { getSuiClient } from '@/lib/sui/client';  // ✅ 使用 gRPC
import { getUserSupportRecord, getSupportRecordBadges } from '@/lib/sui/queries';
import { PACKAGE_ID } from '@/config/sui';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    const client = getSuiClient();  // ✅ 使用 gRPC
    const recordId = await getUserSupportRecord(client, address, PACKAGE_ID);

    if (!recordId) {
      return NextResponse.json({ recordId: null, badges: [] });
    }

    const badges = await getSupportRecordBadges(client, recordId);

    return NextResponse.json({
      recordId,
      badges: badges.map(b => ({
        projectId: b.projectId,
        projectName: b.projectName,
        donationAmount: b.donationAmount.toString(),
        donatedAt: b.donatedAt.toString(),
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch support record' },
      { status: 500 }
    );
  }
}
