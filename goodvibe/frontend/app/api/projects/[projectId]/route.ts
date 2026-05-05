import { NextRequest, NextResponse } from 'next/server';
import { PACKAGE_ID } from '@/config/sui';
import { getSuiClient } from '@/lib/sui/client';  // ✅ 使用 gRPC
import { getProjectById, getProjectUpdates, getProjectSupportersFromEvents } from '@/lib/sui/queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params;

  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  try {
    const client = getSuiClient();  // ✅ 使用 gRPC
    
    // Fetch project details
    const project = await getProjectById(client, projectId, PACKAGE_ID);
    
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Fetch updates
    const updates = await getProjectUpdates(client, projectId, PACKAGE_ID);

    // Fetch supporters
    const supporters = await getProjectSupportersFromEvents(client, PACKAGE_ID, projectId);

    // Serialize BigInt fields
    const response = {
      project: {
        ...project,
        raisedAmount: project.raisedAmount.toString(),
        totalSupportAmount: project.totalSupportAmount?.toString(),
        balance: project.balance?.toString(),
        createdAt: project.createdAt?.toString(),
      },
      updates: updates.map(u => ({
        ...u,
        timestamp: u.timestamp,
      })),
      supporters: supporters.map(s => ({
        ...s,
        amount: s.amount.toString(),
        lastUpdated: s.lastUpdated,
      })),
    };

    return NextResponse.json(response);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
