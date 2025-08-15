# 🚀 Ollama 快速配置指南

## 1️⃣ 安装 Ollama

```bash
# macOS/Linux
curl -fsSL https://ollama.ai/install.sh | sh

# Windows: 下载安装包
# https://ollama.ai/download/windows
```

## 2️⃣ 启动服务并下载模型

```bash
# 启动 Ollama 服务
ollama serve

# 在新终端窗口下载推荐模型
ollama pull llama3.2        # 轻量级，快速响应
ollama pull qwen2.5:7b      # 中文支持优秀
```

## 3️⃣ 在 ChatLLM 中配置

1. 打开 ChatLLM
2. 进入 **设置** → **模型配置** 标签页
3. 点击 **"添加提供商"**
4. 填入配置：
   - **名称**: `Ollama`
   - **Base URL**: `http://localhost:11434`
   - **API Key**: 留空即可（本地 Ollama 无需密钥）
5. 点击 **"测试"** 验证连接
6. 点击 **"保存"**

## 4️⃣ 开始使用

在聊天界面的模型选择器中：
1. 选择 🦙 **Ollama** 提供商
2. 选择已下载的模型（如 `llama3.2:latest`）
3. 享受完全本地化的 AI 对话！

## 🔄 模型管理

**刷新模型列表：**
- 右下角点击 ⚙️ 配置按钮
- 点击 🦙 **"刷新Ollama"** 按钮
- 自动检测新下载的模型

**下载新模型：**
```bash
ollama pull qwen2.5:7b     # 中文支持优秀
ollama pull codellama:7b   # 编程助手
ollama pull mistral:7b     # 多功能模型
```

---

**💡 提示**: 
- 第一次使用可能需要几秒钟加载模型，后续对话会更快！
- 无需 API 密钥，完全本地运行，数据不泄露！
- 支持一键刷新，随时获取最新模型列表！
