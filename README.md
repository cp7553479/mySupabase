# My Supabase Project

我的 Supabase 项目，包含 Supabase 实例的连接信息和 Edge Functions 源代码。

## 项目结构

```
mysupabase/
├── venv/                          # Python 虚拟环境
├── supabase/                      # Supabase 相关文件
│   ├── functions/                 # Edge Functions 源代码
│   │   └── hello-world/          # 示例 Edge Function
│   │       └── index.ts
│   └── config.toml               # Supabase 本地开发配置
├── config.py                      # Python 配置模块
├── supabase_client.py            # Supabase 客户端连接
├── requirements.txt               # Python 依赖
└── README.md                      # 项目说明
```

## 快速开始

### 1. 环境准备

首先，确保你已经安装了 Python 3.8+ 和 Supabase CLI。

### 2. 安装依赖

```bash
# 激活虚拟环境
source venv/bin/activate

# 安装 Python 依赖
pip install -r requirements.txt
```

### 3. 配置环境变量

复制环境变量模板并填写你的 Supabase 信息：

```bash
cp .env.template .env
```

编辑 `.env` 文件，填入你的 Supabase 项目信息：

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_JWT_SECRET=your_supabase_jwt_secret
DATABASE_URL=your_postgresql_connection_string
```

### 4. 获取 Supabase 配置信息

在 [Supabase Dashboard](https://app.supabase.com) 中：

1. 进入你的项目
2. 前往 Settings -> API
3. 复制以下信息：
   - Project URL
   - Project API keys (anon public)
   - Project API keys (service_role)
   - JWT Secret

## 使用方法

### Python 客户端连接

```python
from supabase_client import supabase

# 查询数据
response = supabase.table('your_table').select('*').execute()
print(response.data)

# 插入数据
data = {'name': 'example', 'value': 123}
response = supabase.table('your_table').insert(data).execute()
```

### Edge Functions 开发

#### 本地开发

```bash
# 启动 Supabase 本地服务
supabase start

# 部署 Edge Function
supabase functions deploy hello-world
```

#### 调用 Edge Function

```bash
curl -X POST 'http://127.0.0.1:54327/functions/v1/hello-world' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"name": "World"}'
```

## 常用命令

### Supabase CLI

```bash
# 初始化项目
supabase init

# 启动本地服务
supabase start

# 停止本地服务
supabase stop

# 部署 Edge Functions
supabase functions deploy <function-name>

# 查看状态
supabase status
```

### Python 开发

```bash
# 激活虚拟环境
source venv/bin/activate

# 运行测试脚本
python supabase_client.py

# 运行你的应用
python your_app.py
```

## 配置说明

### config.py

包含 Supabase 连接配置的 Python 模块：

- `SupabaseConfig`: 配置类
- `config`: 全局配置实例
- `validate()`: 验证配置完整性
- `get_connection_info()`: 获取连接信息

### supabase_client.py

提供 Supabase 客户端连接：

- `create_supabase_client()`: 创建普通客户端
- `create_supabase_admin_client()`: 创建管理员客户端
- `supabase`: 全局客户端实例

## 注意事项

1. **安全**: 不要将 `.env` 文件提交到版本控制系统
2. **密钥**: Service Role Key 有完全权限，只在服务器端使用
3. **网络**: 确保防火墙允许 Supabase 相关端口通信
4. **版本**: 保持 Supabase CLI 和 Python SDK 为最新版本

## 故障排除

### 连接问题

1. 检查网络连接
2. 验证 API 密钥是否正确
3. 确认项目 URL 格式

### Edge Functions 问题

1. 确保 Deno 运行时可用
2. 检查函数代码语法
3. 查看 Supabase 日志：`supabase functions logs`

### Python 依赖问题

```bash
# 重新安装依赖
pip install --upgrade -r requirements.txt

# 检查虚拟环境
which python
# 应该显示: /path/to/your/project/venv/bin/python
```

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

[MIT License](LICENSE)
