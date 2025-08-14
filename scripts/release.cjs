const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const SftpClient = require('ssh2-sftp-client');

/**
 * 自动化发布脚本
 * 1. 升级版本号
 * 2. 更新CHANGELOG
 * 3. 构建应用
 * 4. 上传到服务器
 * 5. 推送到GitHub
 * 6. 创建GitHub Release
 */

async function main() {
  try {
    console.log('🚀 开始自动化发布流程...\n');

    // 1. 读取当前版本并升级
    const packagePath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    const currentVersion = packageJson.version;
    const newVersion = bumpVersion(currentVersion);
    
    console.log(`📦 版本升级: ${currentVersion} → ${newVersion}`);
    
    // 更新package.json
    packageJson.version = newVersion;
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');

    // 2. 更新CHANGELOG
    updateChangelog(newVersion);
    console.log('📝 已更新CHANGELOG.md');

    // 3. 构建应用
    console.log('\n🔨 开始构建应用...');
    execSync('npm run build:app', { stdio: 'inherit' });
    console.log('✅ 构建完成');

    // 4. 上传到服务器
    console.log('\n⬆️ 上传到服务器...');
    execSync('node scripts/upload-updates.cjs', { stdio: 'inherit' });
    console.log('✅ 服务器上传完成');

    // 5. Git提交和推送
    console.log('\n📤 提交到Git仓库...');
    execSync('git add .', { stdio: 'inherit' });
    execSync(`git commit -m "release: v${newVersion} - 自动发布"`, { stdio: 'inherit' });
    execSync(`git tag v${newVersion}`, { stdio: 'inherit' });
    execSync('git push origin main', { stdio: 'inherit' });
    execSync('git push --tags', { stdio: 'inherit' });
    console.log('✅ Git推送完成');

    // 6. 创建GitHub Release
    console.log('\n🎉 创建GitHub Release...');
    await createGitHubRelease(newVersion);
    console.log('✅ GitHub Release创建完成');

    console.log(`\n🎊 发布完成！版本 v${newVersion} 已成功发布`);
    console.log(`📱 用户可以通过以下方式获取：`);
    console.log(`   • 自动更新: 应用内检查更新`);
    console.log(`   • 手动下载: https://github.com/hua123an/llmchat/releases/tag/v${newVersion}`);
    console.log(`   • 服务器直链: https://huaan666.site/update/`);

  } catch (error) {
    console.error('❌ 发布失败:', error.message);
    process.exit(1);
  }
}

function bumpVersion(version) {
  const parts = version.split('.').map(Number);
  parts[1] += 1; // 升级次版本号
  parts[2] = 0;  // 重置修订号
  return parts.join('.');
}

function updateChangelog(newVersion) {
  const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
  const content = fs.readFileSync(changelogPath, 'utf8');
  
  const today = new Date().toISOString().split('T')[0];
  const newEntry = `## [${newVersion}] - ${today}

### 新增功能
- ✨ 新功能描述
- ✨ 其他改进

### 改进
- 🔧 性能优化
- 🔧 用户体验改进

### 修复
- 🐛 修复的问题

`;

  // 在第一个版本条目前插入新版本
  const lines = content.split('\n');
  const insertIndex = lines.findIndex(line => line.startsWith('## ['));
  lines.splice(insertIndex, 0, newEntry);
  
  fs.writeFileSync(changelogPath, lines.join('\n'));
}

async function createGitHubRelease(version) {
  const distDir = path.join(process.cwd(), 'dist-build');
  
  // 查找构建产物
  const files = fs.readdirSync(distDir).filter(file => 
    file.endsWith('.exe') || file.endsWith('.exe.blockmap') || file.endsWith('.yml')
  );

  if (files.length === 0) {
    throw new Error('没有找到构建产物');
  }

  // 读取CHANGELOG中的当前版本更新内容
  const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
  const changelog = fs.readFileSync(changelogPath, 'utf8');
  const releaseNotes = extractReleaseNotes(changelog, version);

  // 创建GitHub Release（使用GitHub CLI）
  try {
    // 检查是否安装了gh CLI
    execSync('gh --version', { stdio: 'pipe' });
    
    console.log('📋 发布说明:');
    console.log(releaseNotes);
    
    // 创建release
    const releaseCmd = `gh release create v${version} --title "ChatLLM v${version}" --notes "${releaseNotes.replace(/"/g, '\\"')}"`;
    execSync(releaseCmd, { stdio: 'inherit' });
    
    // 上传构建产物
    for (const file of files) {
      const filePath = path.join(distDir, file);
      console.log(`📎 上传文件: ${file}`);
      execSync(`gh release upload v${version} "${filePath}"`, { stdio: 'inherit' });
    }
    
  } catch (ghError) {
    console.warn('⚠️ GitHub CLI未安装或未认证，跳过GitHub Release创建');
    console.log('💡 你可以手动在GitHub上创建Release并上传以下文件:');
    files.forEach(file => console.log(`   • ${file}`));
  }
}

function extractReleaseNotes(changelog, version) {
  const lines = changelog.split('\n');
  const startIndex = lines.findIndex(line => line.includes(`[${version}]`));
  
  if (startIndex === -1) {
    return `ChatLLM v${version} 发布`;
  }
  
  const endIndex = lines.findIndex((line, index) => 
    index > startIndex && line.startsWith('## [')
  );
  
  const notes = lines.slice(startIndex + 1, endIndex === -1 ? undefined : endIndex)
    .join('\n')
    .trim();
    
  return notes || `ChatLLM v${version} 发布`;
}

if (require.main === module) {
  main();
}

module.exports = { main };
