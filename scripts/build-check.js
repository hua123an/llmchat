#!/usr/bin/env node

/**
 * ChatLLM 构建后检查脚本
 * 确保打包后的代码中异步处理正常工作
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 检查打包后的代码质量...\n');

// 检查关键文件是否存在
const requiredFiles = [
  'dist-electron/main.mjs',
  'dist/index.html'
];

console.log('📁 检查必要文件...');
for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`❌ 缺少必要文件: ${file}`);
    process.exit(1);
  } else {
    console.log(`✅ ${file} - 存在`);
  }
}

// 检查主文件中的异步处理
console.log('\n🔬 检查异步处理代码...');

try {
  // 读取打包后的主文件
  const mainFiles = fs.readdirSync('dist-electron').filter(f => /^main-.*\.js$/.test(f));
  
  if (mainFiles.length === 0) {
    console.error('❌ 未找到主处理文件');
    process.exit(1);
  }

  const mainFile = path.join('dist-electron', mainFiles[0]);
  const mainContent = fs.readFileSync(mainFile, 'utf8');

  // 检查关键异步处理是否存在
  const checks = [
    {
      name: 'Promise.resolve token计算',
      pattern: /Promise\.resolve\(\)\.then/,
      critical: true
    },
    {
      name: 'Web搜索异步处理',
      pattern: /Promise\.race\(\[/,
      critical: true
    },
    {
      name: 'AbortSignal超时处理',
      pattern: /AbortSignal\.timeout/,
      critical: true
    },
    {
      name: 'IPC消息处理',
      // 兼容压缩后的变量名和不同空白
      pattern: /\.handle\(("|')send-message\1/,
      critical: true
    }
  ];

  let allPassed = true;
  
  for (const check of checks) {
    const found = check.pattern.test(mainContent);
    const status = found ? '✅' : (check.critical ? '❌' : '⚠️ ');
    const result = found ? '通过' : (check.critical ? '失败 (关键)' : '失败 (非关键)');
    
    console.log(`${status} ${check.name}: ${result}`);
    
    if (!found && check.critical) {
      allPassed = false;
    }
  }

  // 检查潜在的阻塞问题
  console.log('\n⚡ 检查潜在阻塞问题...');
  
  const blockingPatterns = [
    {
      name: '同步文件操作',
      pattern: /fs\.readFileSync|fs\.writeFileSync/,
      warning: '发现同步文件操作，可能导致阻塞'
    },
    {
      name: '长时间同步操作',
      pattern: /for\s*\([^)]*\)\s*\{[^}]{100,}\}/,
      warning: '发现可能的长时间循环操作'
    }
  ];

  for (const pattern of blockingPatterns) {
    if (pattern.pattern.test(mainContent)) {
      console.log(`⚠️  ${pattern.name}: ${pattern.warning}`);
    } else {
      console.log(`✅ ${pattern.name}: 未发现问题`);
    }
  }

  if (!allPassed) {
    console.error('\n❌ 构建检查失败：发现关键问题');
    console.error('建议：');
    console.error('1. 检查 vite.config.ts 配置');
    console.error('2. 确保异步处理代码正确');
    console.error('3. 重新构建应用');
    process.exit(1);
  }

  console.log('\n🎉 构建检查通过！');
  console.log('✨ 异步处理代码完整，打包后应该不会出现阻塞问题');

} catch (error) {
  console.error('❌ 检查过程出错:', error.message);
  process.exit(1);
}
