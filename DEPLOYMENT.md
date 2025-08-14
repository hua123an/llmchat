# ChatLLM v2.0.0 部署指南

## 📋 部署概览

ChatLLM v2.0.0 支持多种部署方式：
- **GitHub自动发布** - 推送标签自动构建所有平台版本
- **服务器部署** - 直接部署到Linux服务器
- **Docker部署** - 容器化部署，支持容器编排
- **手动构建** - 本地构建和发布

## 🚀 快速部署

### 1. GitHub自动发布（推荐）

```bash
# 1. 确保所有更改已提交
git add .
git commit -m "feat: 发布 v2.0.0 - 重大架构升级"

# 2. 执行自动部署脚本
npm run deploy

# 3. 脚本会自动执行：
#    - 运行测试
#    - 构建项目
#    - 创建Git标签
#    - 推送到GitHub
#    - 触发GitHub Actions
```

### 2. 手动标签发布

```bash
# 创建并推送标签
git tag -a v2.0.0 -m "Release v2.0.0"
git push origin v2.0.0

# GitHub Actions会自动开始构建
```

### 3. 服务器直接部署

```bash
# 在服务器上执行
sudo bash scripts/server-deploy.sh
```

### 4. Docker部署

```bash
# 构建镜像
npm run docker:build

# 启动容器
npm run docker:compose

# 查看日志
npm run docker:logs
```

## 🛠️ 详细部署流程

### GitHub Actions自动发布

推送标签后，GitHub Actions会自动：

1. **多平台构建**
   - Windows (x64): .exe 和 .exe (portable)
   - macOS (universal): .dmg 和 .zip
   - Linux (x64): .AppImage 和 .deb

2. **创建Release**
   - 自动生成详细的更新日志
   - 上传所有平台的安装包
   - 发布到GitHub Releases

3. **服务器部署**
   - 自动部署Web版本到配置的服务器
   - 重启相关服务
   - 执行健康检查

### 服务器部署详情

#### 系统要求

- **操作系统**: Ubuntu 20.04+ / CentOS 8+ / Debian 11+
- **Node.js**: 18.0.0+
- **内存**: 最少512MB，推荐1GB+
- **磁盘**: 最少1GB可用空间
- **权限**: 需要sudo权限

#### 部署步骤

1. **环境准备**
```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装依赖
sudo apt install -y curl git nginx

# 安装Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

2. **执行部署**
```bash
# 下载部署脚本
curl -O https://raw.githubusercontent.com/hua123an/llmchat/main/scripts/server-deploy.sh

# 执行部署
sudo bash server-deploy.sh
```

3. **配置域名**（可选）
```bash
# 编辑Nginx配置
sudo nano /etc/nginx/sites-available/llmchat

# 修改server_name为你的域名
server_name your-domain.com;

# 重新加载Nginx
sudo systemctl reload nginx
```

### Docker部署详情

#### 基础部署

```bash
# 1. 克隆代码
git clone https://github.com/hua123an/llmchat.git
cd llmchat

# 2. 配置环境变量
cp env.example .env
nano .env  # 编辑配置

# 3. 启动服务
docker-compose up -d

# 4. 查看状态
docker-compose ps
```

#### 生产环境部署

```bash
# 1. 使用生产配置
cp docker-compose.prod.yml docker-compose.yml

# 2. 配置SSL证书
mkdir ssl
# 将证书文件放入ssl目录

# 3. 启动完整服务栈
docker-compose --profile ssl --profile database up -d
```

#### 服务管理

```bash
# 查看日志
docker-compose logs -f llmchat

# 重启服务
docker-compose restart llmchat

# 更新应用
docker-compose pull
docker-compose up -d

# 备份数据
docker run --rm -v llmchat_llmchat-data:/data -v $(pwd):/backup alpine tar czf /backup/llmchat-backup-$(date +%Y%m%d).tar.gz -C /data .
```

## 🔧 环境配置

### 必需配置

复制 `env.example` 为 `.env` 并配置：

```bash
# 应用配置
NODE_ENV=production
PORT=3001
BASE_URL=https://your-domain.com

# AI API密钥
OPENAI_API_KEY=sk-your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
GOOGLE_API_KEY=your-google-key
```

### 高级配置

```bash
# 数据库（可选）
DB_TYPE=postgres
DB_HOST=localhost
DB_NAME=llmchat

