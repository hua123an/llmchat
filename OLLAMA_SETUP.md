# 🦙 Ollama 本地模型配置指南

## 📋 简介

Ollama 是一个在本地运行大语言模型的工具，ChatLLM 现已支持 Ollama 集成，让您可以使用完全本地化的 AI 模型。

## 🚀 快速开始

### 1. 安装 Ollama

**macOS/Linux:**
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

**Windows:**
下载安装程序：[https://ollama.ai/download/windows](https://ollama.ai/download/windows)

### 2. 启动 Ollama 服务

```bash
ollama serve
```

Ollama 服务将在 `http://localhost:11434` 运行。

### 3. 下载模型

**推荐模型：**

```bash
# Llama 3.2 (3B) - 轻量级，适合日常对话
ollama pull llama3.2

# Qwen2.5 7B - 中英文支持优秀
ollama pull qwen2.5:7b

# Mistral 7B - 代码生成能力强
ollama pull mistral:7b

# Code Llama 7B - 专门用于代码
ollama pull codellama:7b

# Gemma 2 9B - Google 开源模型
ollama pull gemma2:9b
```

**查看已安装模型：**
```bash
ollama list
```

## 🔧 在 ChatLLM 中配置 Ollama

### 1. 添加 Provider

在 ChatLLM 设置中添加新的 Provider：

- **Provider 名称**: `Ollama`
- **API 端点**: `http://localhost:11434`
- **API 密钥**: 留空即可 ⚠️ （本地 Ollama 无需密钥）

### 2. 环境变量 (可选)

如果您需要自定义配置，可以在 `.env` 文件中设置：

```env
# Ollama 配置
OLLAMA_API_URL=http://localhost:11434
OLLAMA_API_KEY=  # 本地Ollama无需密钥，留空即可
ENABLE_OLLAMA=true
```

## 🎯 模型推荐

### 按用途分类

**📝 日常对话**
- `llama3.2:latest` - 最新 Llama 模型，平衡性能
- `qwen2.5:7b` - 中文支持优秀

**💻 编程辅助**
- `codellama:7b` - 专门用于代码生成
- `mistral:7b` - 代码理解能力强

**🌐 多语言支持**
- `qwen2.5:7b` - 中英文双语
- `gemma2:9b` - 多语言支持

**⚡ 性能要求**
- 轻量级：`llama3.2:3b`, `qwen2.5:3b`
- 高性能：`llama3.1:70b`, `qwen2.5:14b`

## 🔍 故障排除

### 常见问题

**Q: Ollama 服务连接失败**
```bash
# 检查服务状态
ollama ps

# 重启服务
ollama serve
```

**Q: 模型列表为空**
```bash
# 确保已安装模型
ollama list

# 如果没有模型，下载一个
ollama pull llama3.2
```

**Q: 响应速度慢**
- 考虑使用较小的模型 (3B-7B)
- 确保有足够的系统内存 (至少 8GB)
- 关闭其他占用 GPU/CPU 的应用

### 系统要求

**最低配置：**
- RAM: 8GB (3B 模型)
- 存储: 4GB 可用空间
- CPU: 现代多核处理器

**推荐配置：**
- RAM: 16GB+ (7B+ 模型)
- GPU: NVIDIA RTX 系列 (可选，加速推理)
- 存储: 20GB+ SSD

## 🚀 高级配置

### 自定义模型参数

根据 [Ollama 官方 API 文档](https://github.com/ollama/ollama/blob/main/docs/api.md)，ChatLLM 支持以下官方参数：

```javascript
// 在 electron/main.ts 中的 ollamaRequestBody.options
options: {
  temperature: 0.7,        // 创造性控制 (0.0-2.0，默认0.8)
  top_k: 40,               // Top-k采样 (默认40)
  top_p: 0.9,              // Top-p采样 (默认0.9)
  num_predict: 4096,       // 最大生成tokens数 (默认128，-1无限制)
  repeat_penalty: 1.1,     // 重复惩罚 (默认1.1)
  seed: -1,                // 随机种子 (-1为随机)
  stop: [],                // 停止词列表
  num_ctx: 2048,           // 上下文窗口大小 (默认2048)
  num_thread: 8,           // 线程数 (默认检测CPU核心数)
  mirostat: 0,             // Mirostat采样 (0=禁用, 1=Mirostat, 2=Mirostat 2.0)
  mirostat_eta: 0.1,       // Mirostat学习率 (默认0.1)
  mirostat_tau: 5.0        // Mirostat目标熵 (默认5.0)
}
```

### 模型性能调优建议

**对话质量优先：**
```javascript
{
  temperature: 0.7,
  top_p: 0.9,
  repeat_penalty: 1.1,
  num_ctx: 4096
}
```

**快速响应优先：**
```javascript
{
  temperature: 0.3,
  top_k: 20,
  num_predict: 2048,
  num_ctx: 2048,
  num_thread: 8
}
```

**创意写作优化：**
```javascript
{
  temperature: 0.9,
  top_p: 0.95,
  repeat_penalty: 1.05,
  mirostat: 2,
  mirostat_tau: 4.0
}
```

### GPU 加速 (可选)

如果您有 NVIDIA GPU，Ollama 会自动使用 CUDA 加速：

```bash
# 验证 GPU 支持
nvidia-smi

# 查看 Ollama GPU 使用情况
ollama ps
```

## 🔧 API 端点说明

根据 [官方 API 文档](https://github.com/ollama/ollama/blob/main/docs/api.md)，Ollama 提供以下主要端点：

| 端点 | 方法 | 用途 | ChatLLM 中的使用 |
|------|------|------|------------------|
| `/api/chat` | POST | 流式对话 | ✅ 主要聊天接口 |
| `/api/tags` | GET | 获取模型列表 | ✅ 模型选择器 |
| `/api/show` | POST | 获取模型详情 | 📋 待实现 |
| `/api/pull` | POST | 下载模型 | 📋 待实现 |
| `/api/create` | POST | 创建自定义模型 | 📋 待实现 |

### 响应格式示例

**流式聊天响应：**
```json
{
  "message": {
    "role": "assistant",
    "content": "Hello! How can I help you today?"
  },
  "done": false
}
```

**最终响应（含性能指标）：**
```json
{
  "message": {
    "role": "assistant",
    "content": ""
  },
  "done": true,
  "total_duration": 5589157167,
  "load_duration": 3013701500,
  "prompt_eval_count": 26,
  "prompt_eval_duration": 325953000,
  "eval_count": 290,
  "eval_duration": 2240486000
}
```

## 📚 更多资源

- [Ollama 官方 API 文档](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [Ollama 官方文档](https://ollama.ai/docs)
- [模型库](https://ollama.ai/library)
- [GitHub 仓库](https://github.com/ollama/ollama)

## 🎉 开始使用

配置完成后，在 ChatLLM 的模型选择器中：

1. 选择 `Ollama` 提供商
2. 选择已安装的模型 (如 `llama3.2:latest`)
3. 开始本地化 AI 对话！

---

**提示**: 首次使用时，如果模型列表为空，请确保 Ollama 服务正在运行并且已安装至少一个模型。
