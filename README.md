# Supabase Edge Functions

项目ID: hdwuwrozyaldnrdqzwwz

## 函数列表

- `deepseek-email-extract` - DeepSeek提取邮件内容
- `process-product-images` - 处理产品图片
- `feishu-webhook` - 飞书webhook处理
- `upsertDBFromBitable` - 飞书表格同步到数据库
- `deleteDBFromBitable` - 从飞书删除数据库记录
- `feishuListFields` - 获取飞书字段列表
- `upsertBitableFromDB` - 数据库同步到飞书表格
- `delete-storage` - 删除存储文件

## 共享工具

- `cors.ts` - CORS处理
- `feishuCrypto.ts` - 飞书加密
- `getDenoEnv.ts` - 环境变量
- `larkClient.ts` - 飞书客户端
- `supabaseClient.ts` - Supabase客户端
- `transBitableRecordsToDB.ts` - 数据转换

## 常用命令

启动本地服务:
```bash
supabase start
supabase status
```

部署函数:
```bash
supabase functions deploy 函数名
```

停止服务:
```bash
supabase stop
```

## 结构

```
supabase/
  functions/
    _shared/     # 工具库
    [函数名]/    # 各函数
```