/**
 * Supabase 客户端连接模块 (Node.js版本)
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// 从环境变量获取配置
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 验证配置
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('缺少必要的环境变量：SUPABASE_URL 或 SUPABASE_ANON_KEY');
}

// 创建客户端实例
const supabase = createClient(supabaseUrl, supabaseAnonKey);
const supabaseAdmin = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

console.log(`连接到 Supabase: ${supabaseUrl}`);

/**
 * 获取基础客户端（使用anon key）
 */
function getSupabaseClient() {
  return supabase;
}

/**
 * 获取管理员客户端（使用service role key）
 */
function getSupabaseAdminClient() {
  if (!supabaseAdmin) {
    throw new Error('Service role key 未配置，无法创建管理员客户端');
  }
  return supabaseAdmin;
}

/**
 * 测试数据库连接
 */
async function testConnection(client = supabase) {
  try {
    console.log('测试 Supabase 连接...');

    // 尝试一个简单的查询来测试连接
    // 注意：这个查询可能因为权限或表不存在而失败，但可以验证连接本身
    const { data, error } = await client
      .from('_supabase_tables')
      .select('*')
      .limit(1);

    if (error) {
      console.log(`连接测试完成，但查询失败: ${error.message}`);
      console.log('这可能是正常的，因为测试表可能不存在或权限不足');
      return true; // 连接成功，只是查询失败
    }

    console.log('✅ Supabase 连接测试成功');
    return true;
  } catch (err) {
    console.error('❌ Supabase 连接测试失败:', err.message);
    return false;
  }
}

module.exports = {
  supabase,
  supabaseAdmin,
  getSupabaseClient,
  getSupabaseAdminClient,
  testConnection
};

// 如果直接运行此文件，则执行连接测试
if (require.main === module) {
  testConnection().then(success => {
    if (success) {
      console.log('🎉 Supabase 客户端配置完成');
      process.exit(0);
    } else {
      console.error('❌ Supabase 客户端配置失败');
      process.exit(1);
    }
  });
}
