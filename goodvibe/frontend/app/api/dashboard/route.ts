import { NextResponse } from 'next/server';
import { getSuiClient } from '@/lib/sui/client';  // ✅ 使用 gRPC
import { getUserSupportRecord, getSupportRecordBadges } from '@/lib/sui/queries';
import { PACKAGE_ID } from '@/config/sui';

type DashboardResponse = {
  supportedProjects: Array<{
    projectId: string;
    projectName: string;
    donationAmount: string;
  }>;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userAddress = searchParams.get('address');

  try {
    if (!userAddress || !PACKAGE_ID) {
      return NextResponse.json({
        supportedProjects: [],
      });
    }

    const client = getSuiClient();  // ✅ 使用 gRPC
    const recordId = await getUserSupportRecord(client, userAddress, PACKAGE_ID);

    if (!recordId) {
      return NextResponse.json({
        supportedProjects: [],
      });
    }

    const badges = await getSupportRecordBadges(client, recordId);

    const dashboardData: DashboardResponse = {
      supportedProjects: badges.map((b) => ({
        projectId: b.projectId,
        projectName: b.projectName,
        donationAmount: b.donationAmount.toString(),
      })),
    };

    return NextResponse.json(dashboardData);
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data', supportedProjects: [] },
      { status: 500 }
    );
  }
}
