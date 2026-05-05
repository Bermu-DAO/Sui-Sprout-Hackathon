import { NextRequest, NextResponse } from 'next/server';
import { getSuiClient } from '@/lib/sui/client';
import { PACKAGE_ID } from '@/config/sui';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  const client = getSuiClient();

  try {
    const eventTypes = [
      'SupportStartedEvent',
      'SupportIncreasedEvent',
      'SupportDecreasedEvent',
      'SupportEndedEvent',
    ];

    const results: any = {};

    for (const eventType of eventTypes) {
      try {
        const res = await client.queryEvents({
          query: { MoveEventType: `${PACKAGE_ID}::project::${eventType}` },
          limit: 50,
          order: 'descending',
        });
        const projectEvents = res.data.filter((e: any) => {
          const parsed = e.parsedJson as any;
          return parsed?.project_id === projectId;
        });
        results[eventType] = {
          total: res.data.length,
          forThisProject: projectEvents.length,
          events: projectEvents.map((e: any) => ({
            id: e.id,
            timestamp: e.timestampMs,
            parsedJson: e.parsedJson,
          })),
        };
      } catch (err: any) {
        results[eventType] = {
          error: err.message,
        };
      }
    }

    return NextResponse.json({
      projectId,
      packageId: PACKAGE_ID,
      results,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
