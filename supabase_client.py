"""
Supabase 客户端连接模块
"""
import os
from supabase import create_client, Client
from config import config

def create_supabase_client() -> Client:
    """
    创建 Supabase 客户端

    Returns:
        Client: Supabase 客户端实例

    Raises:
        ValueError: 当配置不完整时抛出
    """
    if not config.validate():
        raise ValueError("Supabase 配置不完整，请检查环境变量")

    print(f"连接到 Supabase: {config.url}")
    return create_client(config.url, config.anon_key)

def create_supabase_admin_client() -> Client:
    """
    创建 Supabase 管理员客户端（使用 service role key）

    Returns:
        Client: Supabase 管理员客户端实例

    Raises:
        ValueError: 当配置不完整时抛出
    """
    if not config.service_role_key:
        raise ValueError("Service role key 未配置")

    print(f"连接到 Supabase (管理员模式): {config.url}")
    return create_client(config.url, config.service_role_key)

# 全局客户端实例
supabase: Client = create_supabase_client()

if __name__ == "__main__":
    # 测试连接
    try:
        # 测试基本连接
        response = supabase.table('_supabase_tables').select('*').limit(1).execute()
        print("✅ Supabase 连接成功")
        print(f"响应: {response}")
    except Exception as e:
        print(f"❌ Supabase 连接失败: {e}")
        print("请检查您的配置和网络连接")
