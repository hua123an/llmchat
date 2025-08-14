const fs = require('fs');
const path = require('path');
const SftpClient = require('ssh2-sftp-client');

/**
 * 创建下载页面，提供直接下载链接
 */

async function createDownloadPage() {
  try {
    // 读取当前版本信息
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const version = packageJson.version;
    const appName = packageJson.productName || packageJson.name;
    
    // 生成下载页面HTML
    const html = generateDownloadHTML(appName, version);
    
    // 写入本地临时文件
    const htmlPath = path.join(process.cwd(), 'temp-download.html');
    fs.writeFileSync(htmlPath, html);
    
    // 上传到服务器
    await uploadToServer(htmlPath);
    
    // 清理临时文件
    fs.unlinkSync(htmlPath);
    
    console.log('✅ 下载页面已创建并上传到服务器');
    console.log('🌐 访问地址: https://huaan666.site/update/download.html');
    
  } catch (error) {
    console.error('❌ 创建下载页面失败:', error.message);
  }
}

function generateDownloadHTML(appName, version) {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${appName} - 下载页面</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #333;
        }
        
        .container {
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            padding: 40px;
            max-width: 600px;
            width: 90%;
            text-align: center;
        }
        
        .logo {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 20px;
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            color: white;
            font-weight: bold;
        }
        
        h1 {
            font-size: 28px;
            margin-bottom: 10px;
            color: #2c3e50;
        }
        
        .version {
            color: #7f8c8d;
            font-size: 16px;
            margin-bottom: 30px;
        }
        
        .description {
            color: #5a6c7d;
            line-height: 1.6;
            margin-bottom: 40px;
        }
        
        .download-section {
            margin-bottom: 30px;
        }
        
        .download-buttons {
            display: flex;
            gap: 20px;
            justify-content: center;
            flex-wrap: wrap;
            margin-bottom: 30px;
        }
        
        .download-btn {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            padding: 15px 30px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 12px;
            font-weight: 600;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
            min-width: 200px;
        }
        
        .download-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(102, 126, 234, 0.6);
        }
        
        .download-btn.portable {
            background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
            box-shadow: 0 4px 15px rgba(17, 153, 142, 0.4);
        }
        
        .download-btn.portable:hover {
            box-shadow: 0 8px 25px rgba(17, 153, 142, 0.6);
        }
        
        .icon {
            font-size: 20px;
        }
        
        .features {
            text-align: left;
            background: #f8f9fa;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 30px;
        }
        
        .features h3 {
            color: #2c3e50;
            margin-bottom: 15px;
            text-align: center;
        }
        
        .features ul {
            list-style: none;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 10px;
        }
        
        .features li {
            display: flex;
            align-items: center;
            gap: 10px;
            color: #5a6c7d;
        }
        
        .features li::before {
            content: "✨";
            font-size: 16px;
        }
        
        .github-link {
            color: #667eea;
            text-decoration: none;
            font-weight: 600;
        }
        
        .github-link:hover {
            text-decoration: underline;
        }
        
        .update-info {
            background: #e8f4fd;
            border: 1px solid #b3d9ff;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
            color: #1a73e8;
        }
        
        @media (max-width: 480px) {
            .container {
                padding: 30px 20px;
            }
            
            .download-buttons {
                flex-direction: column;
                align-items: center;
            }
            
            .download-btn {
                width: 100%;
                max-width: 280px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">🤖</div>
        <h1>${appName}</h1>
        <div class="version">版本 v${version}</div>
        
        <div class="description">
            一个强大的多模型AI聊天应用，支持知识库、联网搜索、文件处理等功能。
            让AI助手成为你的智能工作伙伴。
        </div>
        
        <div class="update-info">
            💡 <strong>提示：</strong>如果你已经安装了${appName}，应用会自动检查并提示更新到最新版本。
        </div>
        
        <div class="download-section">
            <div class="download-buttons">
                <a href="./${appName}-${version}-x64.exe" class="download-btn" download>
                    <span class="icon">📦</span>
                    <div>
                        <div>安装版</div>
                        <small>推荐 • 自动更新</small>
                    </div>
                </a>
                
                <a href="./${appName}-${version}-x64-portable.exe" class="download-btn portable" download>
                    <span class="icon">🚀</span>
                    <div>
                        <div>便携版</div>
                        <small>免安装 • 即开即用</small>
                    </div>
                </a>
            </div>
        </div>
        
        <div class="features">
            <h3>主要功能</h3>
            <ul>
                <li>多模型AI对话支持</li>
                <li>联网搜索实时信息</li>
                <li>本地知识库管理</li>
                <li>文件附件处理</li>
                <li>网页内容预览</li>
                <li>搜索策略优化</li>
                <li>自动更新机制</li>
                <li>暗色模式支持</li>
            </ul>
        </div>
        
        <p>
            <a href="https://github.com/hua123an/llmchat" class="github-link" target="_blank">
                📂 查看源代码 • 反馈问题
            </a>
        </p>
        
        <p style="margin-top: 20px; color: #95a5a6; font-size: 14px;">
            © 2024 ${appName} • 开源免费 • MIT License
        </p>
    </div>
    
    <script>
        // 简单的下载统计
        document.querySelectorAll('.download-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const type = this.classList.contains('portable') ? 'portable' : 'installer';
                console.log('Download:', type, 'v${version}');
                
                // 可以在这里添加下载统计逻辑
                // 比如发送到Google Analytics或自己的统计服务
            });
        });
    </script>
</body>
</html>`;
}

async function uploadToServer(htmlPath) {
  const config = loadConfig();
  const sftp = new SftpClient();
  
  try {
    await sftp.connect({
      host: config.host,
      port: config.port || 22,
      username: config.username,
      password: config.password,
      privateKey: config.privateKeyPath ? require('fs').readFileSync(config.privateKeyPath) : undefined
    });
    
    const remotePath = path.posix.join(config.remoteDir, 'download.html');
    await sftp.put(htmlPath, remotePath);
    
  } finally {
    await sftp.end();
  }
}

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync('release.config.json', 'utf8'));
  } catch {
    return {
      host: process.env.SFTP_HOST || 'huaan666.site',
      port: parseInt(process.env.SFTP_PORT || '22'),
      username: process.env.SFTP_USERNAME || 'root',
      password: process.env.SFTP_PASSWORD,
      remoteDir: process.env.SFTP_REMOTE_DIR || '/www/wwwroot/update'
    };
  }
}

if (require.main === module) {
  createDownloadPage();
}

module.exports = { createDownloadPage };
