// Supabase Edge Function: feishuListFields
// 
// ========================================
// 程序运行原理和工作流程
// ========================================
//
// 【核心功能】
// 接收数据库变更事件，调用飞书API获取字段信息并更新数据库
// 用于同步飞书多维表格的字段信息到数据库映射表
//
// 【工作流程】
// 1. 消息接收与验证
//    - 接收PGMQ消息队列的数据库变更消息
//    - 验证消息格式和必需字段（NEW.feishu_app_token, feishu_table_id, id等）
//    - 过滤出有效的记录进行处理
//
// 2. 数据分组处理
//    - 根据feishu_app_token和feishu_table_id进行分组
//    - 相同app_token和table_id的记录合并为一组处理
//    - 提高API调用效率，避免重复请求
//
// 3. 飞书API调用
//    - 获取飞书访问令牌（tenant_access_token）
//    - 调用飞书字段列表API获取表格字段信息
//    - 支持分页处理，获取所有字段数据
//
// 4. 字段信息更新
//    - 根据feishu_field_name匹配字段
//    - 更新数据库记录中的字段ID、类型、名称信息
//    - 使用飞书字段类型映射表转换字段类型
//
// 5. 消息清理
//    - 成功处理的消息从队列中删除
//    - 失败的消息保留在队列中等待重试
//
// 【输入格式（PGMQ消息队列）】
// [
//   {
//     "message_id": 123,
//     "queue_name": "invoke_edge_function_jobs",
//     "schema": "public",
//     "table": "feishuBitable_Mapping",
//     "NEW": {
//       "id": 1,
//       "feishu_app_token": "bascnCMII2ORuAiS8katXFabcde",
//       "feishu_table_id": "tblxxx123456789",
//       "feishu_field_name": "产品名称"
//     }
//   }
// ]
//
// 【输出格式】
// {
//   "message": "Success",
//   "processedGroups": 2,
//   "processedRecords": 5
// }
//
// 【字段类型映射】
/*
多维表格字段类型

可选值有：

1：文本
2：数字
3：单选
4：多选
5：日期
7：复选框
11：人员
13：电话号码
15：超链接
17：附件
18：关联
20：公式
21：双向关联
22：地理位置
23：群组
1001：创建时间
1002：最后更新时间
1003：创建人
1004：修改人
1005：自动编号
*/


import { supabaseClient, deletePgmqMessage } from '../_shared/supabaseClient.ts';
import { jsonResponse } from '../_shared/cors.ts';
import { getAppId, getAppSecret } from '../_shared/getDenoEnv.ts';

/**
 * 获取飞书访问令牌
 */
async function getTenantAccessToken(): Promise<string | null> {
  try {
    const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        app_id: getAppId(),
        app_secret: getAppSecret()
      })
    });
    
    const data = await response.json();
    console.log('Token响应:', JSON.stringify(data, null, 2));
    
    if (data.code !== 0) {
      console.error(`获取token失败: ${data.msg}`);
      return null;
    }
    
    return data.tenant_access_token;
  } catch (error) {
    console.error('获取访问令牌失败:', error);
    return null;
  }
}

/**
 * 调用飞书API获取表格字段列表（使用原生fetch）
 * @param appToken 飞书应用token
 * @param tableId 飞书表格ID
 * @returns 字段列表或null（失败时）
 */
