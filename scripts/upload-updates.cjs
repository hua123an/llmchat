#!/usr/bin/env node
/*
 自动上传构建产物到更新服务器（generic provider）
 - 默认使用 SFTP（ssh2-sftp-client）
 - 读取优先级：环境变量 > release.config.json
 - 上传 dist-app 下的 latest.yml、*.exe、*.blockmap、*.zip、*.dmg、*.AppImage、*.deb
*/

const fs = require('node:fs');
const path = require('node:path');
const SftpClient = require('ssh2-sftp-client');

function readJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return null;
  }
}

function resolveConfig() {
  const root = process.cwd();
  const cfg = readJSON(path.join(root, 'release.config.json')) || {};
  const env = process.env;
  const conf = {
    protocol: env.RELEASE_PROTOCOL || cfg.protocol || 'sftp',
    host: env.RELEASE_HOST || cfg.host || '',
    port: Number(env.RELEASE_PORT || cfg.port || 22),
    username: env.RELEASE_USERNAME || cfg.username || '',
    password: env.RELEASE_PASSWORD || cfg.password || '',
    privateKeyPath: env.RELEASE_PRIVATE_KEY || cfg.privateKeyPath || '',
    remoteDir: env.RELEASE_REMOTE_DIR || cfg.remoteDir || '',
    cleanRemoteBeforeUpload: (env.RELEASE_CLEAN || cfg.cleanRemoteBeforeUpload) || false,
    // 发布元信息（可选）
    force: String(env.RELEASE_FORCE || cfg.force || '').toLowerCase() === 'true',
    notes: env.RELEASE_NOTES || cfg.notes || '',
    channel: env.RELEASE_CHANNEL || cfg.channel || 'latest',
  };
  if (!conf.host || !conf.username || !conf.remoteDir) {
    throw new Error('发布配置不完整：需要 host/username/remoteDir。请在 release.config.json 或环境变量中填写。');
  }
  return conf;
}

function collectArtifacts() {
  const root = process.cwd();
  // 优先使用 dist-build（新输出目录），回退到 dist-app（兼容旧版本）
  const prefer = path.join(root, 'dist-build');
  const fallback = path.join(root, 'dist-app');
  const outDir = fs.existsSync(prefer) ? prefer : fallback;
  if (!fs.existsSync(outDir)) {
    throw new Error('未找到 dist-build/dist-app，请先执行 npm run build:app');
  }
  const includes = [/latest\.yml$/i, /beta\.yml$/i, /\.exe$/i, /\.blockmap$/i, /\.zip$/i, /\.dmg$/i, /\.AppImage$/i, /\.deb$/i];
  const files = fs.readdirSync(outDir)
    .filter((f) => fs.statSync(path.join(outDir, f)).isFile())
    .filter((f) => includes.some((re) => re.test(f)))
    .map((f) => path.join(outDir, f));
  if (files.length === 0) throw new Error('dist-app 中没有可上传的构建产物。');
  return { outDir, files };
}

async function ensureDir(sftp, remoteDir) {
  const parts = remoteDir.replace(/\\/g, '/').split('/').filter(Boolean);
  let cur = remoteDir.startsWith('/') ? '/' : '';
  for (const p of parts) {
    cur += (cur.endsWith('/') ? '' : '/') + p;
    try {
      const exists = await sftp.exists(cur);
      if (!exists) await sftp.mkdir(cur);
    } catch (e) {
      // 目录可能已存在
    }
  }
}

async function cleanRemote(sftp, remoteDir) {
  try {
    const list = await sftp.list(remoteDir);
    for (const item of list) {
      const remotePath = path.posix.join(remoteDir, item.name);
      if (item.type === '-') {
        await sftp.delete(remotePath);
      }
    }
  } catch (e) {
    console.warn('清理远端目录失败（忽略）：', e.message || e);
  }
}

async function upload() {
  const cfg = resolveConfig();
  const { files } = collectArtifacts();
  if (cfg.protocol !== 'sftp') {
    throw new Error(`暂仅支持 protocol=sftp，当前为 ${cfg.protocol}`);
  }

  const sftp = new SftpClient();
  const connectOptions = {
    host: cfg.host,
    port: cfg.port,
    username: cfg.username,
  };
  if (cfg.privateKeyPath) {
    connectOptions.privateKey = fs.readFileSync(cfg.privateKeyPath);
    if (cfg.password) connectOptions.passphrase = cfg.password; // 私钥短语
  } else if (cfg.password) {
    connectOptions.password = cfg.password;
  }

  console.log(`🚀 正在连接 ${cfg.username}@${cfg.host}:${cfg.port} ...`);
  await sftp.connect(connectOptions);
  try {
    await ensureDir(sftp, cfg.remoteDir);
    if (cfg.cleanRemoteBeforeUpload) {
      console.log('🧹 清理远端旧文件...');
      await cleanRemote(sftp, cfg.remoteDir);
    }
    // 生成/附加 update-meta.json
    try {
      const outDir = path.dirname(files[0]);
      const metaPath = path.join(outDir, 'update-meta.json');
      const meta = { force: !!cfg.force, notes: cfg.notes || '', channel: cfg.channel || 'latest' };
      fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), 'utf-8');
      filesToSend.push(metaPath);
      if (cfg.channel && cfg.channel !== 'latest') {
        const channelMeta = path.join(outDir, `update-meta-${cfg.channel}.json`);
        fs.copyFileSync(metaPath, channelMeta);
        filesToSend.push(channelMeta);
      }
    } catch {}

    // 处理发布通道：如 channel=beta 且不存在 beta.yml 则用 latest.yml 复制一份
    let filesToSend = [...files];
    try {
      if (cfg.channel && cfg.channel !== 'latest') {
        const hasChannelYml = files.some(f => f.toLowerCase().endsWith(`${cfg.channel}.yml`));
        const latestYml = files.find(f => f.toLowerCase().endsWith('latest.yml'));
        if (!hasChannelYml && latestYml) {
          const channelYmlPath = path.join(path.dirname(latestYml), `${cfg.channel}.yml`);
          fs.copyFileSync(latestYml, channelYmlPath);
          filesToSend.push(channelYmlPath);
        }
      }
    } catch {}

    console.log('⬆️ 开始上传构建产物到', cfg.remoteDir);
    for (const file of filesToSend) {
      const remote = path.posix.join(cfg.remoteDir.replace(/\\/g, '/'), path.basename(file));
      console.log(`  → ${path.basename(file)}`);
      await sftp.fastPut(file, remote);
    }
    console.log('\n✅ 上传完成，共上传', files.length, '个文件');
    
    // 创建并上传下载页面
    console.log('\n📄 创建下载页面...');
    const { createDownloadPage } = require('./create-download-page.cjs');
    await createDownloadPage();
  } finally {
    await sftp.end().catch(() => {});
  }
}

upload().catch((e) => {
  console.error('❌ 上传失败：', e.message || e);
  process.exit(1);
});
