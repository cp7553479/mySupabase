#!/usr/bin/env node
/**
 * 下载 Supabase Edge Functions 脚本 (使用 Supabase CLI)
 * 需要有效的 access token
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_REF = 'hdwuwrozyaldnrdqzwwz';
const SUPABASE_BIN = '~/bin/supabase';

function checkSupabaseCLI() {
  try {
    const version = execSync(`${SUPABASE_BIN} --version`, { encoding: 'utf8' });
    console.log(`✅ Supabase CLI 版本: ${version.trim()}`);
    return true;
  } catch (error) {
    console.error('❌ Supabase CLI 未找到，请确保已安装');
    console.error('安装命令: curl -fsSL https://raw.githubusercontent.com/supabase/cli/main/install.sh | sh');
    return false;
  }
}

function listFunctions() {
  console.log('📋 获取云端 Edge Functions 列表...');

  try {
    const output = execSync(`${SUPABASE_BIN} functions list --project-ref ${PROJECT_REF}`, {
      encoding: 'utf8',
      stdio: 'pipe'
    });

    console.log('找到的函数:');
    console.log(output);
    return output;
  } catch (error) {
    console.error('❌ 获取函数列表失败:');
    console.error(error.stderr || error.message);

    if (error.stderr && error.stderr.includes('Access token not provided')) {
      console.log('\n🔑 需要设置 access token:');
      console.log('方法1 - 环境变量:');
      console.log('export SUPABASE_ACCESS_TOKEN="your_access_token_here"');
      console.log('\n方法2 - CLI登录:');
      console.log('supabase login');
      console.log('\n方法3 - 使用token参数:');
      console.log('supabase login --token "your_access_token_here"');
      console.log('\n获取 access token:');
      console.log('1. 访问: https://app.supabase.com/account/tokens');
      console.log('2. 生成新的 access token');
      console.log('3. 使用生成的 token');
    }

    return null;
  }
}

function downloadFunction(functionName) {
  console.log(`📥 下载函数: ${functionName}`);

  try {
    const output = execSync(`${SUPABASE_BIN} functions download ${functionName} --project-ref ${PROJECT_REF}`, {
      encoding: 'utf8',
      stdio: 'pipe'
    });

    console.log(`✅ 函数 ${functionName} 下载成功`);
    return true;
  } catch (error) {
    console.error(`❌ 下载函数 ${functionName} 失败:`);
    console.error(error.stderr || error.message);
    return false;
  }
}

function main() {
  console.log('🚀 开始下载 Supabase Edge Functions...\n');

  // 检查 CLI
  if (!checkSupabaseCLI()) {
    process.exit(1);
  }

  // 获取函数列表
  const functionsList = listFunctions();
  if (!functionsList) {
    console.log('\n❌ 无法获取函数列表，请解决认证问题后重试');
    process.exit(1);
  }

  // 解析函数名称 (这里需要根据实际输出格式调整)
  const functions = parseFunctionsFromOutput(functionsList);

  if (functions.length === 0) {
    console.log('ℹ️ 没有找到任何 Edge Functions');
    return;
  }

  console.log(`\n📦 开始下载 ${functions.length} 个函数...\n`);

  // 下载每个函数
  for (const funcName of functions) {
    downloadFunction(funcName);
  }

  console.log('\n🎉 下载完成！');
}

function parseFunctionsFromOutput(output) {
  // 这是一个简单的解析器，根据 supabase functions list 的输出格式
  // 实际格式可能需要调整
  const lines = output.split('\n');
  const functions = [];

  for (const line of lines) {
    // 查找包含函数名称的行 (需要根据实际输出调整)
    if (line.trim() && !line.includes('NAME') && !line.includes('STATUS') && line.length > 0) {
      // 简单提取函数名称
      const funcName = line.trim().split(/\s+/)[0];
      if (funcName && funcName !== 'NAME' && funcName !== 'STATUS') {
        functions.push(funcName);
      }
    }
  }

  return functions;
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, listFunctions, downloadFunction };
