// Supabase Edge Function: upsertDBFromBitable
// 
// ========================================
// 程序运行原理和工作流程
// ========================================
//
// 【核心功能】
// 接收飞书多维表格数据，将飞书数据同步到Supabase数据库
// 支持批量处理，按app_token和table_id分组进行高效处理
//
// 【工作流程】
// 1. 数据接收与规范化
//    - 接收payload（单个对象或数组格式）
//    - 验证必填字段（app_token, table_id, records）
//    - 去重record_id，避免重复处理
//    - 标准化为数组格式进行处理
//
// 2. 数据分组处理
//    - 按app_token + table_id进行分组
//    - 相同组合的数据合并为一组批处理
//    - 提高API调用效率，减少重复请求
//
// 3. 飞书数据获取
//    - 批量从飞书Bitable API获取完整记录数据
//    - 按100条/批进行分页获取
//    - 获取所有字段的详细数据
//
// 4. 字段映射与转换
//    - 查询feishuBitable_Mapping表获取映射配置
//    - 将飞书字段名转换为数据库字段名
//    - 使用transformFieldValue进行数据类型转换
//
// 5. 数据库写入
//    - 使用upsert操作写入Supabase数据库
//    - 以record_id作为冲突解决键
//    - 支持插入新记录或更新现有记录
//
// 6. 消息清理
//    - 成功处理的消息从队列中删除
//    - 失败的消息保留在队列中等待重试
//
// 【输入格式】
// 单个对象：
// {
//   "app_token": "bascnCMII2ORuAiS8katXFabcde",
//   "table_id": "tblxxx123456789",
//   "records": [
//     {
//       "record_id": "recxxx111",
//       "fields": {
//         "字段1": "值1",
//         "字段2": 123
//       }
//     }
//   ]
// }
//
// 数组格式：
// [
//   {
//     "app_token": "bascnCMII2ORuAiS8katXFabcde",
//     "table_id": "tblxxx123456789",
//     "records": [{"record_id": "recxxx111"}]
//   }
// ]
//
// 【输出格式】
// 成功情况：
// {
//   "success": true,
//   "total_groups": 2,
//   "results": [
//     {
//       "group_index": 1,
//       "app_token": "bascnCMII2ORuAiS8katXFabcde",
//       "table_id": "tblxxx123456789",
//       "db_schema": "public",
//       "db_table": "products",
//       "processed_records": 5,
//       "upsert_result": "success"
//     }
//   ]
// }
//
// 失败情况：
// {
//   "success": true,
//   "total_groups": 1,
//   "results": [
//     {
//       "group_index": 1,
//       "app_token": "bascnCMII2ORuAiS8katXFabcde",
//       "table_id": "tblxxx123456789",
//       "error": "未找到映射: app_token=xxx, table_id=xxx",
//       "processed_records": 0
//     }
//   ]
// }
import { fetchBitableRecords } from '../_shared/larkClient.ts';
import { upsertRecords, supabaseClient, deletePgmqMessage } from '../_shared/supabaseClient.ts';
import { transformFieldValue } from '../_shared/transBitableRecordsToDB.ts';
// —— 主流程函数 ——
/**
 * upsertDBFromBitable
 * 接收 payload（单个或数组），按 app_token + table_id 分组 -> 先批量获取飞书记录 -> 查询映射 -> 字段重组 -> 转换 -> Supabase upsert
 * 注意：normalize 在函数开头内联处理；onConflict 固定为 "record_id"
 */ Deno.serve(async (req)=>{
  try {
    // 解析请求体
    const reqJson = await req.json();
    // Always operate on an array – wrap single objects
    const payload = Array.isArray(reqJson) ? reqJson : [
      reqJson
    ];
    console.log('1. 标准化后的payload数组:', JSON.stringify(payload, null, 2));
    // 1) 入口内联 normalize：校验必填字段；去重 record_id
    const normalizedItems = [];
    for (const item of payload){
      // 校验必填字段
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
      const validRecords = [];
      for (const record of item.records){
        if (!record || !record.record_id) {
          console.warn('跳过无效记录:', record);
          continue;
        }
        validRecords.push({
          record_id: record.record_id
        });
      }
      if (validRecords.length > 0) {
        const normalizedItem = {
          app_token: item.app_token,
          table_id: item.table_id,
          records: validRecords,
          db_schema: item.db_schema,
          db_table: item.db_table
        };
        // 如果有队列信息，添加到msg_queue_info数组
        if (item.message_id && item.queue_name) {
          normalizedItem.msg_queue_info = [
            {
              message_id: item.message_id,
              queue_name: item.queue_name
            }
          ];
        }
        normalizedItems.push(normalizedItem);
      }
    }
    console.log('3. 验证和去重后的数据:', JSON.stringify(normalizedItems, null, 2));
    if (normalizedItems.length === 0) {
      console.log('没有有效的数据项，返回空结果');
      return new Response(JSON.stringify({
        success: true,
        message: '没有有效的数据项',
        results: []
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    // 2) 分组：groupByAppTokenAndTableId
    const groups = groupByAppTokenAndTableId(normalizedItems);
    console.log('4. 分组后的数据:', JSON.stringify(groups, null, 2));
    // 3) 遍历每组，执行三个步骤
    const results = [];
    for(let i = 0; i < groups.length; i++){
      const group = groups[i];
      console.log(`\n=== 处理第${i + 1}组: app_token=${group.app_token}, table_id=${group.table_id} ===`);
      try {
        // a) fetchBitableRecords
        const recordIds = group.records.map((r)=>r.record_id);
        console.log(`5.${i + 1}.a 准备获取飞书记录，record_ids:`, recordIds);
        const feishuRecords = await fetchBitableRecords(group.app_token, group.table_id, recordIds);
        console.log(`5.${i + 1}.a 获取到的飞书记录:`, JSON.stringify(feishuRecords, null, 2));
        // b) remapBitableFields
        console.log(`5.${i + 1}.b 开始字段映射和转换`);
        const { db_schema, db_table, rows } = await remapBitableFields(group.app_token, group.table_id, feishuRecords);
        console.log(`5.${i + 1}.b 映射结果: db_schema=${db_schema}, db_table=${db_table}`);
        console.log(`5.${i + 1}.b 转换后的数据行:`, JSON.stringify(rows, null, 2));
        // c) upsertRecords
        if (rows.length > 0) {
          console.log(`5.${i + 1}.c 开始写入数据库: ${db_schema}.${db_table}`);
          const upsertResult = await upsertRecords(`${db_schema}.${db_table}`, rows, 'record_id');
          console.log(`5.${i + 1}.c 数据库写入结果:`, JSON.stringify(upsertResult, null, 2));
          // 设置处理结果状态
          group.process_result = upsertResult === 'success';
          results.push({
            group_index: i + 1,
            app_token: group.app_token,
            table_id: group.table_id,
            db_schema,
            db_table,
            processed_records: rows.length,
            upsert_result: upsertResult
          });
        } else {
          console.log(`5.${i + 1}.c 没有数据需要写入数据库`);
          // 没有数据需要写入也算成功
          group.process_result = true;
          results.push({
            group_index: i + 1,
            app_token: group.app_token,
            table_id: group.table_id,
            db_schema,
            db_table,
            processed_records: 0,
            message: '没有数据需要写入'
          });
        }
      } catch (groupError) {
        console.error(`处理第${i + 1}组时出错:`, groupError);
        // 出错时设置为失败
        group.process_result = false;
        results.push({
          group_index: i + 1,
          app_token: group.app_token,
          table_id: group.table_id,
          error: groupError.message,
          processed_records: 0
        });
      }
    }
    // 4) 汇总返回每组 upsert 统计
    console.log('6. 最终处理结果:', JSON.stringify(results, null, 2));
    // 批量删除队列消息
    console.log('7. 开始处理队列消息删除');
    for (const group of groups){
      if (group.process_result === true && group.msg_queue_info && group.msg_queue_info.length > 0) {
        for (const msgInfo of group.msg_queue_info){
          try {
            console.log(`7.删除队列消息: queue_name=${msgInfo.queue_name}, message_id=${msgInfo.message_id}`);
            const pgmqResult = await deletePgmqMessage(msgInfo.queue_name, msgInfo.message_id);
            console.log(`7.队列消息删除结果:`, pgmqResult);
          } catch (pgmqError) {
            console.error(`删除队列消息失败 (message_id=${msgInfo.message_id}):`, pgmqError);
          }
        }
      } else if (group.process_result !== true) {
        console.log(`跳过删除队列消息: 数据库操作失败，保留相关的队列消息`);
      }
    }
    console.log('=== upsertDBFromBitable 处理完成 ===\n');
    return new Response(JSON.stringify({
      success: true,
      total_groups: groups.length,
      results
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error in upsertDBFromBitable:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
});
// —— 工具函数 ——
/**
 * 分组工具：将队列消息按 app_token + table_id 分组并合并 record_id 列表。
 * 作用：只要 app_token 或 table_id 不同就是新组；app_token 与 table_id 同时相同的合并为一组批处理
 */ function groupByAppTokenAndTableId(items) {
  const groupMap = new Map();
  for (const item of items){
    const key = `${item.app_token}:${item.table_id}`;
    if (groupMap.has(key)) {
      const existingGroup = groupMap.get(key);
      // 合并records数组，并在这里进行去重
      const existingRecordIds = new Set(existingGroup.records.map((r)=>r.record_id));
      for (const record of item.records){
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
      const newGroup = {
        ...item,
        process_result: false,
        // 对当前item的records进行去重
        records: Array.from(new Set(item.records.map((r)=>r.record_id))).map((id)=>({
            record_id: id
          }))
      };
      groupMap.set(key, newGroup);
    }
  }
  return Array.from(groupMap.values());
}
/**
 * 批量拉取飞书多维表格记录
 * 作用：调用 larkClient.bitable.v1.appTableRecord.batchGet，按 100 条/批获取记录详情
 * 注意：必须先拉取实际记录（以飞书返回为准），再查映射再重组
 */ /**
 * 合并查询映射与字段重组与值转换
 * 作用：根据 app_token + table_id 从 public."feishuBitable_Mapping" 查询 db_schema/db_table 与字段映射，并将 records 转换为可写入DB的行
 * 注意：只处理飞书记录中实际存在的字段，不存在的字段会被忽略（不添加到数据库记录中）
 * ⭐ 修改：自动忽略 id 字段，不将其包含在 upsert 数据中
 * 返回：{ db_schema, db_table, rows }
 */ async function remapBitableFields(app_token, table_id, records) {
  // 入口最小校验
  if (!app_token || !table_id || !Array.isArray(records)) {
    throw new Error('remapBitableFields: 参数不合法');
  }
  if (records.length === 0) {
    // 无记录直接返回空
    return {
      db_schema: '',
      db_table: '',
      rows: []
    };
  }
  // 查询映射
  const { data, error } = await supabaseClient.schema('public').from('feishuBitable_Mapping').select('db_schema, db_table, feishu_field_name, db_field').eq('feishu_app_token', app_token).eq('feishu_table_id', table_id);
  if (error) {
    throw new Error(`查询映射失败: ${error.message}`);
  }
  if (!data || data.length === 0) {
    throw new Error(`未找到映射: app_token=${app_token}, table_id=${table_id}`);
  }
  const first = data[0];
  const db_schema = first.db_schema;
  const db_table = first.db_table;
  if (!db_schema || !db_table) {
    throw new Error('映射缺少 db_schema 或 db_table');
  }
  // 使用查询出来的映射配置
  const validMappings = data;
  if (validMappings.length === 0) {
    // 无有效字段映射时返回空 rows（避免写入无意义数据）
    return {
      db_schema,
      db_table,
      rows: []
    };
  }
  const rows = [];
  for (const r of records){
    if (!r || !r.record_id) continue;
    const srcFields = r.fields || {};
    const outRow = {
      record_id: r.record_id
    };
    // 根据 db_field 数组循环，构造数据库记录
    for (const mapping of validMappings){
      const dstKey = mapping.db_field;
      const srcKey = mapping.feishu_field_name;
      // ⭐ 关键修改：忽略 id 字段
      if (dstKey === 'id') {
        console.log(`跳过 id 字段映射: ${srcKey} -> ${dstKey}`);
        continue;
      }
      if (srcKey && Object.prototype.hasOwnProperty.call(srcFields, srcKey)) {
        // 如果飞书字段存在，需要转换值
        try {
          // 直接转换单个字段值
          const fieldValue = srcFields[srcKey];
          const converted = transformFieldValue(fieldValue);
          outRow[dstKey] = converted ?? null;
        } catch (error) {
          console.warn(`转换字段 ${srcKey} 失败:`, error);
          outRow[dstKey] = null;
        }
      } else {
        // 如果飞书字段不存在，直接null
        outRow[dstKey] = null;
      }
    }
    rows.push(outRow);
  }
  return {
    db_schema,
    db_table,
    rows
  };
}
