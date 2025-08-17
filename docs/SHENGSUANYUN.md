# 胜算云功能集成说明

## 概述

本项目已成功集成胜算云（Shengsuanyun）服务，支持以下核心功能：

- 🔍 **联网搜索** - 实时获取互联网信息
- 🧠 **思考模式** - AI深度思考和分析
- 🎨 **文生图** - 高质量AI图像生成
- 💡 **搜索建议** - 智能关键词推荐

## 配置要求

### 1. API密钥配置

在使用胜算云功能前，需要先配置API密钥：

1. 访问 [胜算云官网](https://router.shengsuanyun.com) 注册账号
2. 获取API密钥
3. 在应用设置中配置胜算云服务商

### 2. 服务商配置

在应用设置中添加胜算云服务商：

```json
{
  "name": "shengsuanyun",
  "baseUrl": "https://router.shengsuanyun.com",
  "apiKey": "your-api-key-here"
}
```

## 功能详解

### 🔍 联网搜索

胜算云联网搜索功能基于其强大的搜索引擎，能够实时获取最新的互联网信息。

#### 使用方法

```typescript
import { shengsuanyunWebSearch } from '@/services/search/shengsuanyun';

// 基础搜索
const results = await shengsuanyunWebSearch('人工智能最新发展', {
  search_context_size: 'medium',
  max_results: 10
});

// 高级搜索选项
const advancedResults = await shengsuanyunWebSearch('量子计算', {
  search_context_size: 'high',    // 搜索上下文大小：low/medium/high
  max_results: 20,                // 最大结果数量
  timeout_sec: 30,                // 超时时间（秒）
  model: 'deepseek/deepseek-v3'   // 使用的模型
});
```

#### 搜索选项说明

- `search_context_size`: 搜索上下文大小
  - `low`: 快速搜索，结果较少但速度快
  - `medium`: 平衡模式，推荐使用
  - `high`: 深度搜索，结果全面但速度较慢
- `max_results`: 最大返回结果数量（1-50）
- `timeout_sec`: 搜索超时时间
- `model`: 使用的AI模型

### 🧠 思考模式

思考模式结合联网搜索和AI推理，能够对复杂问题进行深度分析和思考。

#### 使用方法

```typescript
import { shengsuanyunThinkingSearch } from '@/services/search/shengsuanyun';

const thinkingResult = await shengsuanyunThinkingSearch('如何评估一个创业项目的可行性？', {
  search_context_size: 'high',
  max_results: 5
});

console.log('思考过程:', thinkingResult.thinkingProcess);
console.log('最终答案:', thinkingResult.finalAnswer);
```

#### 思考模式特点

- **分步推理**: AI会按照逻辑步骤分析问题
- **信息整合**: 结合搜索结果和知识库
- **深度分析**: 提供详细的思考过程
- **结论总结**: 给出明确的最终答案

### 🎨 文生图

胜算云文生图功能支持多种AI模型，能够根据文字描述生成高质量图像。

#### 使用方法

```typescript
import { ImageGenerationService } from '@/services/ImageGenerationService';

const result = await ImageGenerationService.generateImage({
  prompt: '一只可爱的小猫坐在花园里，阳光明媚，风格温馨',
  model: 'stable-diffusion',
  size: '1024x1024',
  n: 1
}, 'shengsuanyun');

if (result.success) {
  console.log('生成的图像:', result.images);
  console.log('成本:', result.usage?.cost);
}
```

#### 支持的模型

- **Stable Diffusion**: 开源模型，适合艺术创作
- **DALL-E 3**: OpenAI最新模型，质量极高
- **DALL-E 2**: 经典模型，稳定可靠
- **Midjourney风格**: 艺术风格，适合创意设计

#### 支持的尺寸

- `256x256` - 小尺寸，适合头像
- `512x512` - 标准尺寸，平衡质量和速度
- `1024x1024` - 高清尺寸，推荐使用
- `1792x1024` - 宽屏尺寸，适合风景
- `1024x1792` - 竖屏尺寸，适合人像

### 💡 搜索建议

智能搜索建议功能能够根据用户输入的部分关键词，推荐相关的搜索词。

#### 使用方法

```typescript
import { shengsuanyunSearchSuggestions } from '@/services/search/shengsuanyun';

const suggestions = await shengsuanyunSearchSuggestions('人工智能', 5);
console.log('搜索建议:', suggestions);
// 输出: ['人工智能应用', '人工智能发展', '人工智能技术', '人工智能未来', '人工智能教育']
```

## 技术实现

### 架构设计

```
前端组件 → IPC接口 → Electron主进程 → 胜算云API
```

### 核心文件

- `src/services/search/shengsuanyun.ts` - 胜算云搜索服务
- `src/services/ImageGenerationService.ts` - 图像生成服务
- `src/components/common/ShengsuanyunDemo.vue` - 功能演示组件
- `electron/main.ts` - 主进程API处理
- `electron/preload.ts` - 渲染进程接口

### API兼容性

胜算云API完全兼容OpenAI标准，支持：

- 标准的聊天完成接口
- 流式响应
- 工具调用
- 联网搜索扩展
- 思考模式增强

## 使用示例

### 完整搜索流程

```typescript
import { 
  shengsuanyunWebSearch, 
  shengsuanyunThinkingSearch 
} from '@/services/search/shengsuanyun';

async function comprehensiveSearch(query: string) {
  try {
    // 第一步：联网搜索
    console.log('🔍 开始联网搜索...');
    const searchResults = await shengsuanyunWebSearch(query, {
      search_context_size: 'high',
      max_results: 10
    });
    
    console.log(`✅ 搜索完成，获得 ${searchResults.length} 个结果`);
    
    // 第二步：思考模式分析
    console.log('🧠 开始深度思考...');
    const thinkingResult = await shengsuanyunThinkingSearch(query, searchResults, {
      search_context_size: 'high'
    });
    
    console.log('✅ 思考完成');
    console.log('思考过程:', thinkingResult.thinkingProcess);
    console.log('最终答案:', thinkingResult.finalAnswer);
    
    return {
      searchResults,
      thinkingResult
    };
    
  } catch (error) {
    console.error('❌ 搜索失败:', error);
    throw error;
  }
}

// 使用示例
comprehensiveSearch('2024年人工智能发展趋势分析')
  .then(result => {
    console.log('完整搜索结果:', result);
  })
  .catch(error => {
    console.error('搜索失败:', error);
  });
```

### 图像生成流程

```typescript
import { ImageGenerationService } from '@/services/ImageGenerationService';

async function generateMultipleImages() {
  const prompts = [
    '一只可爱的小猫',
    '美丽的日落风景',
    '未来科技城市'
  ];
  
  const results = [];
  
  for (const prompt of prompts) {
    try {
      console.log(`🎨 生成图像: ${prompt}`);
      
      const result = await ImageGenerationService.generateImage({
        prompt,
        model: 'stable-diffusion',
        size: '1024x1024',
        n: 1
      }, 'shengsuanyun');
      
      if (result.success) {
        results.push({
          prompt,
          images: result.images,
          cost: result.usage?.cost
        });
        console.log(`✅ 图像生成成功，成本: $${result.usage?.cost}`);
      }
      
    } catch (error) {
      console.error(`❌ 图像生成失败: ${prompt}`, error);
    }
  }
  
  return results;
}
```

## 错误处理

### 常见错误及解决方案

1. **API密钥错误**
   ```
   错误: 胜算云API密钥未配置
   解决: 检查API密钥配置是否正确
   ```

2. **网络连接错误**
   ```
   错误: 胜算云搜索请求失败: 500
   解决: 检查网络连接，稍后重试
   ```

3. **模型不支持**
   ```
   错误: 不支持的图像生成服务商: shengsuanyun
   解决: 确保在Electron环境中运行
   ```

4. **超时错误**
   ```
   错误: 搜索超时
   解决: 减少max_results或增加timeout_sec
   ```

### 错误处理最佳实践

```typescript
try {
  const results = await shengsuanyunWebSearch(query, options);
  return results;
} catch (error) {
  if (error.message.includes('API密钥')) {
    // 配置错误，提示用户
    throw new Error('请先配置胜算云API密钥');
  } else if (error.message.includes('网络')) {
    // 网络错误，建议重试
    throw new Error('网络连接失败，请稍后重试');
  } else if (error.message.includes('超时')) {
    // 超时错误，建议调整参数
    throw new Error('搜索超时，请减少结果数量或稍后重试');
  } else {
    // 其他错误
    throw new Error(`搜索失败: ${error.message}`);
  }
}
```

## 性能优化

### 搜索优化

1. **合理设置搜索参数**
   - 使用`medium`上下文大小平衡速度和准确性
   - 根据需求设置合适的`max_results`

2. **缓存搜索结果**
   - 对相同查询缓存结果
   - 避免重复搜索

3. **异步处理**
   - 搜索过程不阻塞UI
   - 使用loading状态提升用户体验

### 图像生成优化

1. **批量生成**
   - 一次生成多张图像减少API调用
   - 合理设置图像数量

2. **模型选择**
   - 根据需求选择合适的模型
   - 考虑成本和质量平衡

3. **提示词优化**
   - 使用清晰、具体的描述
   - 避免模糊或矛盾的描述

## 成本控制

### 定价说明

胜算云采用按使用量计费模式：

- **聊天/搜索**: 按token计费
- **图像生成**: 按图像数量和尺寸计费

### 成本优化建议

1. **合理使用联网搜索**
   - 避免不必要的搜索
   - 使用缓存减少重复搜索

2. **图像生成控制**
   - 选择合适的图像尺寸
   - 避免生成过多测试图像

3. **监控使用量**
   - 定期检查API使用情况
   - 设置使用量限制

## 更新日志

### v1.0.0 (2024-01-XX)
- ✨ 初始版本发布
- 🔍 支持联网搜索功能
- 🧠 支持思考模式
- 🎨 支持文生图功能
- 💡 支持搜索建议

## 技术支持

### 获取帮助

- **文档**: 查看本文档获取详细说明
- **演示**: 使用`ShengsuanyunDemo.vue`组件测试功能
- **问题反馈**: 提交Issue描述问题

### 联系方式

- **官网**: [https://router.shengsuanyun.com](https://router.shengsuanyun.com)
- **API文档**: [https://docs.router.shengsuanyun.com](https://docs.router.shengsuanyun.com)

---

*本文档持续更新中，如有问题请及时反馈。*
