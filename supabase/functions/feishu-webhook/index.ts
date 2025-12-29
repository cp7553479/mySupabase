// Supabase Edge Function: feishu-webhook
// Purpose: Receive Feishu (Lark) encrypted webhook, decrypt, and return { challenge }
// Env secrets required:
// - FEISHU_supabase-feishu-bridge_ENCRYPT_KEY: the Encrypt Key from Feishu console
// - FEISHU_supabase-feishu-bridge_VERIFICATION_KEY: if set, will be validated against decrypted token
import { createHash } from "node:crypto";
import { getEncryptKey } from '../_shared/getDenoEnv.ts';
import { supabaseClient, deleteRecords } from '../_shared/supabaseClient.ts';
import { decryptFeishu } from '../_shared/feishuCrypto.ts';
import { jsonResponse } from '../_shared/cors.ts';
// 处理事件
// 事件请求体请参考https://open.feishu.cn/document/docs/bitable-v1/events/bitable_record_changed#bea8b65
async function doAction(eventBody) {
  console.log("eventBody:", eventBody);
  const grouped = eventBody.event.action_list.reduce((acc, item)=>{
    // action 可能: "record_added", "record_deleted", "record_edited"
    const key = item.action;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    // 同时分组记录 record_id
    if (key === "record_added" && item.record_id) {
      acc.record_id_added.push(item.record_id);
    } else if (key === "record_deleted" && item.record_id) {
      acc.record_id_deleted.push(item.record_id);
    } else if (key === "record_edited" && item.record_id) {
      acc.record_id_edited.push(item.record_id);
    }
    return acc;
  }, {
    record_added: [],
    record_deleted: [],
    record_edited: [],
    record_id_added: [],
    record_id_deleted: [],
    record_id_edited: []
  });

  // 处理 add 和 update 操作 - 发送到 upsertDBFromBitable 队列
  const upsertRecordIds = Array.from(new Set([
    ...grouped.record_id_added,
    ...grouped.record_id_edited
  ].filter(Boolean)));
  
  if (upsertRecordIds.length > 0) {
    console.log("发送 upsert 消息到队列，记录数:", upsertRecordIds.length);
    const upsertMessage = {
      app_token: eventBody.event.file_token,
      table_id: eventBody.event.table_id,
      records: upsertRecordIds.map(record_id => ({ record_id }))
    };
    
    try {
      const upsertResult = await supabaseClient.schema('pgmq_public').rpc('send', {
        message: {"function_name": "upsertDBFromBitable", ...upsertMessage},
        queue_name: 'invoke_edge_function_jobs',
        sleep_seconds: 0
      });
      console.log("upsert send 结果:", JSON.stringify(upsertResult, null, 2));
      console.log("成功发送 upsert 消息到队列");
    } catch (error) {
      console.error("发送 upsert 消息失败:", error);
    }
  }

  // 处理 delete 操作 - 直接异步调用deleteRecords批量删除
  if (grouped.record_id_deleted.length > 0) {
    console.log("开始异步删除记录，记录数:", grouped.record_id_deleted.length);
    
    // 异步非阻塞调用删除操作
    (async () => {
      try {
        console.log(`[异步删除] 开始处理 ${grouped.record_id_deleted.length} 条删除记录`);
        
        // 查询映射配置获取数据库表信息
        const { data: mappingData, error: mappingError } = await supabaseClient
          .from('feishuBitable_Mapping')
          .select('db_schema, db_table')
          .eq('app_token', eventBody.event.file_token)
          .eq('table_id', eventBody.event.table_id)
          .single();

        if (mappingError) {
          console.error(`[异步删除] 查询映射配置失败:`, mappingError);
          return;
        }

        if (!mappingData) {
          console.error(`[异步删除] 未找到映射配置: app_token=${eventBody.event.file_token}, table_id=${eventBody.event.table_id}`);
          return;
        }

        const { db_schema, db_table } = mappingData;
        console.log(`[异步删除] 映射结果: db_schema=${db_schema}, db_table=${db_table}`);

        // 构造删除数据
        const deleteRows = grouped.record_id_deleted
          .filter(Boolean)
          .map(record_id => ({ record_id }));

        if (deleteRows.length > 0) {
          console.log(`[异步删除] 开始删除数据库记录: ${db_schema}.${db_table}`);
          const deleteResult = await deleteRecords(
            `${db_schema}.${db_table}`,
            deleteRows,
            'record_id'
          );
          console.log(`[异步删除] 数据库删除结果:`, deleteResult);
          
          if (deleteResult === 'success') {
            console.log(`[异步删除] 成功删除 ${deleteRows.length} 条记录`);
          } else {
            console.error(`[异步删除] 删除失败:`, deleteResult);
          }
        } else {
          console.log(`[异步删除] 没有有效的记录需要删除`);
        }
      } catch (error) {
        console.error(`[异步删除] 处理过程中发生错误:`, error);
      }
    })();
    
    console.log("异步删除操作已启动，不阻塞主流程");
  }
}
// --- 主流程 ---
/**
 * 事件：https://open.feishu.cn/document/docs/bitable-v1/events/bitable_record_changed
 * 开放平台设置订阅权限：https://open.feishu.cn/document/server-docs/event-subscription-guide/overview
 * 主动激活事件订阅：https://open.feishu.cn/document/server-docs/docs/docs-assistant/file-subscription/create
 * 请求整体要求
 * Content-Type：一般为 application/json（你用 JSON.parse(await req.arrayBuffer()) 读取），所以必须是标准 JSON 格式体
 * Body：必须是JSON字符串，结构如下
 * A. 明文模式（未加密，直接 challenge）
  json
  {
    "challenge": "xxx" // 字符串，飞书接口标准
  }
  用于 Feishu 验证 webhook 时直接 challenge 响应

  B. 加密事件通知（飞书推送的常用 webhook 格式）
  json
  {
    "encrypt": "base64_encoded_string" // 主体为 base64 加密字符串
  }
  其中 decrypt 后解密出的结构应为：

  json
  {
    "event": {
      "table_id": "tblxxxx...",
      "action_list": [
        {
          "action": "record_added" | "record_deleted" | "record_edited",
          "record_id": "recxxxx...", // 目标记录
          ...
        }
        // ... 可多个action
      ],
      // 其它 feishu 事件数据
    },
    "challenge": "xxx" //有时也有
  }
  C. Header 要求
  飞书安全校验用到的 Header 必须齐全：

  "X-Lark-Request-Timestamp"

  "X-Lark-Request-Nonce"

  "X-Lark-Signature"

  这些都是飞书 webhook 安全校验必需。否则你签名验证时会失败。
*/ 
console.info("feishu-supabase-feishu-bridge-webhook function started");

