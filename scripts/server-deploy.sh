#!/bin/bash

# ChatLLM 服务器部署脚本
# 版本: 2.0.0

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 配置变量
APP_NAME="llmchat"
APP_DIR="/var/www/llmchat"
BACKUP_DIR="/var/backups/llmchat"
SERVICE_NAME="llmchat"
NGINX_CONFIG="/etc/nginx/sites-available/llmchat"
LOG_FILE="/var/log/llmchat-deploy.log"

# 日志函数
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "$LOG_FILE"
}

log_info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}" | tee -a "$LOG_FILE"
}

# 检查权限
check_permissions() {
    if [[ $EUID -ne 0 ]]; then
        log_error "此脚本需要root权限运行"
        log_info "请使用: sudo $0"
        exit 1
    fi
}

# 检查依赖
check_dependencies() {
    log "检查系统依赖..."
    
    local deps=("git" "node" "npm" "nginx" "systemctl")
    for dep in "${deps[@]}"; do
        if ! command -v "$dep" &> /dev/null; then
            log_error "未找到依赖: $dep"
            exit 1
        fi
    done
    
    # 检查Node.js版本
    local node_version=$(node -v | cut -d'v' -f2)
    local required_version="18.0.0"
    
    if ! printf '%s\n' "$required_version" "$node_version" | sort -V -C; then
        log_error "Node.js版本过低 (当前: $node_version, 需要: >= $required_version)"
        exit 1
    fi
    
    log "✅ 所有依赖检查通过"
}

# 创建备份
create_backup() {
    log "创建应用备份..."
    
    local backup_name="llmchat-backup-$(date +%Y%m%d-%H%M%S)"
    local backup_path="$BACKUP_DIR/$backup_name"
    
    mkdir -p "$BACKUP_DIR"
    
    if [ -d "$APP_DIR" ]; then
        cp -r "$APP_DIR" "$backup_path"
        log "✅ 备份创建完成: $backup_path"
    else
        log_warning "应用目录不存在，跳过备份"
    fi
}

# 安装/更新应用
deploy_application() {
    log "部署应用..."
    
    # 创建应用目录
    mkdir -p "$APP_DIR"
    cd "$APP_DIR"
    
    # 克隆或更新代码
    if [ -d ".git" ]; then
        log "更新现有代码库..."
        git fetch origin
        git reset --hard origin/main
    else
        log "克隆代码库..."
        git clone https://github.com/hua123an/llmchat.git .
    fi
    
    # 安装依赖
    log "安装Node.js依赖..."
    npm ci --production
    
    # 构建应用
    log "构建应用..."
    npm run build
    
    # 设置权限
    chown -R www-data:www-data "$APP_DIR"
    chmod -R 755 "$APP_DIR"
    
    log "✅ 应用部署完成"
}

# 配置Nginx
configure_nginx() {
    log "配置Nginx..."
    
    cat > "$NGINX_CONFIG" << 'EOF'
server {
    listen 80;
    server_name llmchat.yourdomain.com;
    
    # 重定向到HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name llmchat.yourdomain.com;
    
    # SSL配置
    ssl_certificate /etc/ssl/certs/llmchat.crt;
    ssl_certificate_key /etc/ssl/private/llmchat.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # 安全头
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
    
    # 根目录
    root /var/www/llmchat/dist;
    index index.html index.htm;
    
    # 启用Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json;
    
    # 静态文件缓存
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # API代理（如果需要）
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # SPA路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # 日志
    access_log /var/log/nginx/llmchat_access.log;
    error_log /var/log/nginx/llmchat_error.log;
}
EOF
    
    # 创建软链接
    ln -sf "$NGINX_CONFIG" "/etc/nginx/sites-enabled/llmchat"
    
    # 测试配置
    if nginx -t; then
        log "✅ Nginx配置验证通过"
    else
        log_error "Nginx配置验证失败"
        exit 1
    fi
}

