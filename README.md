# ChatLLM

<div align="center">

![ChatLLM Logo](https://img.shields.io/badge/ChatLLM-v2.0.1-blue?style=for-the-badge&logo=electron)

**🤖 一个强大的多模型AI聊天应用**

支持知识库、联网搜索、文件处理等功能，让AI助手成为你的智能工作伙伴

[![GitHub release](https://img.shields.io/github/release/hua123an/llmchat.svg)](https://github.com/hua123an/llmchat/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows-lightgrey.svg)](https://github.com/hua123an/llmchat/releases)

[📥 立即下载](https://huaan666.site/update/download.html) • [📖 使用文档](#-功能特性) • [🐛 问题反馈](https://github.com/hua123an/llmchat/issues)

</div>

## ✨ 功能特性

### 🎯 核心功能
- **🤖 多模型支持** - 兼容 OpenAI、Claude、Gemini、国产大模型等
- **🔍 智能搜索** - 实时联网搜索，获取最新信息
- **📚 知识库管理** - 本地 RAG 系统，导入网页内容到知识库
- **📎 文件处理** - 支持 PDF、Word、图片等多种格式
- **🌐 网页预览** - 应用内预览网页内容，一键导入知识库

### 🚀 更新亮点 (v2.0.1)
 - 下拉选择统一为 AppSelect，完整显示模型/提供商名称，键盘无障碍与 aria-label 支持
 - 文生图生成进度与取消：进度条与“取消”按钮，过程更可控
 - i18n 与无障碍：补齐大量翻译键与 aria-label
 - 阿里云文生图：更清晰的错误提示与结果处理
 - 修复：重复 i18n 键、个别下拉回调类型不匹配

### 🚀 新增功能 (v2.0.0)
 - 架构重构：服务层/组合式/小型stores拆分
 - 插件体系：总结/翻译/改写/URL抓取/文档速读/OCR/知识库入库/提示词库
 - 本地 Ollama：动态模型列表、无 API Key、聊天流式、刷新按钮
 - 联网搜索：通过插件触发，OpenRouter/Moonshot/智谱/302AI 自动适配
 - 错误处理与性能监控：全局通知/错误边界/FPS与内存指标
 - 响应式与主题：输入框水平居中、移动端适配、主题优化

### 🎨 用户体验
- **🌙 暗色模式** - 支持明暗主题切换
- **🔄 自动更新** - 智能检测新版本并自动更新
- **💾 数据同步** - 本地数据加密存储
- **🎛️ 高度可配置** - 丰富的设置选项

## 📥 下载安装

### 💻 系统要求
- **操作系统**: Windows 10/11 (64位)
- **内存**: 4GB RAM (推荐 8GB+)
- **存储**: 200MB 可用空间

### 🎯 获取方式

#### 方式一：官方下载页面 (推荐)
访问 [下载页面](https://huaan666.site/update/download.html) 获取最新版本

#### 方式二：直接下载
- **安装版**: [ChatLLM-2.0.1-x64.exe](https://github.com/hua123an/llmchat/releases/download/v2.0.1/ChatLLM-2.0.1-x64.exe)
- **便携版**: [ChatLLM-2.0.1-x64-portable.exe](https://github.com/hua123an/llmchat/releases/download/v2.0.1/ChatLLM-2.0.1-x64-portable.exe)

#### 方式三：GitHub Releases
访问 [GitHub Releases](https://github.com/hua123an/llmchat/releases) 页面下载

### 🔧 版本说明
- **安装版** (推荐): 自动更新、系统集成、开机自启
- **便携版**: 免安装、即开即用、便于携带

## 🚀 快速开始

### 1️⃣ 配置 API
1. 打开应用，点击右上角 ⚙️ 设置
2. 在"模型配置"中添加你的 API 提供商
3. 输入 API Key 和模型名称

### 2️⃣ 开始对话
1. 选择模型后，在输入框中输入问题
2. 可以上传文件、启用联网搜索
3. AI 助手将为你提供智能回答

### 3️⃣ 高级功能
- **联网搜索**: 开启后获取实时信息
- **文件上传**: 支持分析 PDF、图片等文件
- **知识库**: 导入网页内容，构建个人知识库

## 🛠️ 开发指南

### 📋 技术栈
- **前端**: Vue 3 + TypeScript + Vite
- **桌面**: Electron
- **UI 框架**: Element Plus
- **状态管理**: Pinia
- **构建工具**: electron-builder

### 🔧 环境要求
- Node.js 18+
- npm 或 yarn
- Git

### 📦 本地开发

```bash
# 克隆项目
git clone https://github.com/hua123an/llmchat.git
cd llmchat

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建应用
npm run build:app
```

### 🚀 发布流程

```bash
# 自动化发布 (推荐)
npm run release

# 手动构建和上传
npm run release:manual

# 仅创建下载页面
npm run create-download-page
```

## 📊 项目结构

```
chatllm/
├── electron/                # Electron 主进程
│   ├── main.ts              # 主进程入口
│   ├── preload.ts           # 预加载脚本
│   └── utils/               # 工具函数
├── src/                     # 前端源码
│   ├── components/          # Vue 组件
│   ├── services/            # 业务逻辑
│   ├── store/               # 状态管理
│   └── utils/               # 工具函数
├── scripts/                 # 构建脚本
│   ├── release.cjs          # 自动发布
│   ├── upload-updates.cjs   # 上传更新
│   └── create-download-page.cjs # 生成下载页
└── build/                   # 构建配置
```

## 🤝 贡献指南

我们欢迎任何形式的贡献！

### 📝 提交问题
- 使用 [GitHub Issues](https://github.com/hua123an/llmchat/issues) 报告 Bug
- 提供详细的复现步骤和环境信息

### 🔧 提交代码
1. Fork 这个项目
2. 创建功能分支: `git checkout -b feature/amazing-feature`
3. 提交更改: `git commit -m 'Add amazing feature'`
4. 推送分支: `git push origin feature/amazing-feature`
5. 提交 Pull Request

### 📋 开发规范
- 遵循 TypeScript 类型规范
- 使用 ESLint 和 Prettier
- 编写清晰的提交信息
- 为新功能添加测试

## 📄 更新日志

查看 [CHANGELOG.md](CHANGELOG.md) 了解版本更新详情。

### 🆕 最新版本 v2.0.1 (2025-08-15)
- 统一下拉组件 AppSelect，文本不截断，键盘无障碍
- 文生图进度与取消，阿里云错误提示优化
- 大量 i18n/aria-label 补齐，修复重复键与类型问题

## 📞 支持与反馈

### 🐛 问题反馈
- [GitHub Issues](https://github.com/hua123an/llmchat/issues)
- [功能建议](https://github.com/hua123an/llmchat/discussions)

### 📚 文档资源
- [API 文档](API_DOCUMENTATION.md)
- [构建指南](BUILD.md)
- [更新日志](CHANGELOG.md)

## 📜 许可证

本项目基于 [MIT License](LICENSE) 开源协议。

## 🙏 致谢

感谢所有贡献者和用户的支持！

- Vue.js 团队提供的优秀框架
- Electron 社区的技术支持
- 所有 AI 模型提供商

---

<div align="center">

**⭐ 如果这个项目对你有帮助，请给它一个 Star！**

Made with ❤️ by [ChatLLM Team](https://github.com/hua123an)

</div>