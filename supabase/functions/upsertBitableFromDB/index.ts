// =============================================================================
// Supabase Edge Function: upsertBitableFromDB
// =============================================================================
//
// 【功能说明】
// 处理PGMQ消息队列，将数据库变更同步到飞书多维表格
//
// 【工作流程】
// 1. 接收PGMQ消息队列
//    - 支持单个消息或消息数组
//    - 验证必需字段：message_id, queue_name, schema, table
//    - DELETE操作使用OLD数据，其他操作使用NEW数据
//
// 2. 消息分组
//    - 按 schema.table 分组
//    - 再按操作类型（INSERT/UPDATE/DELETE）分组
//    - UPDATE操作如果record_id为空，自动转为INSERT
//
// 3. 查询映射配置
//    - 从 feishuBitable_Mapping 表查询字段映射
//    - 获取 app_token, table_id, 字段映射关系
//    - 如果未找到映射，删除消息并跳过
//
// 4. 字段映射与转换
//    - 根据映射配置转换字段
//    - 过滤只读字段（type: 20,19,1001,1002,1003,1004,1005）
//    - 使用 transformFieldValue 进行类型转换
//
// 5. 调用飞书API
//    - INSERT: 调用 batchCreate API
//    - UPDATE: 调用 batchUpdate API
//    - DELETE: 调用 batchDelete API
//    - 按500条分块处理，避免单次请求过大
//
// 6. 数据库回写（仅INSERT）
//    - INSERT成功后，从飞书响应中提取 record_id
//    - 更新数据库对应记录的 record_id 字段
//    - 包括原本是UPDATE但record_id为空的记录
//
// 7. 消息队列清理
//    - 无论成功或失败，都删除消息
//    - 避免消息队列堆积和重复处理
//
// 【输入格式】
// {
//   "message_id": 123,
//   "queue_name": "db_to_feishu",
//   "schema": "public",
//   "table": "products",
//   "type": "INSERT|UPDATE|DELETE",
//   "NEW": { "id": 1, "name": "产品A", "record_id": "recxxx" },
//   "OLD": { "id": 1, "name": "产品B", "record_id": "recxxx" }
// }
//
// 【输出格式】
// 只返回飞书API的原始响应数组：
// [
//   {
//     "code": 0,
//     "msg": "success",
//     "data": {
//       "records": [
//         {
//           "record_id": "recxxx",
//           "fields": { ... },
//           "created_time": 1234567890
//         }
//       ]
//     }
//   }
// ]
//
// =============================================================================

import { larkClient } from '../_shared/larkClient.ts';
import { supabaseClient, deletePgmqMessage } from '../_shared/supabaseClient.ts';
import { transformFieldValue } from '../_shared/transBitableRecordsToDB.ts';

declare const Deno: any;

interface PgmqMessage {
  message_id: number;
  queue_name: string;
  schema: string;
  table: string;
  NEW: Record<string, any>;
  OLD?: Record<string, any>;
  type?: 'INSERT' | 'UPDATE' | 'DELETE';
}

