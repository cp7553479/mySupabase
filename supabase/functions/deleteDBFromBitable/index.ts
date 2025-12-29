/// <reference lib="deno.ns" />
/// <reference lib="dom" />

/**
 * Supabase Edge Function: deleteDBFromBitable
 * 
 * ========================================
 * 程序运行原理和工作流程
 * ========================================
 *
 * 【核心功能】
 * 根据飞书多维表格的 record_id 批量删除 Supabase 数据库记录
 * 支持批量处理，按app_token和table_id分组进行高效处理
 *
 * 【工作流程】
 * 1. 数据接收与规范化
 *    - 接收payload（单个对象或数组格式）
 *    - 验证必填字段（app_token, table_id, records）
 *    - 去重record_id，避免重复处理
 *    - 标准化为数组格式进行处理
 *
 * 2. 数据分组处理
 *    - 按app_token + table_id进行分组
 *    - 相同组合的数据合并为一组批处理
 *    - 提高API调用效率，减少重复请求
 *
 * 3. 映射配置查询
 *    - 查询feishuBitable_Mapping表获取映射配置
 *    - 根据app_token和table_id获取对应的db_schema和db_table
 *    - 确保删除操作针对正确的数据库表
 *
 * 4. 数据库删除操作
 *    - 使用deleteRecords批量删除数据库记录
 *    - 以record_id作为删除条件
 *    - 支持批量删除提高效率
 *
 * 5. 消息清理
 *    - 成功处理的消息从队列中删除
 *    - 失败的消息保留在队列中等待重试
 *
 * 【输入格式】
 * 单个对象：
 * {
 *   "app_token": "bascnCMII2ORuAiS8katXFabcde",
 *   "table_id": "tblxxx123456789",
 *   "records": [
 *     { "record_id": "recxxx111" },
 *     { "record_id": "recxxx222" }
 *   ]
 * }
 *
 * 数组格式：
 * [
 *   {
 *     "app_token": "bascnCMII2ORuAiS8katXFabcde",
 *     "table_id": "tblxxx123456789",
 *     "records": [{ "record_id": "recxxx111" }]
 *   }
 * ]
 *
 * 【输出格式】
 * 成功情况：
 * {
 *   "success": true,
 *   "total_groups": 1,
 *   "results": [{
 *     "group_index": 1,
 *     "app_token": "bascnCMII2ORuAiS8katXFabcde",
 *     "table_id": "tblxxx123456789",
 *     "db_schema": "public",
 *     "db_table": "products",
 *     "processed_records": 2,
 *     "delete_result": "success"
 *   }]
 * }
 *
 * 失败情况：
 * {
 *   "success": true,
 *   "total_groups": 1,
 *   "results": [{
 *     "group_index": 1,
 *     "app_token": "bascnCMII2ORuAiS8katXFabcde",
 *     "table_id": "tblxxx123456789",
 *     "error": "未找到映射: app_token=xxx, table_id=xxx",
 *     "processed_records": 0
 *   }]
 * }
 */

import { deleteRecords, supabaseClient, deletePgmqMessage } from '../_shared/supabaseClient.ts';

// 类型定义
export interface InputRecordItem {
  record_id: string;
}

export interface InputGroupItem {
  app_token: string;
  table_id: string;
  records: InputRecordItem[];
  db_schema?: string;
  db_table?: string;
  process_result?: boolean; // 标记该项的处理结果
  msg_queue_info?: Array<{msg_id: number; queue_name: string}>; // 批处理时的消息队列信息
}

