export interface ReleaseNoteItem {
  type: '新增' | '改进' | '修复';
  points: string[];
}

export interface ReleaseNote {
  version: string;
  date: string;
  items: ReleaseNoteItem[];
}

export const releaseNotes: ReleaseNote[] = [
  {
    "version": "2.2.0",
    "date": "2025-08-17",
    "items": [
      {
        "type": "新增",
        "points": [
          "新功能描述",
          "其他改进"
        ]
      },
      {
        "type": "改进",
        "points": [
          "性能优化",
          "用户体验改进"
        ]
      },
      {
        "type": "修复",
        "points": [
          "修复的问题"
        ]
      }
    ]
  },
  {
    "version": "2.1.0",
    "date": "2025-08-17",
    "items": [
      {
        "type": "新增",
        "points": [
          "新功能描述",
          "其他改进"
        ]
      },
      {
        "type": "改进",
        "points": [
          "性能优化",
          "用户体验改进"
        ]
      },
      {
        "type": "修复",
        "points": [
          "修复的问题"
        ]
      }
    ]
  },
  {
    "version": "2.0.5",
    "date": "2025-01-27",
    "items": []
  },
  {
    "version": "2.0.4",
    "date": "2025-08-16",
    "items": [
      {
        "type": "修复",
        "points": [
          "自动更新体验：进一步优化进度事件与前端显示的稳定性，进度条取整与状态切换更平滑",
          "发布流程：默认使用 notes-file 输出 UTF‑8，避免任何乱码风险",
          "文档：README 徽章与直链、下载页同步到 v2.0.4"
        ]
      }
    ]
  },
  {
    "version": "2.0.3",
    "date": "2025-08-15",
    "items": [
      {
        "type": "新增",
        "points": [
          "知识库增强版（基础页）：",
          "文本/文件（PDF、DOCX、TXT）/URL 导入",
          "文档列表、单文档删除、全部清空",
          "本地检索（BM25），结果预览",
          "侧栏新增“知识库”入口，新增 #/knowledge 路由",
          "Web Worker 解析，导入不阻塞 UI",
          "切块参数化（chunkSize/overlap/去噪）、高亮与引用回填",
          "本地/远程嵌入向量检索、MMR 排序"
        ]
      },
      {
        "type": "修复",
        "points": [
          "自动更新：设置页“检查更新”新增下载进度条；修复进度事件与浮层显示条件，非强制更新也会展示下载状态",
          "GitHub Release 乱码：发布说明改用 notes-file（UTF‑8）覆盖，中文不再乱码"
        ]
      }
    ]
  },
  {
    "version": "2.0.2",
    "date": "2025-08-15",
    "items": [
      {
        "type": "改进",
        "points": [
          "GitHub Actions 发布流程：基于 tag 自动构建并上传 Windows 产物",
          "启用 Dependabot：每周检查 npm 与 Actions 依赖",
          "README：新增 CI/Release 与 Discussions 徽章"
        ]
      },
      {
        "type": "修复",
        "points": [
          "语音识别设置：新增讯飞 WebSocket 听写配置入口",
          "版本与下载链接：统一指向 v2.0.2"
        ]
      }
    ]
  },
  {
    "version": "2.0.1",
    "date": "2025-08-15",
    "items": [
      {
        "type": "新增",
        "points": [
          "统一下拉组件 AppSelect：全站 Provider/Model/Workspace 下拉统一完整显示、键盘无障碍与 aria-label 支持",
          "文生图生成进度与取消：新增进度条与“取消”按钮，生成过程更可控"
        ]
      },
      {
        "type": "改进",
        "points": [
          "补齐大量 i18n 键与 aria-label，改进可访问性与国际化一致性",
          "统一下拉项宽度与文本不截断策略（wide-select-popper + 关闭 fit-input-width）",
          "优化阿里云图片生成的错误提示与结果提示"
        ]
      },
      {
        "type": "修复",
        "points": [
          "修复重复 i18n 键导致的构建错误 (TS1117)",
          "修复少量下拉回调类型不匹配问题"
        ]
      }
    ]
  },
  {
    "version": "1.1.0",
    "date": "2025-08-10",
    "items": [
      {
        "type": "新增",
        "points": [
          "可点击搜索链接: 搜索结果中的URL现在可以直接点击访问",
          "网页预览功能: 新增\"预览\"按钮，可在应用内查看网页内容",
          "知识库导入: 新增\"入库\"按钮，一键将网页内容保存到本地RAG知识库",
          "强制更新遮罩层: 支持强制更新模式，显示更新进度和发布说明",
          "搜索策略优化: 完全可配置的搜索参数",
          "请求超时设置",
          "失败重试次数",
          "并发度控制",
          "搜索引擎权重分配（Google/Bing/Baidu/DuckDuckGo等）"
        ]
      },
      {
        "type": "改进",
        "points": [
          "自动更新系统: 支持稳定版/测试版渠道切换",
          "类型安全: 完善了TypeScript类型定义",
          "错误处理: 改进了网络搜索的超时和重试机制",
          "用户体验: 优化了搜索结果展示和交互",
          "RAG系统: 实现了基于IndexedDB的本地知识库存储",
          "文本分块: 智能文本分块算法，支持重叠分块",
          "网页解析: 集成可读性提取，获取网页核心内容",
          "Markdown渲染: 支持更新说明的Markdown格式显示"
        ]
      },
      {
        "type": "修复",
        "points": [
          "修复了WebPreviewDialog组件重复渲染问题",
          "修复了搜索参数类型错误",
          "修复了异步函数标记问题",
          "清理了未使用的导入和变量"
        ]
      }
    ]
  },
  {
    "version": "1.0.0",
    "date": "2025-08-05",
    "items": []
  }
];