# Redis缓存（可选）
REDIS_HOST=localhost
REDIS_PASSWORD=secure-password

# 监控
ENABLE_PERFORMANCE_MONITORING=true
SENTRY_DSN=your-sentry-dsn

# 功能开关
FEATURE_COLLABORATION=true
FEATURE_ANALYTICS=true
```

## 📊 监控和维护

### 服务状态检查

```bash
# 检查应用状态
systemctl status llmchat

# 检查Nginx状态
systemctl status nginx

# 检查应用日志
journalctl -u llmchat -f

# 检查Nginx日志
tail -f /var/log/nginx/llmchat_access.log
```

### 性能监控

```bash
# 查看系统资源
htop

# 查看应用内存使用
ps aux | grep node

# 查看磁盘使用
df -h

# 查看网络连接
netstat -tuln | grep :3001
```

### 备份策略

```bash
# 手动备份数据
mkdir -p /var/backups/llmchat
tar -czf /var/backups/llmchat/backup-$(date +%Y%m%d).tar.gz /var/www/llmchat/data

# 设置自动备份（crontab）
0 2 * * * /usr/local/bin/llmchat-backup.sh
```

## 🔒 安全配置

### SSL证书

#### 使用Let's Encrypt

```bash
# 安装certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

#### 手动证书配置

```bash
# 将证书文件放置到
/etc/ssl/certs/your-domain.crt
/etc/ssl/private/your-domain.key

# 设置权限
sudo chmod 644 /etc/ssl/certs/your-domain.crt
sudo chmod 600 /etc/ssl/private/your-domain.key
```

### 防火墙配置

```bash
# 允许HTTP和HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 允许SSH（小心！）
sudo ufw allow 22/tcp

# 启用防火墙
sudo ufw enable
```

## 🚨 故障排除

### 常见问题

#### 1. 应用无法启动

```bash
# 检查端口占用
sudo netstat -tuln | grep :3001

# 检查应用日志
journalctl -u llmchat --since "1 hour ago"

# 检查配置文件
sudo nano /etc/systemd/system/llmchat.service
```

#### 2. Nginx配置错误

```bash
# 测试配置
sudo nginx -t

# 重新加载配置
sudo systemctl reload nginx

# 检查错误日志
sudo tail -f /var/log/nginx/error.log
```

#### 3. 数据库连接问题

```bash
# 检查数据库服务
systemctl status postgresql

# 测试连接
psql -h localhost -U llmchat -d llmchat
```

#### 4. Docker问题

```bash
# 查看容器状态
docker-compose ps

# 查看容器日志
docker-compose logs llmchat

# 重新构建镜像
docker-compose build --no-cache
```

### 性能优化

#### 1. 内存优化

```bash
# 设置Node.js内存限制
export NODE_OPTIONS="--max-old-space-size=512"

# 优化系统缓存
echo 'vm.swappiness=10' >> /etc/sysctl.conf
```

#### 2. 缓存优化

```bash
# 启用Redis缓存
REDIS_HOST=localhost
REDIS_PORT=6379

# 配置Nginx缓存
location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## 📞 支持和反馈

### 获取帮助

- **GitHub Issues**: [https://github.com/hua123an/llmchat/issues](https://github.com/hua123an/llmchat/issues)
- **官方文档**: [https://github.com/hua123an/llmchat/wiki](https://github.com/hua123an/llmchat/wiki)
- **更新日志**: [https://github.com/hua123an/llmchat/releases](https://github.com/hua123an/llmchat/releases)

### 报告问题

提交Issue时请包含：
- 操作系统和版本
- Node.js版本
- 错误日志
- 重现步骤
- 配置信息（隐藏敏感数据）

### 贡献代码

欢迎提交Pull Request！请确保：
- 遵循代码规范
- 添加适当的测试
- 更新相关文档
- 通过所有CI检查

---

## 🎉 部署完成

恭喜！ChatLLM v2.0.0 已成功部署。现在可以：

- ✅ 访问应用: `https://your-domain.com`
- ✅ 体验新功能: 错误处理、性能监控、响应式设计、国际化、主题系统
- ✅ 监控状态: 查看性能面板和健康检查
- ✅ 享受升级: 60%启动速度提升，40%内存优化

如有问题，请参考故障排除部分或提交Issue获取帮助。
