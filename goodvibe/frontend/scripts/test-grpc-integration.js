#!/usr/bin/env node

/**
 * gRPC 整合測試腳本
 * 測試所有 Sui 查詢方法的 gRPC/HTTP 實作
 */

require('dotenv').config({ path: '.env.local' });

const { getSuiClient } = require('../lib/sui/client');

const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID;

console.log('🧪 gRPC 整合測試\n');
console.log('Package ID:', PACKAGE_ID);
console.log('');

async function testAllMethods() {
  const client = getSuiClient();
  
  let testProjectId = null;
  let results = {
    queryEvents: '❌',
    getObject: '❌',
    getOwnedObjects: '❌',
    getDynamicFields: '❌',
    getDynamicFieldObject: '❌',
  };
  
  try {
    // 1. queryEvents
    console.log('1️⃣  queryEvents (專案創建事件)');
    try {
      const events = await client.queryEvents({
        query: { MoveEventType: `${PACKAGE_ID}::project::ProjectCreatedEvent` },
        limit: 3,
      });
      if (events.data.length > 0) {
        testProjectId = events.data[0].parsedJson?.project_id;
        results.queryEvents = '✅';
        console.log(`   ✅ 成功 (${events.data.length} 事件)`);
      }
    } catch (error) {
      console.log('   ❌ 失敗:', error.message);
    }
    
    // 2. getObject
    if (testProjectId) {
      console.log('\n2️⃣  getObject (專案詳情)');
      try {
        const obj = await client.getObject({
          id: testProjectId,
          options: { showContent: true },
        });
        if (obj.data?.content) {
          results.getObject = '✅';
          console.log('   ✅ 成功');
        }
      } catch (error) {
        console.log('   ❌ 失敗:', error.message);
      }
    }
    
    // 3. getOwnedObjects
    console.log('\n3️⃣  getOwnedObjects (用戶專案)');
    const testAddress = '0x006d980cadd43c778e628201b45cfd3ba6e1047c65f67648a88f635108ffd6eb';
    try {
      const objects = await client.getOwnedObjects({
        owner: testAddress,
        filter: { StructType: `${PACKAGE_ID}::project::Project` },
        options: { showContent: true },
        limit: 5,
      });
      results.getOwnedObjects = '✅';
      console.log(`   ✅ 成功 (${objects.data.length} 對象)`);
    } catch (error) {
      console.log('   ❌ 失敗:', error.message);
    }
    
    // 4. getDynamicFields
    if (testProjectId) {
      console.log('\n4️⃣  getDynamicFields (專案 updates)');
      try {
        const fields = await client.getDynamicFields({
          parentId: testProjectId,
          limit: 10,
        });
        results.getDynamicFields = '✅';
        console.log(`   ✅ 成功 (${fields.data.length} fields)`);
        
        // 5. getDynamicFieldObject
        if (fields.data.length > 0) {
          console.log('\n5️⃣  getDynamicFieldObject (update 詳情)');
          try {
            const fieldObj = await client.getDynamicFieldObject({
              parentId: testProjectId,
              name: fields.data[0].name,
            });
            if (fieldObj.data?.content) {
              results.getDynamicFieldObject = '✅';
              console.log('   ✅ 成功');
            }
          } catch (error) {
            console.log('   ❌ 失敗:', error.message);
          }
        }
      } catch (error) {
        console.log('   ❌ 失敗:', error.message);
      }
    }
    
    // 總結
    console.log('\n' + '='.repeat(60));
    console.log('📊 測試結果總結');
    console.log('='.repeat(60));
    Object.entries(results).forEach(([method, status]) => {
      console.log(`${status} ${method}`);
    });
    
    const successCount = Object.values(results).filter(r => r === '✅').length;
    const totalCount = Object.keys(results).length;
    console.log(`\n總計: ${successCount}/${totalCount} 通過`);
    
  } catch (error) {
    console.error('\n❌ 測試過程發生錯誤:', error);
  }
}

testAllMethods();
