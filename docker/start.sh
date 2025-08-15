#!/bin/sh

# ChatLLM Docker启动脚本
set -e

echo "🚀 启动 ChatLLM v2.0.0..."

# 创建必要的目录
mkdir -p /var/log/llmchat
mkdir -p /app/data

# 设置权限
chown -R appuser:appgroup /app/data
chown -R appuser:appgroup /var/log/llmchat

# 启动后端API服务（后台运行）
echo "🔧 启动API服务..."
cd /app
su appuser -c "NODE_ENV=production node server.js" &

# 等待API服务启动
echo "⏳ 等待API服务启动..."
sleep 5

# 检查API服务是否正常
if ! nc -z localhost 3001; then
    echo "❌ API服务启动失败"
    exit 1
fi

echo "✅ API服务启动成功"

# 启动Nginx
echo "🌐 启动Nginx..."
nginx -t
exec nginx -g 'daemon off;'
