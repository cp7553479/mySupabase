# 下载 Supabase Edge Functions 指南

## 问题说明

当前项目中的 Edge Functions 是示例代码，与您云实例上的实际函数不一致。

## 解决方案：使用 Supabase CLI 下载真实函数

### 步骤1: 获取 Access Token

Supabase CLI 需要有效的 access token 来访问您的项目。

#### 方法1: 通过浏览器登录（推荐）
```bash
npm run supabase-login
```
这将打开浏览器，让您登录 Supabase 账户。

#### 方法2: 手动获取 Access Token
1. 访问: https://app.supabase.com/account/tokens
2. 点击 "Generate new token"
3. 复制生成的 token（格式类似：`sbp_0102...1920`）
4. **重要**: 确保复制的是完整的 access token，不要复制其他类型的key

**常见错误**:
- ❌ `sb_secret_xxx` - 这是错误的格式
- ❌ API keys (anon/service_role) - 不是access token
- ✅ `sbp_0102...1920` - 正确的access token格式

#### 方法3: 使用环境变量
```bash
export SUPABASE_ACCESS_TOKEN="your_token_here"
```

### 步骤2: 下载 Edge Functions

一旦设置了 access token，使用以下命令：

```bash
# 下载所有函数
npm run download-functions

# 或者直接使用
node download_functions.js
```

### 步骤3: 验证下载结果

下载完成后，检查 `supabase/functions/` 目录：
```bash
ls -la supabase/functions/
```

## 故障排除

### 错误: "Access token not provided"
- 确保已运行 `supabase login` 或设置了 `SUPABASE_ACCESS_TOKEN` 环境变量

### 错误: "Invalid access token format"
- Access token 必须是 `sbp_xxx` 格式，不是 API keys

### 错误: "Project not found"
- 确保项目引用正确：`hdwuwrozyaldnrdqzwwz`

### 没有函数？
- 您的 Supabase 项目可能还没有创建任何 Edge Functions
- 访问 Supabase Dashboard -> Edge Functions 来创建

## 手动下载特定函数

如果知道函数名称，可以直接下载：

```bash
supabase functions download function-name --project-ref hdwuwrozyaldnrdqzwwz
```

## 查看云端函数列表

```bash
supabase functions list --project-ref hdwuwrozyaldnrdqzwwz
```

## 注意事项

- 下载的函数将覆盖本地同名函数
- 确保您的 Supabase CLI 是最新版本
- Access token 是敏感信息，不要提交到版本控制
