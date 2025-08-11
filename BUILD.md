# ChatLLM 构建指南

## 📋 系统要求

- Node.js 18+ 
- npm 或 yarn
- Git

## 🛠️ 开发环境设置

```bash
# 克隆项目
git clone https://github.com/chatllm/chatllm.git
cd chatllm

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

## 🧹 清理项目

在构建前建议先清理旧的构建文件：

```bash
# 清理构建文件
npm run clean

# 完全清理（包括 node_modules）
npm run clean:all  

# 完全清理并重新安装依赖
npm run fresh
```

## 📦 构建应用

### 快速构建

```bash
# 清理并构建所有平台
npm run clean && npm run build:app

# 构建特定平台
npm run build:win    # Windows
npm run build:mac    # macOS  
npm run build:linux  # Linux
```

### 详细构建步骤

1. **前端构建**
   ```bash
   npm run build
   ```

2. **仅打包（不重新构建）**
   ```bash
   npm run pack
   ```

3. **创建分发包**
   ```bash
   npm run dist
   ```

## 📁 输出文件

构建完成后，文件将输出到：

- `dist/` - 前端构建文件
- `dist-electron/` - Electron 主进程文件
- `dist-app/` - 最终应用程序包

### Windows 输出
- `ChatLLM-1.0.0-x64.exe` - NSIS 安装程序
- `ChatLLM-1.0.0-x64.exe` - 便携版

### macOS 输出  
- `ChatLLM-1.0.0-x64.dmg` - DMG 安装包
- `ChatLLM-1.0.0-arm64.dmg` - Apple Silicon 版本

### Linux 输出
- `ChatLLM-1.0.0-x64.AppImage` - AppImage 格式
- `ChatLLM-1.0.0-x64.deb` - Debian 包

## 🎨 图标资源

应用图标位于 `build/` 目录：

- `icon.png` - 主图标 (512x512)
- `icon.ico` - Windows 图标
- `icon.icns` - macOS 图标
- `icon.svg` - 矢量图标
- `dmg-background.png` - macOS DMG 背景

## ⚙️ 构建配置

主要配置文件：

- `package.json` - 应用信息和构建配置
- `vite.config.ts` - Vite 构建配置
- `electron/main.ts` - Electron 主进程
- `electron/preload.ts` - 预加载脚本

## 🔧 自定义构建

### 修改应用信息

编辑 `package.json`：

```json
{
  "name": "chatllm",
  "productName": "ChatLLM", 
  "version": "1.0.0",
  "description": "你的应用描述",
  "author": "你的名字"
}
```

### 修改构建目标

在 `package.json` 的 `build` 配置中修改：

```json
{
  "build": {
    "win": {
      "target": ["nsis", "portable"]
    },
    "mac": {
      "target": ["dmg", "zip"]
    },
    "linux": {
      "target": ["AppImage", "deb"]
    }
  }
}
```

## 🚀 发布流程

1. **更新版本号**
   ```bash
   npm version patch|minor|major
   ```

2. **构建所有平台**
   ```bash
   npm run build:app
   ```

3. **测试应用**
   - 在各平台测试安装包
   - 验证核心功能

4. **发布到 GitHub**
   ```bash
   git push --tags
   # GitHub Actions 将自动构建和发布
   ```

## 🔍 故障排除

### 常见问题

1. **构建失败 - 权限错误**
   ```bash
   # Windows: 以管理员身份运行命令行
   # macOS/Linux: 检查文件权限
   chmod +x scripts/build.js
   ```

2. **图标显示异常**
   - 确保 `build/icon.*` 文件存在
   - 重新生成图标文件

3. **依赖安装失败**
   ```bash
   # 清理缓存重新安装
   npm cache clean --force
   rm -rf node_modules package-lock.json
   npm install
   ```

4. **macOS 签名问题**
   ```bash
   # 设置开发者证书
   export CSC_IDENTITY_AUTO_DISCOVERY=false
   ```

## 📞 获取帮助

- 📖 [Electron Builder 文档](https://www.electron.build/)
- 📖 [Vite 文档](https://vitejs.dev/)
- 🐛 [提交 Issue](https://github.com/chatllm/chatllm/issues)

---

💡 **提示**: 首次构建可能需要较长时间下载依赖，后续构建会更快。