// 主处理函数
Deno.serve(async (req) => {
  try {
    console.log('=== deleteDBFromBitable 开始处理请求 ===');

    const reqJson = await req.json();
    console.log('1. 原始请求数据:', JSON.stringify(reqJson, null, 2));

    // 标准化为数组格式
    const payload = Array.isArray(reqJson) ? reqJson : [reqJson];
    console.log('2. 标准化后的payload数组:', JSON.stringify(payload, null, 2));

    // 数据验证和去重
    const normalizedItems: InputGroupItem[] = [];
    for (const item of payload) {
      if (!item || typeof item !== 'object') { 
        console.warn('跳过无效项:', item); 
        continue; 
      }
      if (!item.app_token || !item.table_id) { 
        console.warn('跳过缺少app_token或table_id的项:', item); 
        continue; 
      }
      if (!Array.isArray(item.records) || item.records.length === 0) { 
        console.warn('跳过没有records的项:', item); 
        continue; 
      }

      // 不在这里去重record_id，保留原始数据结构
      const validRecords: InputRecordItem[] = [];
      for (const record of item.records) {
        if (!record || !record.record_id) { 
          console.warn('跳过无效记录:', record); 
          continue; 
        }
        validRecords.push({ record_id: record.record_id });
      }

      if (validRecords.length > 0) {
        const normalizedItem: InputGroupItem = {
          app_token: item.app_token,
          table_id: item.table_id,
          records: validRecords,
          db_schema: item.db_schema,
          db_table: item.db_table,
        };

        // 如果有队列信息，添加到msg_queue_info数组
        if (item.msg_id && item.queue_name) {
          normalizedItem.msg_queue_info = [{
            msg_id: item.msg_id,
            queue_name: item.queue_name
          }];
        }

        normalizedItems.push(normalizedItem);
      }
    }
    console.log('3. 验证和去重后的数据:', JSON.stringify(normalizedItems, null, 2));

    if (normalizedItems.length === 0) {
      console.log('没有有效的数据项，返回空结果');
      return new Response(
        JSON.stringify({ success: true, message: '没有有效的数据项', results: [] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 按 app_token + table_id 分组
    const groups = groupByAppTokenAndTableId(normalizedItems);
    console.log('4. 分组后的数据:', JSON.stringify(groups, null, 2));

    // 处理每个分组
    const results: Array<{
      group_index: number;
      app_token: string;
      table_id: string;
      db_schema?: string;
      db_table?: string;
      processed_records: number;
      delete_result?: string;
      message?: string;
      error?: string;
    }> = [];

    for (let i = 0; i < groups.length; i++) {
      const group = groups[i];
      console.log(`\n=== 处理第${i + 1}组: app_token=${group.app_token}, table_id=${group.table_id} ===`);

      try {
        const recordIds = group.records.map(r => r.record_id);
        console.log(`5.${i + 1}.a 查询数据库映射配置`);

        // 获取数据库映射信息
        const { db_schema, db_table } = await getSchemaAndTable(
          group.app_token,
          group.table_id
        );
        console.log(`5.${i + 1}.b 映射结果: db_schema=${db_schema}, db_table=${db_table}`);

        // 构造删除数据
        const rows = recordIds.map(id => ({ record_id: id }));

        if (rows.length > 0) {
          console.log(`5.${i + 1}.c 开始删除数据库记录: ${db_schema}.${db_table}`);
          const deleteResult = await deleteRecords(
            `${db_schema}.${db_table}`,
            rows,
            'record_id'
          );
          console.log(`5.${i + 1}.c 数据库删除结果:`, JSON.stringify(deleteResult, null, 2));

          // 设置处理结果状态
          group.process_result = (deleteResult === 'success');

          // 按组即时删除队列消息（仅成功时）— deletePgmqMessage 内部已打印并不抛异常
          if (group.process_result === true && group.msg_queue_info && group.msg_queue_info.length > 0) {
            for (const msgInfo of group.msg_queue_info) {
              await deletePgmqMessage(msgInfo.queue_name, msgInfo.msg_id);
            }
          }

          results.push({
            group_index: i + 1,
            app_token: group.app_token,
            table_id: group.table_id,
            db_schema,
            db_table,
            processed_records: rows.length,
            delete_result: deleteResult,
          });
        } else {
          console.log(`5.${i + 1}.c 没有数据需要删除`);
          // 没有数据需要删除也算成功
          group.process_result = true;

          // 按组即时删除队列消息（成功视为可清理）— deletePgmqMessage 内部已打印并不抛异常
          if (group.msg_queue_info && group.msg_queue_info.length > 0) {
            for (const msgInfo of group.msg_queue_info) {
              await deletePgmqMessage(msgInfo.queue_name, msgInfo.msg_id);
            }
          }
          
          results.push({
            group_index: i + 1,
            app_token: group.app_token,
            table_id: group.table_id,
            db_schema,
            db_table,
            processed_records: 0,
            message: '没有数据需要删除',
          });
        }
      } catch (groupError: any) {
        console.error(`处理第${i + 1}组时出错:`, groupError);
        // 出错时设置为失败
        group.process_result = false;
        
        results.push({
          group_index: i + 1,
          app_token: group.app_token,
          table_id: group.table_id,
          error: groupError.message,
          processed_records: 0,
        });
      }
    }

    console.log('6. 最终处理结果:', JSON.stringify(results, null, 2));

    console.log('=== deleteDBFromBitable 处理完成 ===\n');

    return new Response(
      JSON.stringify({ success: true, total_groups: groups.length, results }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in deleteDBFromBitable:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * 按 app_token 和 table_id 分组合并数据
 */
function groupByAppTokenAndTableId(items: InputGroupItem[]): InputGroupItem[] {
  const groupMap = new Map<string, InputGroupItem>();

  for (const item of items) {
    const key = `${item.app_token}:${item.table_id}`;
    
    if (groupMap.has(key)) {
      const existingGroup = groupMap.get(key)!;
      
      // 合并records数组，并在这里进行去重
      const existingRecordIds = new Set(existingGroup.records.map(r => r.record_id));
      for (const record of item.records) {
        if (!existingRecordIds.has(record.record_id)) {
          existingGroup.records.push(record);
          existingRecordIds.add(record.record_id);
        }
      }
      
      // 合并msg_queue_info
      if (item.msg_queue_info) {
        if (!existingGroup.msg_queue_info) {
          existingGroup.msg_queue_info = [];
        }
        existingGroup.msg_queue_info.push(...item.msg_queue_info);
      }
    } else {
      // 创建新的分组，初始化process_result为false
      const newGroup: InputGroupItem = {
        ...item,
        process_result: false,
        // 对当前item的records进行去重
        records: Array.from(new Set(item.records.map(r => r.record_id))).map(id => ({ record_id: id }))
      };
      groupMap.set(key, newGroup);
    }
  }

  return Array.from(groupMap.values());
}

/**
 * 根据飞书应用和表格ID查询对应的数据库schema和表名
 */
async function getSchemaAndTable(
  app_token: string,
  table_id: string
): Promise<{ db_schema: string; db_table: string }> {
  if (!app_token || !table_id) {
    throw new Error('getSchemaAndTable: app_token 和 table_id 不能为空');
  }

  const { data, error } = await supabaseClient
    .schema('public')
    .from('feishuBitable_Mapping')
    .select('db_schema, db_table')
    .eq('feishu_app_token', app_token)
    .eq('feishu_table_id', table_id);

  if (error) {
    throw new Error(`查询映射失败: ${error.message}`);
  }
  if (!data || data.length === 0) {
    throw new Error(`未找到映射: app_token=${app_token}, table_id=${table_id}`);
  }

  const first = data[0] as { db_schema: string; db_table: string };
  const { db_schema, db_table } = first;
  
  if (!db_schema || !db_table) {
    throw new Error('映射配置缺少 db_schema 或 db_table');
  }

  return { db_schema, db_table };
}