# 配置系统服务
configure_service() {
    log "配置系统服务..."
    
    cat > "/etc/systemd/system/$SERVICE_NAME.service" << EOF
[Unit]
Description=ChatLLM Application
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3001

# 日志
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=$SERVICE_NAME

# 安全设置
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$APP_DIR/data $APP_DIR/logs

[Install]
WantedBy=multi-user.target
EOF
    
    systemctl daemon-reload
    systemctl enable "$SERVICE_NAME"
    
    log "✅ 系统服务配置完成"
}

# 启动服务
start_services() {
    log "启动服务..."
    
    # 重启应用服务
    systemctl restart "$SERVICE_NAME"
    
    # 检查服务状态
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        log "✅ 应用服务启动成功"
    else
        log_error "应用服务启动失败"
        systemctl status "$SERVICE_NAME"
        exit 1
    fi
    
    # 重新加载Nginx
    systemctl reload nginx
    
    if systemctl is-active --quiet nginx; then
        log "✅ Nginx重新加载成功"
    else
        log_error "Nginx重新加载失败"
        exit 1
    fi
}

# 健康检查
health_check() {
    log "执行健康检查..."
    
    # 检查端口监听
    if netstat -tuln | grep -q ":3001"; then
        log "✅ 应用端口3001正在监听"
    else
        log_warning "应用端口3001未监听"
    fi
    
    if netstat -tuln | grep -q ":80\|:443"; then
        log "✅ Nginx端口正在监听"
    else
        log_warning "Nginx端口未监听"
    fi
    
    # 检查HTTP响应
    if curl -f -s http://localhost:80 > /dev/null; then
        log "✅ HTTP健康检查通过"
    else
        log_warning "HTTP健康检查失败"
    fi
}

# 清理函数
cleanup() {
    log "清理临时文件..."
    
    # 清理npm缓存
    npm cache clean --force
    
    # 清理旧的备份（保留最近10个）
    if [ -d "$BACKUP_DIR" ]; then
        ls -t "$BACKUP_DIR" | tail -n +11 | xargs -r -I {} rm -rf "$BACKUP_DIR/{}"
    fi
    
    log "✅ 清理完成"
}

# 显示部署信息
show_deployment_info() {
    log "🎉 部署完成！"
    echo ""
    log_info "应用信息:"
    log_info "  版本: 2.0.0"
    log_info "  目录: $APP_DIR"
    log_info "  服务: $SERVICE_NAME"
    echo ""
    log_info "访问地址:"
    log_info "  HTTP:  http://$(hostname -I | awk '{print $1}')"
    log_info "  域名:  https://llmchat.yourdomain.com"
    echo ""
    log_info "管理命令:"
    log_info "  查看状态: systemctl status $SERVICE_NAME"
    log_info "  查看日志: journalctl -u $SERVICE_NAME -f"
    log_info "  重启服务: systemctl restart $SERVICE_NAME"
    log_info "  重载Nginx: systemctl reload nginx"
}

# 主函数
main() {
    log "🚀 开始部署 ChatLLM v2.0.0"
    
    check_permissions
    check_dependencies
    create_backup
    deploy_application
    configure_nginx
    configure_service
    start_services
    health_check
    cleanup
    show_deployment_info
    
    log "✅ 部署流程完成"
}

# 错误处理
trap 'log_error "部署过程中发生错误，退出码: $?"' ERR

# 参数处理
case "${1:-}" in
    --help|-h)
        echo "ChatLLM 服务器部署脚本"
        echo ""
        echo "用法: $0 [选项]"
        echo ""
        echo "选项:"
        echo "  --help, -h     显示帮助信息"
        echo "  --dry-run      模拟运行（不执行实际操作）"
        echo "  --backup-only  仅创建备份"
        echo "  --restore      从备份恢复"
        echo ""
        exit 0
        ;;
    --dry-run)
        log "🧪 模拟运行模式"
        exit 0
        ;;
    --backup-only)
        check_permissions
        create_backup
        exit 0
        ;;
    --restore)
        log "恢复功能尚未实现"
        exit 1
        ;;
    "")
        main
        ;;
    *)
        log_error "未知参数: $1"
        exit 1
        ;;
esac
