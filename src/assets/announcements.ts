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
    "date": "2024-12-28",
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
    "date": "2024-12-27",
    "items": []
  }
];
