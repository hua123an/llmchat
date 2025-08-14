#!/usr/bin/env node

/**
 * ChatLLM 构建脚本
 * 用于自动化构建和打包流程
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 开始构建 ChatLLM...\n');

// 构建步骤
const steps = [
  {
    name: '清理旧构建文件',
    command: 'rimraf dist dist-electron dist-app',
    description: '删除之前的构建输出'
  },
  {
    name: 'TypeScript 类型检查',
    command: 'vue-tsc --noEmit',
    description: '验证 TypeScript 类型'
  },
  {
    name: '构建前端资源',
    command: 'vite build',
    description: '编译和优化前端代码'
  },
  {
    name: '构建 Electron 应用',
    command: 'electron-builder',
    description: '打包 Electron 应用程序'
  }
];

let currentStep = 0;

function executeStep(step) {
  currentStep++;
  console.log(`📦 步骤 ${currentStep}/${steps.length}: ${step.name}`);
  console.log(`   ${step.description}`);
  
  try {
    execSync(step.command, { 
      stdio: 'inherit',
      cwd: process.cwd()
    });
    console.log(`✅ ${step.name} 完成\n`);
  } catch (error) {
    console.error(`❌ ${step.name} 失败:`);
    console.error(error.message);
    process.exit(1);
  }
}

// 检查必要文件
function checkRequiredFiles() {
  const requiredFiles = [
    'package.json',
    'vite.config.ts',
    'src/main.ts',
    'electron/main.ts',
    'build/icon.png'
  ];
  
  console.log('🔍 检查必要文件...');
  
  for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
      console.error(`❌ 缺少必要文件: ${file}`);
      process.exit(1);
    }
  }
  
  console.log('✅ 所有必要文件存在\n');
}

// 显示构建信息
function showBuildInfo() {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  console.log('📋 构建信息:');
  console.log(`   应用名称: ${packageJson.productName || packageJson.name}`);
  console.log(`   版本: ${packageJson.version}`);
  console.log(`   描述: ${packageJson.description}`);
  console.log(`   作者: ${packageJson.author?.name || packageJson.author}`);
  console.log('');
}

// 主构建流程
async function main() {
  try {
    showBuildInfo();
    checkRequiredFiles();
    
    for (const step of steps) {
      executeStep(step);
    }
    
    console.log('🎉 构建完成!');
    console.log('');
    console.log('📁 输出文件位置:');
    console.log('   - dist/: 前端构建输出');
    console.log('   - dist-electron/: Electron 构建输出');
    console.log('   - dist-app/: 最终应用程序包');
    
  } catch (error) {
    console.error('❌ 构建失败:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
