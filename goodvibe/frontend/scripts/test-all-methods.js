#!/usr/bin/env node

/**
 * 測試所有 Sui 查詢方法
 * 比較 HTTP 和 gRPC 的結果
 */

require('dotenv').config({ path: '.env.local' });

const { SuiClient } = require('@mysten/sui/client');
const { SuiGrpcClient } = require('@mysten/sui/grpc');
const { GrpcWebFetchTransport } = require('@protobuf-ts/grpcweb-transport');

const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID;
const GRPC_ENDPOINT = process.env.NEXT_PUBLIC_SUI_GRPC_ENDPOINT;
const GRPC_API_KEY = process.env.NEXT_PUBLIC_SUI_GRPC_TOKEN;

// 建立 HTTP 客戶端
const httpClient = new SuiClient({ url: 'https://fullnode.mainnet.sui.io:443' });

// 建立 gRPC 客戶端
const fetchWithApiKey = (input, init) => {
  const headers = new Headers(init?.headers);
  headers.set('x-api-key', GRPC_API_KEY);
  return fetch(input, { ...init, headers });
};

const grpcTransport = new GrpcWebFetchTransport({
  baseUrl: `https://${GRPC_ENDPOINT}`,
  fetch: fetchWithApiKey,
});

const grpcClient = new SuiGrpcClient({
  network: 'mainnet',
  transport: grpcTransport,
});

console.log('🧪 完整方法測試\n');
console.log('Package ID:', PACKAGE_ID);
console.log('gRPC Endpoint:', GRPC_ENDPOINT);
console.log('');

