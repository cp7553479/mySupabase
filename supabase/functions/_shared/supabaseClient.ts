// Supabase 客户端模块
import { createClient } from 'npm:@supabase/supabase-js@2';
import { getSupabaseUrl, getSupabaseServiceRoleKey } from './getDenoEnv.ts';

// 初始化 Supabase 客户端（使用 SERVICE_ROLE 密钥）
export const supabaseClient = createClient(
  getSupabaseUrl(),
  getSupabaseServiceRoleKey()
);

/**
 * 插入或更新记录到指定表
 * @param table - 表名，支持 schema.table 格式，默认 schema 为 public
 * @param records - 要插入或更新的记录，可以是单个对象或对象数组
 * @param onConflict - 必填，用于判断记录是否存在的唯一键字段
 * @returns Promise<"success" | string> - 成功返回"success"，失败返回错误信息
 */
export async function upsertRecords(
  table: string,
  records: Record<string, any> | Record<string, any>[],
  onConflict: string
): Promise<"success" | string> {
  try {
    console.log('[upsertRecords] 参数:', { table, records, onConflict });

    // 参数验证
    if (!table || !records || !onConflict) {
      throw new Error("table, records, onConflict 参数均为必填");
    }

    // 解析 schema 和 table
    const [schema, tableName] = table.includes('.') ? table.split('.', 2) : ['public', table];
    
    // 转换为数组
    const recordsArray = Array.isArray(records) ? records : [records];
    if (recordsArray.length === 0) {
      throw new Error("records 数组不能为空");
    }

    // 校验每条记录都包含 onConflict 字段且值不为 null/undefined
    for (const record of recordsArray) {
      if (record[onConflict] == null) {
        throw new Error(`记录缺少必需的 ${onConflict} 字段或值为 null: ${JSON.stringify(record)}`);
      }
    }

    // 逐条查询现有记录，避免批量查询导致请求头过大
    const existingSet = new Set<any>();
    const toInsert: Record<string, any>[] = [];
    const toUpdate: Record<string, any>[] = [];

    for (const record of recordsArray) {
      const conflictValue = record[onConflict];
      console.log(`[upsertRecords] 查询记录: ${onConflict}=${conflictValue}`);
      
      const { data: existingRecord, error: selectError } = await supabaseClient
        .schema(schema)
        .from(tableName)
        .select(onConflict)
        .eq(onConflict, conflictValue)
        .single();

      if (selectError) {
        // 如果是记录不存在的错误，则为新记录
        if (selectError.code === 'PGRST116') {
          toInsert.push(record);
          console.log(`[upsertRecords] 新记录待插入: ${onConflict}=${conflictValue}`);
        } else {
          throw new Error(`查询失败 (${onConflict}=${conflictValue}): ${selectError.message}`);
        }
      } else {
        // 记录存在，需要更新
        existingSet.add(conflictValue);
        toUpdate.push(record);
        console.log(`[upsertRecords] 现有记录待更新: ${onConflict}=${conflictValue}`);
      }
    }

    console.log(`[upsertRecords] 现有记录:`, Array.from(existingSet));

    console.log(`[upsertRecords] 待插入: ${toInsert.length}, 待更新: ${toUpdate.length}`);

    // 执行 INSERT
    if (toInsert.length > 0) {
      const { error: insertError } = await supabaseClient
        .schema(schema)
        .from(tableName)
        .insert(toInsert);
      if (insertError) {
        throw new Error(`插入失败: ${insertError.message}`);
      }
    }

    // 执行 UPDATE（逐条）
    for (const record of toUpdate) {
      const { error: updateError } = await supabaseClient
        .schema(schema)
        .from(tableName)
        .update(record)
        .eq(onConflict, record[onConflict]);
      if (updateError) {
        throw new Error(`更新失败 (${onConflict}=${record[onConflict]}): ${updateError.message}`);
      }
    }

    return "success";
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Unknown error";
    console.error('[upsertRecords] 错误:', errMsg);
    return errMsg;
  }
}

/**
 * 删除PGMQ队列中的消息（不会抛出异常）
 * - 仅在函数体内打印删除结果或错误信息
 * - 调用方无需 try/catch；返回 "success" 或错误信息字符串
 * @param queueName - 队列名称
 * @param msgId - 消息ID
 * @returns Promise<"success" | string>
 */
export async function deletePgmqMessage(
  queueName: string,
  msgId: number
): Promise<"success" | string> {
  // 参数验证（不抛出异常）
  if (!queueName || !msgId) {
    const msg = "Queue name and message ID are required";
    console.error(msg);
    return msg;
  }

  try {
    const { error } = await supabaseClient
      .schema('pgmq_public')
      .rpc('delete', { queue_name: queueName, message_id: msgId });

    if (error) {
      console.error(`[PGMQ delete] 失败 queue=${queueName}, id=${msgId}:`, error.message);
      return error.message;
    }

    console.log(`[PGMQ delete] 成功 queue=${queueName}, id=${msgId}`);
    return "success";
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error occurred";
    console.error(`[PGMQ delete] 异常 queue=${queueName}, id=${msgId}:`, msg);
    return msg;
  }
}

/**
 * 删除指定表中的记录
 * @param table - 表名，支持 schema.table 格式，默认 schema 为 public
 * @param records - 要删除的记录，可以是单个对象或对象数组，必须包含用于匹配的字段
 * @param onConflict - 用于匹配删除条件的字段名
 * @returns Promise<"success" | string> - 成功返回"success"，失败返回错误信息
 */
export async function deleteRecords(
  table: string,
  records: Record<string, any> | Record<string, any>[],
  onConflict: string
): Promise<"success" | string> {
  try {
    console.log('[deleteRecords] 参数:', { table, records, onConflict });

    // 参数验证
    if (!table || !records || !onConflict) {
      throw new Error("table, records, onConflict 参数均为必填");
    }

    // 解析 schema 和 table
    const [schema, tableName] = table.includes('.') 
      ? table.split('.', 2) 
      : ['public', table];

    // 将单个记录转换为数组格式
    const recordsArray = Array.isArray(records) ? records : [records];
    
    if (recordsArray.length === 0) {
      throw new Error("records 数组不能为空");
    }

    // 验证所有记录都包含必要的匹配字段
    for (const record of recordsArray) {
      if (record[onConflict] == null) {
        throw new Error(`记录缺少必需的 ${onConflict} 字段或值为 null: ${JSON.stringify(record)}`);
      }
    }

    // 逐条删除记录，避免批量删除导致请求头过大
    let deletedCount = 0;
    for (const record of recordsArray) {
      const conflictValue = record[onConflict];
      console.log(`[deleteRecords] 删除记录: ${onConflict}=${conflictValue}`);
      
      const { error } = await supabaseClient
        .schema(schema)
        .from(tableName)
        .delete()
        .eq(onConflict, conflictValue);

      if (error) {
        throw new Error(`删除失败 (${onConflict}=${conflictValue}): ${error.message}`);
      }
      
      deletedCount++;
      console.log(`[deleteRecords] 成功删除记录: ${onConflict}=${conflictValue}`);
    }

    console.log(`[deleteRecords] 总共删除 ${deletedCount} 条记录`);
    return "success";
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Unknown error";
    console.error('[deleteRecords] 错误:', errMsg);
    return errMsg;
  }
}