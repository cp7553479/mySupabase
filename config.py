"""
Supabase 配置模块
"""
import os
from typing import Optional
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

class SupabaseConfig:
    """Supabase 配置类"""

    def __init__(self):
        self.url: Optional[str] = os.getenv('SUPABASE_URL')
        self.anon_key: Optional[str] = os.getenv('SUPABASE_ANON_KEY')
        self.service_role_key: Optional[str] = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        self.jwt_secret: Optional[str] = os.getenv('SUPABASE_JWT_SECRET')
        self.database_url: Optional[str] = os.getenv('DATABASE_URL')

    def validate(self) -> bool:
        """验证配置是否完整"""
        required_fields = [self.url, self.anon_key]
        return all(required_fields)

    def get_connection_info(self) -> dict:
        """获取连接信息"""
        return {
            'url': self.url,
            'anon_key': self.anon_key,
            'service_role_key': self.service_role_key,
            'jwt_secret': self.jwt_secret,
            'database_url': self.database_url
        }

# 全局配置实例
config = SupabaseConfig()

if __name__ == "__main__":
    # 测试配置
    if config.validate():
        print("✅ Supabase 配置验证通过")
        print(f"URL: {config.url}")
        print(f"连接信息: {config.get_connection_info()}")
    else:
        print("❌ Supabase 配置不完整，请检查 .env 文件")
