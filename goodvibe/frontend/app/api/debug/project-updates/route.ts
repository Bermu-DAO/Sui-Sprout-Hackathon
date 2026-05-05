import { NextRequest, NextResponse } from 'next/server';
import { getSuiClient } from '@/lib/sui/client';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
  }

  const client = getSuiClient();

  try {
    // 1. 獲取所有 dynamic fields
    const dynamicFields = await client.getDynamicFields({
      parentId: projectId,
    });
    const fieldsDetails = [];

    // 2. 逐個解析
    for (const field of dynamicFields.data) {
      try {
        const name = (field as any).name;
        const fieldObj = await client.getDynamicFieldObject({
          parentId: projectId,
          name: name,
        });
        fieldsDetails.push({
          name: name,
          objectType: (field as any).objectType,
          fieldObject: fieldObj.data,
        });
      } catch (err: any) {
        fieldsDetails.push({
          name: (field as any).name,
          error: err.message,
        });
      }
    }

    return NextResponse.json({
      projectId,
      fieldCount: dynamicFields.data.length,
      fields: fieldsDetails,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