async function testMethod(name, httpFn, grpcFn) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📋 測試: ${name}`);
  console.log('='.repeat(60));
  
  // 測試 HTTP
  let httpResult = null;
  let httpError = null;
  try {
    console.log('\n🔵 HTTP JSON-RPC:');
    httpResult = await httpFn();
    console.log('  ✅ 成功');
    console.log('  結果:', JSON.stringify(httpResult, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    , 2).substring(0, 500));
  } catch (error) {
    httpError = error;
    console.log('  ❌ 失敗:', error.message);
  }
  
  // 測試 gRPC
  let grpcResult = null;
  let grpcError = null;
  try {
    console.log('\n🟢 gRPC:');
    grpcResult = await grpcFn();
    console.log('  ✅ 成功');
    console.log('  結果:', JSON.stringify(grpcResult, null, 2).substring(0, 500));
  } catch (error) {
    grpcError = error;
    console.log('  ❌ 失敗:', error.code || error.message);
    if (error.message) console.log('  訊息:', error.message);
  }
  
  // 比較
  console.log('\n📊 結論:');
  if (httpResult && grpcResult) {
    console.log('  ✅ 兩者都成功');
  } else if (httpResult && grpcError) {
    console.log('  ⚠️  HTTP 成功，gRPC 失敗 → 建議：使用 HTTP 回退');
  } else if (httpError && grpcResult) {
    console.log('  ⚠️  HTTP 失敗，gRPC 成功 → 罕見情況');
  } else {
    console.log('  ❌ 兩者都失敗');
  }
}

async function runAllTests() {
  let testProjectId = null;
  let testVaultId = null;
  
  try {
    // 測試 1: queryEvents（獲取專案列表）
    await testMethod(
      'queryEvents - 取得 ProjectCreatedEvent',
      async () => {
        const result = await httpClient.queryEvents({
          query: { MoveEventType: `${PACKAGE_ID}::project::ProjectCreatedEvent` },
          limit: 3,
        });
        if (result.data.length > 0) {
          testProjectId = result.data[0].parsedJson?.project_id;
        }
        return {
          count: result.data.length,
          firstProjectId: testProjectId,
        };
      },
      async () => {
        // gRPC 沒有直接的 queryEvents
        throw new Error('Surflux gRPC 不支援 queryEvents');
      }
    );
    
    if (!testProjectId) {
      console.log('\n⚠️  沒有找到專案，跳過後續測試');
      return;
    }
    
    // 測試 2: getObject（獲取專案詳情）
    await testMethod(
      'getObject - 取得專案詳情',
      async () => {
        const result = await httpClient.getObject({
          id: testProjectId,
          options: { showContent: true },
        });
        return {
          objectId: result.data?.objectId,
          hasContent: !!result.data?.content,
          type: result.data?.type,
        };
      },
      async () => {
        const { response } = await grpcClient.ledgerService.getObject({
          object_id: testProjectId,
          read_mask: { paths: ['object.content', 'object.object_id', 'object.type'] },
        });
        return {
          objectId: response.object?.object_id,
          hasContent: !!response.object?.content,
          type: response.object?.type,
        };
      }
    );
    
    // 測試 3: getOwnedObjects（查找用戶的 Vault）
    const testAddress = '0x006d980cadd43c778e628201b45cfd3ba6e1047c65f67648a88f635108ffd6eb';
    const vaultType = `${PACKAGE_ID}::vault::Vault<0x6d9fc33611f4881a3f5c0cd4899d95a862236ce52b3a38fef039077b0c5b5834::btc_usdc::BtcUSDC>`;
    
    await testMethod(
      'getOwnedObjects - 查找 Vault',
      async () => {
        const result = await httpClient.getOwnedObjects({
          owner: testAddress,
          filter: { StructType: vaultType },
          options: { showContent: true },
        });
        if (result.data.length > 0) {
          testVaultId = result.data[0].data?.objectId;
        }
        return {
          count: result.data.length,
          firstVaultId: testVaultId,
        };
      },
      async () => {
        const { response } = await grpcClient.stateService.listOwnedObjects({
          owner: testAddress,
          object_type: vaultType,
          page_size: 10,
          read_mask: { paths: ['object.content', 'object.object_id'] },
        });
        if (response.objects?.length > 0) {
          testVaultId = response.objects[0].object_id;
        }
        return {
          count: response.objects?.length || 0,
          firstVaultId: testVaultId,
        };
      }
    );
    
    // 測試 4: getDynamicFields（查找 Vault 的 allocations）
    if (testVaultId) {
      await testMethod(
        'getDynamicFields - 查找 Vault allocations',
        async () => {
          const result = await httpClient.getDynamicFields({
            parentId: testVaultId,
          });
          return {
            count: result.data.length,
            hasNextPage: result.hasNextPage,
          };
        },
        async () => {
          const { response } = await grpcClient.stateService.listDynamicFields({
            parent: testVaultId,
            page_size: 50,
          });
          return {
            count: response.dynamic_fields?.length || 0,
            hasNextPage: !!response.next_page_token,
          };
        }
      );
      
      // 測試 5: getDynamicFieldObject（獲取單個 allocation）
      const result = await httpClient.getDynamicFields({ parentId: testVaultId });
      if (result.data.length > 0) {
        const firstField = result.data[0];
        
        await testMethod(
          'getDynamicFieldObject - 獲取 allocation 詳情',
          async () => {
            const fieldObj = await httpClient.getDynamicFieldObject({
              parentId: testVaultId,
              name: firstField.name,
            });
            return {
              objectId: fieldObj.data?.objectId,
              hasContent: !!fieldObj.data?.content,
            };
          },
          async () => {
            // gRPC 可能沒有直接的 getDynamicFieldObject
            // 需要用 getObject + field_id
            throw new Error('需要確認 gRPC 的實作方式');
          }
        );
      }
    } else {
      console.log('\n⚠️  沒有找到 Vault，跳過 dynamic fields 測試');
    }
    
    // 測試 6: getBalance（查詢餘額）
    await testMethod(
      'getBalance - 查詢 SUI 餘額',
      async () => {
        const result = await httpClient.getBalance({
          owner: testAddress,
          coinType: '0x2::sui::SUI',
        });
        return {
          coinType: result.coinType,
          totalBalance: result.totalBalance,
        };
      },
      async () => {
        const { response } = await grpcClient.stateService.getBalance({
          owner: testAddress,
          coin_type: '0x2::sui::SUI',
        });
        return {
          coinType: response.balance?.coin_type,
          totalBalance: response.balance?.balance,
        };
      }
    );
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 測試完成');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ 測試過程發生錯誤:', error);
  }
}

runAllTests();
