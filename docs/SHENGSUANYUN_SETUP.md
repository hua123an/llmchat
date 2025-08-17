# 胜算云配置指南

## 🚨 问题解决

如果您遇到 "请先配置 shengsuanyun 的API密钥或服务地址" 错误，请按照以下步骤进行配置：

## 📋 配置步骤

### 1. 获取胜算云API密钥

1. 访问 [胜算云官网](https://router.shengsuanyun.com)
2. 注册账号并登录
3. 在控制台中获取API密钥

### 2. 在应用中配置

#### 方法一：通过应用设置（推荐）

1. 打开应用设置
2. 找到"服务商管理"或"API配置"
3. 添加新的服务商：
   - **名称**: `shengsuanyun`
   - **基础URL**: `https://router.shengsuanyun.com`
   - **API密钥**: 您获取的密钥

#### 方法二：通过配置文件

在应用配置文件中添加：

```json
{
  "providers": [
    {
      "name": "shengsuanyun",
      "baseUrl": "https://router.shengsuanyun.com",
      "apiKey": "your-api-key-here"
    }
  ]
}
```

### 3. 验证配置

配置完成后，使用 `ShengsuanyunDemo.vue` 组件测试功能：

- 联网搜索应该能正常工作
- 思考模式应该能正常响应
- 文生图应该能生成图像

## 🔧 故障排除

### 常见问题

#### 1. API密钥错误
```
错误: 胜算云API密钥未配置
解决: 检查API密钥是否正确配置
```

#### 2. 网络连接问题
```
错误: 胜算云搜索请求失败
解决: 检查网络连接和防火墙设置
```

#### 3. 配置未生效
```
错误: 配置后仍然提示未配置
解决: 重启应用或检查配置文件路径
```

### 调试步骤

1. **检查配置状态**
   ```typescript
   // 在浏览器控制台中运行
   if (window.electronAPI) {
     window.electronAPI.hasProviderKey('shengsuanyun')
       .then(result => console.log('配置状态:', result));
   }
   ```

2. **检查API密钥**
   ```typescript
   // 获取API密钥预览（不会显示完整密钥）
   if (window.electronAPI) {
     window.electronAPI.getProviderKeyPreview('shengsuanyun')
       .then(result => console.log('密钥预览:', result));
   }
   ```

3. **测试服务商连接**
   ```typescript
   // 测试服务商连接
   if (window.electronAPI) {
     window.electronAPI.testProvider('shengsuanyun')
       .then(result => console.log('连接测试:', result));
   }
   ```

## 📁 配置文件位置

### Windows
```
%APPDATA%\llmchat\secure-config.json
```

### macOS
```
~/Library/Application Support/llmchat/secure-config.json
```

### Linux
```
~/.config/llmchat/secure-config.json
```

## 🔐 安全说明

- API密钥使用系统级加密存储
- 密钥不会在日志中明文显示
- 建议定期更换API密钥
- 不要在代码中硬编码API密钥

## 📞 技术支持

如果配置后仍有问题，请：

1. 检查控制台错误信息
2. 确认API密钥格式正确
3. 验证网络连接正常
4. 联系技术支持

---

*配置完成后，您就可以正常使用胜算云的联网搜索、思考模式和文生图功能了！*
