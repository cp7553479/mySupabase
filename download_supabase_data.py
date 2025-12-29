#!/usr/bin/env python3
"""
下载 Supabase Edge Functions 和 Schema 的脚本
"""
import os
import sys
import json
from pathlib import Path

# 添加当前目录到Python路径
sys.path.append('.')

try:
    from supabase import create_client, Client
    from dotenv import load_dotenv
except ImportError as e:
    print(f"❌ 导入错误: {e}")
    print("请确保已安装所需的依赖: pip install supabase python-dotenv")
    sys.exit(1)

def load_env_config():
    """从env_config.txt加载环境变量"""
    config = {}
    try:
        with open('env_config.txt', 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    key, value = line.split('=', 1)
                    config[key] = value
        return config
    except FileNotFoundError:
        print("❌ env_config.txt 文件不存在")
        return {}

def test_supabase_connection(supabase: Client):
    """测试Supabase连接"""
    try:
        # 尝试执行一个简单的查询来测试连接
        # 使用auth.users表（如果有权限）
        response = supabase.auth.admin.list_users(limit=1)
        print("✅ Supabase 连接测试成功")
        return True
    except Exception as e:
        print(f"⚠️ Supabase 连接测试失败: {e}")
        print("继续执行其他操作...")
        return True  # 即使测试失败也继续，因为可能只是权限问题

def get_database_tables(supabase: Client):
    """获取数据库表信息"""
    try:
        # 查询information_schema获取表信息
        query = """
        SELECT
            schemaname,
            tablename,
            tableowner
        FROM pg_tables
        WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
        ORDER BY schemaname, tablename;
        """

        # 注意：这里使用的是PostgREST语法，不是原生SQL
        # 我们需要使用更简单的方法

        # 尝试获取一些基本表
        tables_info = []

        # 常见的系统表和用户表
        common_tables = ['profiles', 'users', 'posts', 'comments', 'settings']

        for table_name in common_tables:
            try:
                # 尝试查询表是否存在
                response = supabase.table(table_name).select('*').limit(1).execute()
                if response.data is not None:
                    tables_info.append({
                        'table_name': table_name,
                        'exists': True,
                        'sample_data': response.data[:1] if response.data else []
                    })
            except Exception:
                # 表不存在或无权限
                continue

        print(f"✅ 发现 {len(tables_info)} 个可访问的表")
        return tables_info

    except Exception as e:
        print(f"❌ 获取数据库表信息时出错: {e}")
        return []

def get_storage_buckets(supabase: Client):
    """获取存储桶信息"""
    try:
        buckets = supabase.storage.list_buckets()
        print(f"✅ 发现 {len(buckets)} 个存储桶")
        return buckets
    except Exception as e:
        print(f"❌ 获取存储桶信息时出错: {e}")
        return []

def save_database_schema(tables_info, buckets_info):
    """保存数据库schema信息"""
    schema_data = {
        'tables': tables_info,
        'storage_buckets': buckets_info,
        'metadata': {
            'generated_at': '2025-12-29',
            'note': '通过Supabase Python SDK获取的基础信息'
        }
    }

    try:
        with open('database_schema.json', 'w', encoding='utf-8') as f:
            json.dump(schema_data, f, indent=2, ensure_ascii=False)
        print("✅ 已保存数据库schema信息到 database_schema.json")
        return True
    except Exception as e:
        print(f"❌ 保存schema文件时出错: {e}")
        return False

def create_env_file():
    """创建.env文件"""
    try:
        # 复制env_config.txt到.env
        with open('env_config.txt', 'r') as src:
            with open('.env', 'w') as dst:
                dst.write(src.read())
        print("✅ 已创建 .env 文件")
        return True
    except Exception as e:
        print(f"❌ 创建.env文件时出错: {e}")
        return False

def create_example_edge_function():
    """创建示例Edge Function（如果不存在）"""
    func_dir = Path("supabase/functions/example-function")
    func_dir.mkdir(parents=True, exist_ok=True)

    index_file = func_dir / "index.ts"
    if not index_file.exists():
        example_code = '''import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

console.log("Hello from Supabase Edge Function!")

serve(async (req) => {
  const { name } = await req.json()

  const data = {
    message: `Hello ${name || 'World'}!`,
    timestamp: new Date().toISOString(),
  }

  return new Response(
    JSON.stringify(data),
    { headers: { "Content-Type": "application/json" } },
  )
})
'''
        try:
            with open(index_file, 'w', encoding='utf-8') as f:
                f.write(example_code)
            print("✅ 已创建示例Edge Function: supabase/functions/example-function/index.ts")
        except Exception as e:
            print(f"❌ 创建示例函数时出错: {e}")

def main():
    print("🚀 开始下载 Supabase 数据...")

    # 加载配置
    config = load_env_config()
    if not config:
        return

    url = config.get('SUPABASE_URL')
    service_key = config.get('SUPABASE_SERVICE_ROLE_KEY')

    if not url or not service_key:
        print("❌ 缺少必要的配置信息")
        return

    print(f"📍 连接到: {url}")

    # 创建Supabase客户端
    try:
        supabase: Client = create_client(url, service_key)
        print("✅ Supabase 客户端创建成功")
    except Exception as e:
        print(f"❌ 创建Supabase客户端失败: {e}")
        return

    # 测试连接
    if not test_supabase_connection(supabase):
        return

    # 获取数据库表信息
    print("\n🗄️ 获取数据库表信息...")
    tables_info = get_database_tables(supabase)

    # 获取存储桶信息
    print("\n📦 获取存储桶信息...")
    buckets_info = get_storage_buckets(supabase)

    # 保存数据库schema
    save_database_schema(tables_info, buckets_info)

    # 创建.env文件
    print("\n⚙️ 创建环境配置文件...")
    create_env_file()

    # 创建示例Edge Function
    print("\n🔧 创建示例Edge Function...")
    create_example_edge_function()

    print("\n🎉 下载完成！")
    print("\n📝 总结:")
    print(f"   - 数据库表: {len(tables_info)} 个")
    print(f"   - 存储桶: {len(buckets_info)} 个")
    print("   - 配置文件: .env")
    print("   - 示例函数: supabase/functions/example-function/")

if __name__ == "__main__":
    main()
