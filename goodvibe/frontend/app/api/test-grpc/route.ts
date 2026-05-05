import { getSuiClient, isGrpcEnabled } from '@/lib/sui/client';

/**
 * 在伺服器端執行 gRPC 連線測試，API Key 僅存於伺服器，不暴露給瀏覽器。
 */
export async function GET() {
  const logs: { title: string; content: string; status: string; details?: string }[] = [];

  try {
    const grpcEnabled = isGrpcEnabled();
    logs.push({
      title: 'gRPC Status (Server)',
      content: grpcEnabled ? '✅ Enabled' : '❌ Disabled',
      status: grpcEnabled ? 'success' : 'warning',
    });

    logs.push({
      title: 'Client Type',
      content: 'SuiGrpcClient + JSON-RPC (僅 queryEvents)',
      status: 'info',
    });

    const client = getSuiClient();
    try {
      const objectResult = await client.getObject({
        id: '0x6',
        options: { showContent: true },
      });
      logs.push({
        title: 'Object Query Test',
        content: `✅ Success - Object ID: ${(objectResult.data as { objectId?: string })?.objectId ?? 'N/A'}`,
        status: 'success',
        details: JSON.stringify(objectResult, null, 2).slice(0, 500),
      });
    } catch (objError: any) {
      logs.push({
        title: 'Object Query Test',
        content: `⚠️ Failed: ${objError.message}`,
        status: 'warning',
        details: objError.stack,
      });
    }

    return Response.json({
      status: 'Connected',
      grpcEnabled,
      results: logs,
    });
  } catch (err: any) {
    return Response.json(
      {
        status: 'Error',
        error: err.message,
        results: logs,
      },
      { status: 500 }
    );
  }
}
