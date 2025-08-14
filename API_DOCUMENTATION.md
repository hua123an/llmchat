# **联网搜索 API 文档**

## **概述**

本API提供了一个统一的接口，用于从多个主流搜索引擎（Google, Bing, Baidu）获取搜索结果。您可以通过指定搜索引擎和查询关键词，来获取经过解析和结构化的搜索数据。

## **服务器地址**

在本地运行时，服务器地址为：
`http://localhost:3000`

## **API 端点**

### `GET /search`

此端点用于执行搜索并返回一个包含多个搜索结果链接的列表，适用于需要获取广泛相关信息场景。

#### **请求参数**

| 参数名 | 类型 | 是否必需 | 描述 |
| --- | --- | --- | --- |
| `q` | `string` | 是 | 您要搜索的关键词。 |
| `engine`| `string` | 是 | 您希望使用的搜索引擎。 |

**支持的 `engine` 值:**

*   `google`: 使用 Google 搜索引擎。
*   `bing`: 使用 Bing 搜索引擎。
*   `baidu`: 使用 Baidu 搜索引擎。

#### **请求示例**

*   **使用 Google 搜索 "Gemini API":**
    ```
    http://localhost:3000/search?q=Gemini%20API&engine=google
    ```

#### **响应格式 (成功)**

响应体是一个JSON数组，每个元素代表一条搜索结果。

```json
[
  {
    "title": "Google AI",
    "link": "https://ai.google/",
    "snippet": "Explore Google's groundbreaking research and AI innovations..."
  },
  {
    "title": "Google AI for Developers",
    "link": "https://ai.google.dev/",
    "snippet": "Access powerful AI models and tools from Google..."
  }
]
```

---

### `GET /answer`

此端点用于针对具体问题（如“北京时间是几点？”或“1+1等于几？”）直接获取答案。它会尝试从Google的搜索结果中提取最直接的答案。

#### **请求参数**

| 参数名 | 类型 | 是否必需 | 描述 |
| --- | --- | --- | --- |
| `q` | `string` | 是 | 您要查询的具体问题。 |

#### **请求示例**

*   **查询当前北京时间:**
    ```
    http://localhost:3000/answer?q=%E5%8C%97%E4%BA%AC%E6%97%B6%E9%97%B4
    ```
*   **查询天气:**
    ```
    http://localhost:3000/answer?q=london+weather
    ```

#### **响应格式 (成功)**

响应体是一个JSON对象，包含一个 `answer` 字段。

*   **如果找到直接答案:**
    ```json
    {
      "answer": "下午4:42"
    }
    ```
*   **如果未找到直接答案 (回退方案):**
    如果无法从页面上找到明确的答案卡片，API会返回第一个搜索结果的标题和摘要作为备选答案。
    ```json
    {
      "answer": "Time in Beijing, China - World Time Server: Current local time in Beijing, China..."
    }
    ```

#### **失败响应 (Status Code: 4xx or 5xx)**

如果请求失败，响应体将是一个包含错误信息的JSON对象。

```json
{
  "error": "An error occurred while retrieving the answer"
}
```

## **如何启动服务**

在您的项目根目录下，打开终端并运行以下命令：
```bash
node index.js
```
看到以下输出后，表示服务器已成功启动：
```
Server is running on http://localhost:3000
```