// @ts-ignore
Deno.serve(async (req)=>{
  try {
    // 1. 读取原始body用于签名
    const rawBody = await req.arrayBuffer();
    const rawBodyUint8 = new Uint8Array(rawBody);
    const rawBodyString = new TextDecoder().decode(rawBodyUint8);
    // 2. 读取header
    const timestamp = req.headers.get("X-Lark-Request-Timestamp");
    const nonce = req.headers.get("X-Lark-Request-Nonce");
    const signature = req.headers.get("X-Lark-Signature");
    const encryptKey = getEncryptKey();
    // 3. 尝试解析payload，并解密
    let payload;
    try {
      payload = JSON.parse(rawBodyString);
    } catch (e) {
      console.error("解析JSON失败", e);
      return jsonResponse({
        error: "Invalid JSON"
      }, {
        status: 400
      });
    }
    let decryptedEvent: any = null;
    if (typeof payload.encrypt === "string") {
      try {
        decryptedEvent = await decryptFeishu(payload.encrypt, encryptKey);
      } catch (err) {
        console.error("解密异常:", err);
        return jsonResponse({
          error: err.message ?? "解密错误"
        }, {
          status: 400
        });
      }
    }
    try {
      // 4. 再做签名校验（签名规则完全符合你的要求）
      const enc = new TextEncoder();
      const b1 = new Uint8Array([
        ...enc.encode(String(timestamp ?? "")),
        ...enc.encode(String(nonce ?? "")),
        ...enc.encode(encryptKey)
      ]);
      // 注意：签名用的是"原始事件body",即原body字符串/Uint8Array
      const b = new Uint8Array(b1.length + rawBodyUint8.length);
      b.set(b1, 0);
      b.set(rawBodyUint8, b1.length);
      const s = createHash("sha256").update(b).digest("hex");
      // 5. 校验成功才doAction
      if (s === signature && decryptedEvent) {
        void doAction(decryptedEvent); // 异步调用执行 doAction，不要 await！fire-and-forget
      }
    } catch (error) {
      console.error("签名校验执行doAction异常:" + error.message);
    }
    // 6. challenge响应
    if (decryptedEvent && decryptedEvent.challenge) {
      console.log("challenge:" + String(decryptedEvent.challenge));
      return jsonResponse({
        challenge: String(decryptedEvent.challenge)
      });
    }
    // 明文challenge同样支持
    if (typeof payload.challenge === "string") {
      console.log("challenge:" + String(payload.challenge));
      return jsonResponse({
        challenge: String(payload.challenge)
      });
    }
    // 接收到事件时，正常响应返回 HTTP 200，并携带 event_id，避免重复接收到事件
    console.log("事件返回："+decryptedEvent.header.event_id);
    return jsonResponse({
      event_id: decryptedEvent.header.event_id
    });
  } catch (err) {
    console.error("function error: ", err);
    return jsonResponse({
      error: err.message ?? "Internal error"
    }, {
      status: 400
    });
  }
});
