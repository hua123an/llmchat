# ChatLLM v2.0.0 Docker配置
# 多阶段构建，优化镜像大小

# 构建阶段
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 设置npm源（可选，加速下载）
RUN npm config set registry https://registry.npmmirror.com

# 复制package文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production && \
    npm cache clean --force

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 生产阶段
FROM nginx:alpine AS production

# 安装Node.js（用于运行API服务）
RUN apk add --no-cache nodejs npm

# 创建应用用户
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

# 设置工作目录
WORKDIR /app

# 从构建阶段复制文件
COPY --from=builder /app/dist /usr/share/nginx/html
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/server.js ./

# 复制Nginx配置
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# 复制启动脚本
COPY docker/start.sh /start.sh
RUN chmod +x /start.sh

# 创建日志目录
RUN mkdir -p /var/log/llmchat && \
    chown -R appuser:appgroup /var/log/llmchat

# 创建数据目录
RUN mkdir -p /app/data && \
    chown -R appuser:appgroup /app/data

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# 暴露端口
EXPOSE 80 3001

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3001

# 启动应用
CMD ["/start.sh"]
