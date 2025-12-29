#!/usr/bin/env node
/**
 * 测试 Supabase Access Token 是否有效
 */

const { execSync } = require('child_process');

const SUPABASE_BIN = '~/bin/supabase';
const PROJECT_REF = 'hdwuwrozyaldnrdqzwwz';

function testToken() {
  console.log('🧪 测试 Supabase Access Token...\n');

  try {
    // 尝试获取用户信息来验证token
    const output = execSync(`${SUPABASE_BIN} projects list`, {
      encoding: 'utf8',
      stdio: 'pipe'
    });

    console.log('✅ Access Token 有效！');
    console.log('您的项目列表:');
    console.log(output);

    // 检查是否包含我们的项目
    if (output.includes(PROJECT_REF)) {
      console.log(`\n✅ 找到目标项目: ${PROJECT_REF}`);
      console.log('🎉 可以开始下载 Edge Functions 了！');
    } else {
      console.log(`\n⚠️  警告: 未找到项目 ${PROJECT_REF}，但token有效`);
    }

    return true;
  } catch (error) {
    console.error('❌ Access Token 无效或格式错误');

    if (error.stderr) {
      console.error('错误详情:', error.stderr);

      if (error.stderr.includes('Invalid access token format')) {
        console.log('\n🔧 解决方案:');
        console.log('1. 访问: https://app.supabase.com/account/tokens');
        console.log('2. 生成新的 access token（格式应为 sbp_xxx...）');
        console.log('3. 不要使用 API keys 或其他类型的token');
      } else if (error.stderr.includes('Access token not provided')) {
        console.log('\n🔧 解决方案:');
        console.log('设置环境变量: export SUPABASE_ACCESS_TOKEN="your_token"');
      }
    }

    return false;
  }
}

if (require.main === module) {
  testToken();
}
