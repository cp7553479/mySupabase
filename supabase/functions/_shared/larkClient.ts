// Lark (飞书) 客户端模块
import Lark from "npm:@larksuiteoapi/node-sdk";
import { getAppId, getAppSecret } from './getDenoEnv.ts';

// 初始化 Lark 客户端（SDK 会自动管理租户 token）
export const larkClient = new Lark.Client({
  appId: getAppId(),
  appSecret: getAppSecret(),
  disableTokenCache: false,
  // 添加更多配置选项以确保稳定性
  domain: 'https://open.feishu.cn'
});

// 飞书多维表格记录接口
export interface FeishuBitableRecord {
  record_id: string;
  fields: Record<string, any>;
}

// 飞书批量创建记录API响应接口
export interface FeishuBatchCreateResponse {
  code: number;              // 错误码，0表示成功
  msg: string;               // 响应消息
  data: {
    records: Array<{
      record_id: string;      // 记录ID
      fields?: Record<string, any>; // 字段数据（可选）
      created_by?: any;       // 创建者信息（可选）
      created_time?: number;  // 创建时间戳（可选）
      last_modified_by?: any; // 最后修改者信息（可选）
      last_modified_time?: number; // 最后修改时间戳（可选）
    }>;
  };
  record_id: string;         // 提取的第一个记录的record_id，用于向后兼容
}

/**
 * 从飞书多维表格批量获取记录
 * @param app_token 飞书应用token
 * @param table_id 表格ID
 * @param record_ids 需要获取的记录ID数组
 * @returns 飞书表格记录数组
 */
export async function fetchBitableRecords(app_token: string, table_id: string, record_ids: string[]): Promise<FeishuBitableRecord[]> {
  // 入参最小校验
  if (!app_token || !table_id || !Array.isArray(record_ids) || record_ids.length === 0) {
    console.log(`fetchBitableRecords 获取记录: app_token=${app_token}, table_id=${table_id}, 记录数=0`);
    return [];
  }

  const CHUNK_SIZE = 100; // 飞书 batchGet 建议一次最多100条
  const allRecords: FeishuBitableRecord[] = [];

  for (let i = 0; i < record_ids.length; i += CHUNK_SIZE) {
    const batchIds = record_ids.slice(i, i + CHUNK_SIZE);
    try {
      const resp = await larkClient.bitable.v1.appTableRecord.batchGet({
        path: { app_token, table_id },
        data: {
          record_ids: batchIds,
          user_id_type: 'open_id',
          with_shared_url: false,
          automatic_fields: true,
        },
      });
      const records = (resp?.data?.records ?? []) as FeishuBitableRecord[];
      if (records.length === 0 && batchIds.length > 0) {
        console.warn(`fetchBitableRecords 权限或数据问题: app_token=${app_token}, table_id=${table_id}, 请求=${batchIds.length}, 返回=0`);
      }
      allRecords.push(...records);
    } catch (e: any) {
      const errCode = e?.response?.data?.code ?? e?.code;
      if (errCode === 4001254302 || errCode === 4001254303) {
        console.warn('飞书 batchGet 权限不足:', JSON.stringify(e?.response?.data ?? e, null, 2));
        // 权限问题仅打印，继续处理下一批
        continue;
      } else {
        if (e?.response?.data) {
          console.error('飞书表格 batchGet 失败:', JSON.stringify(e.response.data, null, 2));
        } else {
          console.error('飞书 batchGet 异常:', e);
        }
        throw e;
      }
    }
  }

  console.log(`fetchBitableRecords 获取记录: app_token=${app_token}, table_id=${table_id}, 记录数=${allRecords.length}`);
  return allRecords;
}