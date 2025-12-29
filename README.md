# My Supabase Edge Functions

这是一个 Supabase Edge Functions 项目，包含了从云端下载的完整函数代码和 Supabase CLI 工具。

## 项目概述

**项目ID**: `hdwuwrozyaldnrdqzwwz`
**Edge Functions**: 8个生产级函数
**工具**: Supabase CLI v2.67.1
**运行环境**: Deno (Edge Functions 标准)

## Edge Functions 列表

| 函数名 | 功能描述 | 状态 |
|--------|----------|------|
| `deepseek-email-extract` | 使用DeepSeek AI提取邮件内容 | ✅ ACTIVE |
| `process-product-images` | 产品图片处理 | ✅ ACTIVE |
| `feishu-webhook` | 飞书Webhook处理 | ✅ ACTIVE |
| `upsertDBFromBitable` | 飞书多维表格→数据库同步 | ✅ ACTIVE |
| `deleteDBFromBitable` | 删除数据库记录（从飞书） | ✅ ACTIVE |
| `feishuListFields` | 获取飞书字段列表 | ✅ ACTIVE |
| `upsertBitableFromDB` | 数据库→飞书多维表格同步 | ✅ ACTIVE |
| `delete-storage` | 删除存储文件 | ✅ ACTIVE |

## 共享工具库

**`_shared/` 目录包含:**
- `cors.ts` - CORS跨域处理
- `feishuCrypto.ts` - 飞书数据加密
- `getDenoEnv.ts` - 环境变量工具
- `larkClient.ts` - 飞书API客户端
- `supabaseClient.ts` - Supabase客户端工具
- `transBitableRecordsToDB.ts` - 数据转换工具

## 本地开发

### 环境要求
- Node.js v16+
- Supabase CLI v2.67.1

### 启动本地环境
```bash
# 启动 Supabase 本地服务
~/bin/supabase start

# 查看服务状态
~/bin/supabase status
```

### 部署 Edge Functions
```bash
# 部署特定函数
~/bin/supabase functions deploy deepseek-email-extract

# 部署所有函数
for func in deepseek-email-extract process-product-images feishu-webhook upsertDBFromBitable deleteDBFromBitable feishuListFields upsertBitableFromDB delete-storage; do
  ~/bin/supabase functions deploy $func
done
```

### 停止本地服务
```bash
~/bin/supabase stop
```

## 项目结构

```
mysupabase/
├── package.json          # Node.js项目配置
├── package-lock.json     # 依赖锁定文件
├── supabase/             # Supabase 相关文件
│   └── functions/        # Edge Functions 源代码
│       ├── _shared/      # 共享工具库
│       └── [function]/   # 各函数目录
└── README.md             # 项目说明
```