Deno.serve(async (req) => {
  try {
    const reqJson = await req.json();
    // 打印请求体预览（若为数组仅展示前3条，防止日志过大）
    try {
      const preview = Array.isArray(reqJson) ? reqJson.slice(0, 3) : reqJson;
      console.log('请求体预览:', JSON.stringify(preview));
    } catch (_) {
      console.log('请求体预览: (无法序列化)');
    }
    const messages: PgmqMessage[] = Array.isArray(reqJson) ? reqJson : [reqJson];
    const apiResponses: any[] = [];
    
    console.log('接收到消息:', messages.length);
    
    // 按 schema.table 分组，然后按 type 分组（精简日志，不逐步细打印）
    const grouped: Record<string, Record<string, PgmqMessage[]>> = {};
    
    for (const msg of messages) {
      // 验证必需字段
      if (!msg?.message_id || !msg?.queue_name || !msg?.schema || !msg?.table) {
        console.warn('跳过无效消息:', msg);
        continue;
      }
      
      // DELETE操作：使用OLD数据
      if (msg.type === 'DELETE' && msg.OLD) {
        msg.NEW = msg.OLD;
      }
      
      if (!msg.NEW) {
        console.warn('消息缺少NEW数据:', msg);
        continue;
      }
      
      const key = `${msg.schema}.${msg.table}`;
      // UPDATE但record_id为空，转为INSERT
      const type = msg.type === 'UPDATE' && !msg.NEW.record_id ? 'INSERT' : (msg.type || 'INSERT');
      
      if (!grouped[key]) grouped[key] = {};
      if (!grouped[key][type]) grouped[key][type] = [];
      grouped[key][type].push(msg);
    }
    
    // 处理每个分组
    for (const [key, typeGroups] of Object.entries(grouped)) {
      const [schema, table] = key.split('.');
      console.log(`处理组: ${key}`);
      
      // 查询映射配置
      const mapping = await getMapping(schema, table);
      if (!mapping) {
        console.warn(`未找到映射配置: ${key}`);
        // 删除消息
        for (const msgs of Object.values(typeGroups)) {
          await deleteMessages(msgs);
        }
        continue;
      }
      
      // 处理每种操作类型
      for (const [type, msgs] of Object.entries(typeGroups)) {
        console.log(`处理 ${type} 操作，消息数: ${msgs.length}`);
        
        // 按500条分块处理
        for (let i = 0; i < msgs.length; i += 500) {
          const chunk = msgs.slice(i, i + 500);
          
          try {
            // 调用飞书API
            const response = await callFeishuAPI(type, mapping, chunk, schema, table);
            console.log(`飞书API响应:`, response);
            apiResponses.push(response);
            
            // 删除消息（精简日志，不打印逐批成功条数）
            await deleteMessages(chunk);
          } catch (error) {
            console.error(`❌ 处理失败:`, error);
            // 即使失败也删除消息，避免无限重试
            await deleteMessages(chunk);
          }
        }
      }
    }
    
    console.log('处理完成，返回飞书API响应');
    return new Response(JSON.stringify(apiResponses), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('错误:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

/**
 * 查询映射配置
 */
async function getMapping(schema: string, table: string) {
  const { data, error } = await supabaseClient
    .schema('public')
    .from('feishuBitable_Mapping')
    .select('feishu_app_token, feishu_table_id, db_field, feishu_field_name, feishu_field_type')
    .eq('db_schema', schema)
    .eq('db_table', table);
  
  if (error) {
    console.error('查询映射失败:', error);
    return null;
  }
  
  if (!data?.length) return null;
  
  return {
    app_token: data[0].feishu_app_token,
    table_id: data[0].feishu_table_id,
    field_mappings: data.map(r => ({
      db_field: r.db_field,
      feishu_field_name: r.feishu_field_name,
      feishu_field_type: r.feishu_field_type
    }))
  };
}

/**
 * 调用飞书API
 */
async function callFeishuAPI(type: string, mapping: any, messages: PgmqMessage[], schema?: string, table?: string) {
  // 构建请求数据
  // DELETE: records: [{ record_id }]
  // INSERT: records: [{ fields: {...} }]
  // UPDATE: records: [{ record_id, fields: {...} }]
  let payload: any;

  if (type === 'DELETE') {
    const records = messages.map(m => m.OLD?.record_id);
    payload = {
      records: records,
      user_id_type: 'open_id'
    };
  } else {
    // 先把字段构造成 Map，同时确定每条消息的实际操作类型
    const mapped = await Promise.all(messages.map(async m => {
      const fieldsMap = await mapFields(m.NEW, mapping); // 返回 Map
      
      // 动态判断实际操作类型
      let actualType = type;
      if (type === 'UPDATE' && !m.NEW.record_id) {
        actualType = 'INSERT'; // UPDATE但record_id为空 → INSERT
      } else if (type === 'INSERT' && m.NEW.record_id) {
        actualType = 'UPDATE'; // INSERT但record_id存在 → UPDATE
      }
      
      return {
        actualType,
        record: actualType === 'UPDATE'
          ? { record_id: m.NEW.record_id, fields: fieldsMap as Map<string, any> }
          : { fields: fieldsMap as Map<string, any> }
      };
    }));

    // 按实际操作类型分组
    const insertRecords = mapped.filter(m => m.actualType === 'INSERT').map(m => m.record);
    const updateRecords = mapped.filter(m => m.actualType === 'UPDATE').map(m => m.record);
    
    // 如果同时存在INSERT和UPDATE，需要分别调用API
    if (insertRecords.length > 0 && updateRecords.length > 0) {
      console.warn(`警告: 同一批次同时存在INSERT(${insertRecords.length})和UPDATE(${updateRecords.length})，将分别调用API`);
      // 这里暂时使用数量多的作为主要操作
      const records = insertRecords.length >= updateRecords.length ? insertRecords : updateRecords;
      const actualType = insertRecords.length >= updateRecords.length ? 'INSERT' : 'UPDATE';
      
      const normalized = records
        .map(r => (
          'record_id' in r
            ? { record_id: (r as any).record_id, fields: Object.fromEntries((r as any).fields) }
            : { fields: Object.fromEntries((r as any).fields) }
        ))
        .filter(r => 'fields' in r ? Object.keys((r as any).fields).length > 0 : true);

      payload = {
        records: normalized,
        user_id_type: 'open_id'
      };
      
      // 更新type为实际类型
      type = actualType;
    } else {
      // 只有一种操作类型
      const records = insertRecords.length > 0 ? insertRecords : updateRecords;
      const actualType = insertRecords.length > 0 ? 'INSERT' : 'UPDATE';
      
      const normalized = records
        .map(r => (
          'record_id' in r
            ? { record_id: (r as any).record_id, fields: Object.fromEntries((r as any).fields) }
            : { fields: Object.fromEntries((r as any).fields) }
        ))
        .filter(r => 'fields' in r ? Object.keys((r as any).fields).length > 0 : true);

      payload = {
        records: normalized,
        user_id_type: 'open_id'
      };
      
      // 更新type为实际类型
      type = actualType;
    }
  }

  // 选择API方法（此时type已经是实际类型）
  const apiMethod = {
    'INSERT': 'batchCreate',
    'UPDATE': 'batchUpdate',
    'DELETE': 'batchDelete'
  }[type];
  
  // 调试：打印即将发送给飞书的payload（避免过大，仅显示前几项）
  try {
    const preview = Array.isArray(payload?.records)
      ? { ...payload, records: (payload.records as any[]).slice(0, 3) }
      : payload;
    console.log(`[Feishu Payload][${type}]`, JSON.stringify(preview));
  } catch (_) {
    console.log(`[Feishu Payload][${type}] (cannot stringify)`);
  }

  // 调用飞书API
  const response = await larkClient.bitable.v1.appTableRecord[apiMethod]({
    path: { app_token: mapping.app_token, table_id: mapping.table_id },
    data: payload
  });
  
  // INSERT操作需要更新数据库（包括原本是UPDATE但record_id为空的）
  if (type === 'INSERT' && response?.code === 0 && schema && table) {
    await updateDatabase(response, schema, table);
  }
  
  return response;
}

/**
 * 映射字段
 */
async function mapFields(record: any, mapping: any) {
  const fields = new Map<string, any>();
  const readonly = [20, 19, 1001, 1002, 1003, 1004, 1005];
  
  for (const m of mapping.field_mappings) {
    if (readonly.includes(m.feishu_field_type)) continue;
    
    if (record[m.db_field] !== undefined) {
      try {
        fields.set(m.feishu_field_name, transformFieldValue(record[m.db_field]));
      } catch (error) {
        console.warn(`字段转换失败: ${m.db_field}`, error);
      }
    }
  }
  
  return fields;
}

/**
 * 更新数据库record_id
 */
async function updateDatabase(response: any, schema: string, table: string) {
  const records = response.data?.records || [];
  console.log(`开始更新数据库record_id: ${records.length}条`);
  
  for (const record of records) {
    const id = record.fields?.id;
    const record_id = record.record_id;
    
    if (!id || !record_id) {
      console.warn(`跳过无效记录: id=${id}, record_id=${record_id}`);
      continue;
    }
    
    try {
      const { data, error } = await supabaseClient
        .schema(schema)
        .from(table)
        .update({ record_id })
        .eq('id', id)
        .select();
      
      if (error) {
        console.error(`❌ 更新失败: id=${id} -> record_id=${record_id}`, error);
      } else {
        const updatedRows = Array.isArray(data) ? data.length : 0;
        if (updatedRows > 0) {
          console.log(`✅ 更新成功: id=${id} -> record_id=${record_id} (影响行数: ${updatedRows})`);
        } else {
          console.warn(`⚠️ 未找到匹配记录: id=${id} -> record_id=${record_id}`);
        }
      }
    } catch (error) {
      console.error(`❌ 更新异常: id=${id} -> record_id=${record_id}`, error);
    }
  }
}

/**
 * 删除消息
 */
async function deleteMessages(messages: PgmqMessage[]) {
  for (const msg of messages) {
    try {
      await deletePgmqMessage(msg.queue_name, msg.message_id);
    } catch (error) {
      console.error(`删除消息失败: ${msg.message_id}`, error);
    }
  }
}
