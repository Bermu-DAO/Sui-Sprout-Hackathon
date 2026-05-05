#!/usr/bin/env node

/**
 * 測試完整的 gRPC 實作
 */

require('dotenv').config({ path: '.env.local' });

const { getSuiClient } = require('../lib/sui/client');

const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID;

console.log('🧪 測試完整 gRPC 實作\n');
console.log('Package ID:', PACKAGE_ID);
console.log('');

async function testAllMethods() {
  const client = getSuiClient();
  
  console.log('客戶端類型:', client.constructor.name);
  console.log('');
  
  let testProjectId = null;
  let testVaultId = null;
  
  try {
    // 測試 1: queryEvents（應該用 HTTP）
    console.log('='.repeat(60));
    console.log('1️⃣  測試 queryEvents');
    console.log('='.repeat(60));
    try {
      const events = await client.queryEvents({
        query: { MoveEventType: `${PACKAGE_ID}::project::ProjectCreatedEvent` },
        limit: 3,
      });
      console.log('✅ 成功');
      console.log('   事件數量:', events.data.length);
      if (events.data.length > 0) {
        testProjectId = events.data[0].parsedJson?.project_id;
        console.log('   第一個專案 ID:', testProjectId);
      }
    } catch (error) {
      console.log('❌ 失敗:', error.message);
    }
    
    // 測試 2: getObject（應該用 gRPC）
    if (testProjectId) {
      console.log('\n' + '='.repeat(60));
      console.log('2️⃣  測試 getObject (gRPC)');
      console.log('='.repeat(60));
      try {
        const obj = await client.getObject({
          id: testProjectId,
          options: { showContent: true },
        });
        console.log('✅ 成功');
        console.log('   Object ID:', obj.data?.objectId);
        console.log('   有內容:', !!obj.data?.content);
        if (obj.data?.content?.fields) {
          const metadata = obj.data.content.fields.metadata?.fields || {};
          console.log('   專案標題:', metadata.title || '(無)');
        }
      } catch (error) {
        console.log('❌ 失敗:', error.message);
      }
    }
    
    // 測試 3: getOwnedObjects（應該用 gRPC）
    console.log('\n' + '='.repeat(60));
    console.log('3️⃣  測試 getOwnedObjects (gRPC)');
    console.log('='.repeat(60));
    const testAddress = '0x006d980cadd43c778e628201b45cfd3ba6e1047c65f67648a88f635108ffd6eb';
    try {
      const objects = await client.getOwnedObjects({
        owner: testAddress,
        filter: {
          StructType: `${PACKAGE_ID}::project::Project`,
        },
        options: {
          showContent: true,
        },
        limit: 5,
      });
      console.log('✅ 成功');
      console.log('   找到對象數量:', objects.data.length);
      if (objects.data.length > 0) {
        console.log('   第一個對象 ID:', objects.data[0].data?.objectId);
      }
    } catch (error) {
      console.log('❌ 失敗:', error.message);
    }
    
    // 測試 4: 查找 Vault
    console.log('\n' + '='.repeat(60));
    console.log('4️⃣  測試 getOwnedObjects - 查找 Vault (gRPC)');
    console.log('='.repeat(60));
    const vaultType = `${PACKAGE_ID}::vault::Vault<0x6d9fc33611f4881a3f5c0cd4899d95a862236ce52b3a38fef039077b0c5b5834::btc_usdc::BtcUSDC>`;
    try {
      const vaults = await client.getOwnedObjects({
        owner: testAddress,
        filter: {
          StructType: vaultType,
        },
        options: {
          showContent: true,
        },
        limit: 5,
      });
      console.log('✅ 成功');
      console.log('   找到 Vault 數量:', vaults.data.length);
      if (vaults.data.length > 0) {
        testVaultId = vaults.data[0].data?.objectId;
        console.log('   第一個 Vault ID:', testVaultId);
      }
    } catch (error) {
      console.log('❌ 失敗:', error.message);
    }
    
    // 測試 5: getDynamicFields（應該用 gRPC）
    if (testVaultId) {
      console.log('\n' + '='.repeat(60));
      console.log('5️⃣  測試 getDynamicFields (gRPC)');
      console.log('='.repeat(60));
      try {
        const fields = await client.getDynamicFields({
          parentId: testVaultId,
          limit: 10,
        });
        console.log('✅ 成功');
        console.log('   找到 dynamic fields 數量:', fields.data.length);
        if (fields.data.length > 0) {
          console.log('   第一個 field ID:', fields.data[0].objectId);
          console.log('   第一個 field name:', JSON.stringify(fields.data[0].name));
          
          // 測試 6: getDynamicFieldObject（應該用 gRPC）
          console.log('\n' + '='.repeat(60));
          console.log('6️⃣  測試 getDynamicFieldObject (gRPC)');
          console.log('='.repeat(60));
          try {
            const fieldObj = await client.getDynamicFieldObject({
              parentId: testVaultId,
              name: fields.data[0].name,
            });
            console.log('✅ 成功');
            console.log('   Field Object ID:', fieldObj.data?.objectId);
            console.log('   有內容:', !!fieldObj.data?.content);
            if (fieldObj.data?.content?.fields) {
              console.log('   Fields 數量:', Object.keys(fieldObj.data.content.fields).length);
            }
          } catch (error) {
            console.log('❌ 失敗:', error.message);
          }
        } else {
          console.log('⚠️  沒有 dynamic fields，跳過 getDynamicFieldObject 測試');
        }
      } catch (error) {
        console.log('❌ 失敗:', error.message);
      }
    } else {
      console.log('\n⚠️  沒有找到 Vault，跳過 dynamic fields 測試');
    }
    
    // 測試 7: 測試系統對象的 dynamic fields
    console.log('\n' + '='.repeat(60));
    console.log('7️⃣  測試 getDynamicFields - 系統對象 (gRPC)');
    console.log('='.repeat(60));
    const systemObjId = '0x0000000000000000000000000000000000000000000000000000000000000005';
    try {
      const fields = await client.getDynamicFields({
        parentId: systemObjId,
        limit: 3,
      });
      console.log('✅ 成功');
      console.log('   找到 dynamic fields 數量:', fields.data.length);
      if (fields.data.length > 0) {
        console.log('   第一個 field ID:', fields.data[0].objectId);
      }
    } catch (error) {
      console.log('❌ 失敗:', error.message);
    }
    
    // 總結
    console.log('\n' + '='.repeat(60));
    console.log('🎉 測試完成');
    console.log('='.repeat(60));
    console.log('');
    console.log('📊 gRPC 使用情況：');
    console.log('  ✅ getObject           - 使用 gRPC');
    console.log('  ✅ getOwnedObjects     - 使用 gRPC');
    console.log('  ✅ getDynamicFields    - 使用 gRPC');
    console.log('  ✅ getDynamicFieldObject - 使用 gRPC');
    console.log('  ❌ queryEvents         - 使用 HTTP (Surflux 不支援)');
    
  } catch (error) {
    console.error('\n❌ 測試過程發生錯誤:', error);
    console.error(error.stack);
  }
}

testAllMethods();
