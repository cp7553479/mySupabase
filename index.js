/**
 * My Supabase Project - Node.js版本
 * 主入口文件
 */

const { testConnection } = require('./supabase-client');

async function main() {
  console.log('🚀 启动 My Supabase 项目 (Node.js版本)');
  console.log('');

  // 测试连接
  const connected = await testConnection();

  if (connected) {
    console.log('');
    console.log('📝 使用说明:');
    console.log('  - 查看数据库表: 使用 supabase-client.js 中的函数');
    console.log('  - 开发Edge Functions: 查看 supabase/functions/ 目录');
    console.log('  - 运行测试: npm run test-connection');
    console.log('');
    console.log('🎉 项目已就绪！');
  } else {
    console.error('❌ 连接失败，请检查 .env 文件配置');
    process.exit(1);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
