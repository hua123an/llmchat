# 🎨 样式系统指南

本项目采用模块化的CSS架构，统一管理所有样式和设计变量。

## 📁 文件结构

```
src/styles/
├── README.md           # 样式系统文档（本文件）
├── variables.css       # 设计变量和CSS自定义属性
├── theme.css          # 主题系统和全局基础样式
├── layout.css         # 布局相关样式
└── chat.css           # 聊天界面专用样式
```

## 🎯 设计原则

### 1. 变量优先
- 所有颜色、间距、字体等都使用CSS变量
- 避免硬编码任何设计值
- 确保主题切换的一致性

### 2. 模块化组织
- 按功能模块划分样式文件
- 每个文件职责单一，便于维护
- 避免样式冲突和重复

### 3. 语义化命名
- 使用语义化的变量名（如 `--text-primary` 而非 `--color-gray-900`）
- 便于理解和使用
- 支持主题切换

## 📋 使用规范

### CSS变量命名规范

```css
/* ✅ 好的命名 */
--text-primary          /* 主要文字颜色 */
--bg-surface           /* 表面背景色 */
--space-4              /* 16px间距 */
--radius-lg            /* 大圆角 */

/* ❌ 避免的命名 */
--gray-900             /* 不够语义化 */
--color1               /* 无意义命名 */
--big-padding          /* 不够精确 */
```

### 颜色系统

#### 主色调
- `--brand-primary`: #6366f1 (紫色，主要按钮、链接)
- `--brand-secondary`: #ec4899 (粉色，次要元素)
- `--brand-accent`: #14b8a6 (青色，强调元素)

#### 语义化颜色
- `--success`: #10b981 (成功状态)
- `--warning`: #f59e0b (警告状态)
- `--error`: #ef4444 (错误状态)
- `--info`: #3b82f6 (信息状态)

#### 背景色系统
- `--bg-page`: 页面主背景 (#f7f7f7)
- `--bg-container`: 容器背景 (#ffffff)
- `--bg-surface`: 表面背景 (#f8fafc)
- `--bg-hover`: 悬停背景 (#f3f4f6)

#### 文字颜色系统
- `--text-primary`: 主要文字 (#111827)
- `--text-secondary`: 次要文字 (#6b7280)
- `--text-tertiary`: 辅助文字 (#9ca3af)

### 间距系统

采用4px基准的间距系统：

```css
--space-1: 4px
--space-2: 8px
--space-3: 12px
--space-4: 16px
--space-5: 20px
--space-6: 24px
--space-8: 32px
/* ... */
```

### 字体系统

```css
/* 字体族 */
--font-family-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto'...
--font-family-mono: 'SFMono-Regular', 'Consolas'...

/* 字体大小 */
--font-size-xs: 12px
--font-size-sm: 14px
--font-size-base: 16px
--font-size-lg: 18px
/* ... */

/* 字重 */
--font-weight-normal: 400
--font-weight-medium: 500
--font-weight-semibold: 600
--font-weight-bold: 700
```

## 🌙 主题系统

支持亮色和暗色主题自动切换：

```css
/* 亮色主题（默认） */
:root {
  --bg-primary: #ffffff;
  --text-primary: #111827;
}

/* 暗色主题 */
[data-theme="dark"] {
  --bg-primary: #1e293b;
  --text-primary: #f1f5f9;
}
```

### 主题切换

通过修改根元素的 `data-theme` 属性：

```javascript
// 切换到暗色主题
document.documentElement.setAttribute('data-theme', 'dark');

// 切换到亮色主题
document.documentElement.setAttribute('data-theme', 'light');
```

## 🧩 组件样式

### 聊天界面样式

聊天相关的特殊样式定义在 `chat.css` 中：

- `--chat-user-bg`: 用户消息背景色
- `--chat-assistant-bg`: AI助手消息背景色
- `--chat-system-bg`: 系统消息背景色

### Agent系统样式

Agent相关的样式变量：

- `--agent-primary`: Agent主色
- `--agent-surface`: Agent卡片背景
- `--agent-selected`: Agent选中状态背景

## 💡 最佳实践

### 1. 使用CSS变量

```css
/* ✅ 推荐 */
.button {
  background-color: var(--brand-primary);
  color: var(--text-inverse);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
}

/* ❌ 避免 */
.button {
  background-color: #6366f1;
  color: white;
  padding: 12px 16px;
  border-radius: 8px;
}
```

### 2. 响应式设计

使用CSS变量便于响应式调整：

```css
.container {
  padding: var(--space-4);
}

@media (min-width: 768px) {
  .container {
    padding: var(--space-6);
  }
}
```

### 3. 组件隔离

使用CSS Modules或scoped样式避免全局污染：

```vue
<style scoped>
.chat-message {
  background-color: var(--chat-user-bg);
  border-radius: var(--radius-lg);
}
</style>
```

## 🔧 开发工具

### 浏览器开发者工具

使用浏览器开发者工具查看和调试CSS变量：

1. 打开开发者工具
2. 选择Elements面板
3. 查看 `:root` 或相应元素的CSS变量
4. 实时修改变量值进行调试

### VSCode插件推荐

- **CSS Peek**: 快速查看CSS定义
- **Color Highlight**: 高亮显示颜色值
- **CSS Variables Autocomplete**: CSS变量自动完成

## 📝 更新日志

### v1.0.0 (2025-01-15)
- 建立基础样式系统
- 实现亮色/暗色主题
- 添加聊天和Agent专用样式
- 创建完整的设计变量系统

---

## 🤝 贡献指南

在添加新样式时，请遵循以下原则：

1. 优先检查是否有现有的CSS变量可用
2. 新增变量时使用语义化命名
3. 确保暗色主题兼容性
4. 添加适当的注释说明
5. 更新本文档的变量列表

有任何样式相关问题，请参考本文档或提交Issue讨论。