async function getFeishuFields(appToken: string, tableId: string): Promise<any[] | null> {
  try {
    // 验证输入参数
    if (!appToken || !tableId) {
      console.error(`参数验证失败: app_token=${appToken}, table_id=${tableId}`);
      return null;
    }
    
    // 1. 获取访问令牌
    const tenantToken = await getTenantAccessToken();
    if (!tenantToken) {
      console.error('无法获取访问令牌');
      return null;
    }
    
    const allItems: any[] = [];
    let pageToken: string | undefined = undefined;
    const pageSize = 100;
    
    do {
      try {
        // 构建URL
        let url = `https://open.feishu.cn/open-apis/bitable/v1/apps/${appToken}/tables/${tableId}/fields?page_size=${pageSize}`;
        if (pageToken) {
          url += `&page_token=${pageToken}`;
        }
        
        // 使用原生fetch调用API
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${tenantToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        const data = await response.json();
        console.log(`API响应:`, JSON.stringify(data, null, 2));
        
        if (data.code !== 0) {
          console.error(`API调用失败: code=${data.code}, msg=${data.msg}`);
          return null;
        }
        
        if (data?.data?.items) {
          const items = data.data.items;
          console.log(`获取到 ${items.length} 个字段`);
          allItems.push(...items);
          
          // 检查是否还有更多数据
          pageToken = data.data.page_token;
        } else {
          console.warn(`API响应中没有items字段:`, data);
          break;
        }
        
        // 如果没有page_token或为空，说明已经获取完所有数据
        if (!pageToken || pageToken === '') {
          break;
        }
        
      } catch (apiError: any) {
        console.error(`分页API调用失败:`, {
          error: apiError.message,
          pageToken: pageToken,
          stack: apiError.stack
        });
        
        throw apiError;
      }
    } while (pageToken);

    console.log(`成功获取所有字段列表，共${allItems.length}个字段`);
    
    if (allItems.length > 0) {
      console.log(`字段详情:`, allItems.map(item => ({
        field_id: item.field_id,
        field_name: item.field_name,
        type: item.type
      })));
    }
    
    return allItems;
    
  } catch (error: any) {
    console.error(`调用飞书API异常:`, {
      error: error.message,
      app_token: appToken,
      table_id: tableId,
      stack: error.stack
    });
    
    return null;
  }
}

/**
 * 更新数据库记录
 * @param schema 数据库schema
 * @param table 数据库表名
 * @param recordId 记录ID
 * @param fieldData 字段数据
 */
async function updateDatabaseRecord(
  schema: string, 
  table: string, 
  recordId: number, 
  fieldData: { feishu_field_id: string; feishu_field_type: number; feishu_field_name: string }
): Promise<boolean> {
  try {
    console.log(`更新数据库记录: ${schema}.${table}, id=${recordId}`, fieldData);
    
    const { error } = await supabaseClient
      .schema(`${schema}`)
      .from(`${table}`)
      .update({
        feishu_field_id: fieldData.feishu_field_id,
        feishu_field_type: fieldData.feishu_field_type,
        feishu_field_name: fieldData.feishu_field_name
      })
      .eq('id', recordId);

    if (error) {
      console.error(`更新数据库失败:`, error);
      return false;
    }

    console.log(`数据库记录更新成功: id=${recordId}`);
    return true;
  } catch (error) {
    console.error(`更新数据库异常:`, error);
    return false;
  }
}

/**
 * 处理单个分组的记录
 * @param groupKey 分组键（app_token:table_id）
 * @param records 该分组的记录列表
 */
async function processGroup(groupKey: string, records: any[]): Promise<void> {
  const [appToken, tableId] = groupKey.split(':');

  // 调用飞书API获取字段列表
  const fields = await getFeishuFields(appToken, tableId);
  
  if (!fields) {
    console.error(`分组 ${groupKey} 飞书API调用失败，返回null`);
    return;
  }
  
  if (fields.length === 0) {
    console.warn(`分组 ${groupKey} 飞书API调用成功，但返回空字段列表`);
    console.log(`字段详情:`, fields);
    return;
  }
  
  console.log(`分组 ${groupKey} 成功获取到 ${fields.length} 个字段:`, fields.map(f => f.field_name));

  // 为每条记录更新字段信息
  // 根据用户需求：使用飞书API返回的字段信息更新数据库记录
  for (const record of records) {
    const { NEW } = record;
    
    // 查找匹配的字段（根据feishu_field_name）
    const matchingField = fields.find(field => field.field_name === NEW.feishu_field_name);
    
    if (matchingField) {
      const fieldData = {
        feishu_field_id: matchingField.field_id,
        feishu_field_type: matchingField.type,
        feishu_field_name: matchingField.field_name
      };
      
      console.log(`更新记录 ${NEW.id} 的字段信息:`, fieldData);
      await updateDatabaseRecord(record.schema, record.table, NEW.id, fieldData);
    } else {
      console.warn(`未找到匹配的字段: ${NEW.feishu_field_name}，在表格 ${tableId} 中`);
      console.log(`可用的字段列表:`, fields.map(f => f.field_name));
    }
  }
}

// @ts-ignore
Deno.serve(async (req) => {
  try {
    
    // 解析请求体
    const reqJson = await req.json();
    
    // Always operate on an array – wrap single objects
    const payload = Array.isArray(reqJson) ? reqJson : [reqJson];
    console.log('1. 标准化后的payload数组:', JSON.stringify(payload, null, 2));
    
    // 过滤出有效的记录（必须有NEW字段且包含必要信息）
    const validPayload = payload.filter(item => 
      item.NEW && 
      item.NEW.feishu_app_token && 
      item.NEW.feishu_table_id && 
      item.NEW.id &&
      item.schema &&
      item.table
    );
    
    if (validPayload.length === 0) {
      console.log('没有有效的记录需要处理');
      return jsonResponse({ message: 'No valid records to process' });
    }
    
    console.log(`2. 有效记录数量: ${validPayload.length}`);
    
    // 根据feishu_app_token和feishu_table_id进行分组
    const groups = new Map<string, any[]>();
    
    for (const item of validPayload) {
      const groupKey = `${item.NEW.feishu_app_token}:${item.NEW.feishu_table_id}`;
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(item);
    }
    
    // 并发处理所有分组
    const promises = Array.from(groups.entries()).map(([groupKey, records]) => 
      processGroup(groupKey, records)
    );
    
    await Promise.all(promises);
    
    // 删除处理成功的队列消息
    const deletePromises = validPayload.map(async (item) => {
      if (item.message_id) {
        const deleteResult = await deletePgmqMessage('invoke_edge_function_jobs', item.message_id);
        if (deleteResult === 'success') {
          console.log(`成功删除队列消息: message_id=${item.message_id}`);
        } else {
          console.warn(`删除队列消息失败: message_id=${item.message_id}, error=${deleteResult}`);
        }
      }
    });
    
    await Promise.all(deletePromises);
    
    return jsonResponse({ 
      message: 'Success', 
      processedGroups: groups.size,
      processedRecords: validPayload.length 
    });
    
  } catch (error) {
    console.error("function error: ", error);
    return jsonResponse({
      error: error.message ?? "Internal error"
    }, {
      status: 500
    });
  }
});
