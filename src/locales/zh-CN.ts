export default {
  // 通用
  common: {
    confirm: '确认',
    cancel: '取消',
    save: '保存',
    delete: '删除',
    edit: '编辑',
    add: '添加',
    search: '搜索',
    loading: '加载中...',
    success: '成功',
    error: '错误',
    warning: '警告',
    info: '信息',
    close: '关闭',
    back: '返回',
    next: '下一步',
    previous: '上一步',
    yes: '是',
    no: '否',
    reset: '重置',
    library: '词库',
    expand: '展开',
    collapse: '收起',
    name: '姓名',
    email: '邮箱',
    avatar: '头像',
    upload: '上传图片',
    remove: '移除',
    show: '显示',
    hide: '隐藏'
  },

  // 导航和布局
  nav: {
    newChat: '新建对话',
    settings: '设置',
    help: '帮助',
    about: '关于'
  },

  // 设置页面
  settings: {
    title: '设置',
    tabs: {
      general: '通用',
      ai: 'AI设置',
      providers: '服务商',
      shortcuts: '快捷键',
      about: '关于',
      tools: '工具',
      knowledge: '知识库',
      limits: '成本与限额'
    },
    general: {
      appearance: '外观',
      theme: '主题',
      language: '语言',
      behavior: '行为',
      sendShortcut: '发送消息快捷键',
      autoSave: '自动保存对话'
    },
    ai: {
      defaultConfig: '默认配置',
      defaultProvider: '默认服务商',
      defaultSystemPrompt: '你是一个有用的AI助手。',
      systemPromptPlaceholder: '输入默认系统提示...',
      security: '安全',
      dataEncryption: '数据加密',
      autoCleanup: '自动清理历史',
      cleanupOptions: {
        never: '从不',
        sevenDays: '7天后',
        thirtyDays: '30天后',
        ninetyDays: '90天后'
      }
    },
    shortcuts: {
      title: '快捷键',
      description: '使用键盘快捷键提高效率',
      list: {
        newChat: '新建对话',
        saveChat: '保存对话',
        search: '搜索消息',
        promptLibrary: '提示词库',
        sendMessage: '发送消息',
        clearChat: '清空对话',
        help: '帮助',
        closeDialog: '关闭对话框'
      }
    },
    about: {
      title: '关于 ChatLLM',
      version: '版本',
      description: '一个现代化的AI聊天应用，支持多个AI服务商，提供丰富的功能和优秀的用户体验。',
      links: {
        github: 'GitHub',
        docs: '文档',
        checkUpdates: '检查更新'
      }
    },
    messages: {
      saveSuccess: '设置已保存',
      loadError: '加载设置失败',
      upToDate: '当前已是最新版本！'
    },
    // 新增：服务商配置
    providers: {
      title: '服务商与 API 配置',
      name: '名称',
      actions: '操作',
      add: '新增服务商',
      test: '测试',
      refreshOllama: '刷新Ollama',
      noOllama: '请先添加Ollama提供商',
      autosaveHint: '已开启自动保存（输入即保存）',
      saveSuccess: '服务商配置已保存',
      saveFailed: '保存失败',
      keyPlaceholder: '输入并保存 API Key（不回显）',
      keyExists: '已设置（输入以更新）',
      removeKey: '移除密钥',
      keyMissing: '请先输入 API Key',
      keySaved: 'API Key 已保存',
      keySaveFailed: '保存 API Key 失败',
      keyRemoved: 'API Key 已移除',
      keyRemoveFailed: '移除 API Key 失败',
      testOK: '连通性良好',
      testFailed: '连通性测试失败',

    }
  },


  tools: {
    ocr: '文字识别',
    enableOCR: '启用 OCR (Tesseract.js)',
    ocrLang: 'OCR 语言',
    desktop: '桌面',
    enableTray: '启用托盘图标',
    enableGlobalScreenshot: '启用全局截图 (Ctrl+Shift+S)'
  },

  knowledge: {
    title: '知识库',
    importToKB: '导入到知识库',
    importText: '导入文本',
    selectFile: '选择文件',
    paste: '粘贴文本',
    or: '或',
    dragHere: '拖拽到此处',
    total: '合计',
    characters: '字符',
    search: '搜索',
    documents: '文档',
    clear: '清空',
    importSuccess: '已导入到知识库',
    importFailure: '导入失败',
    notTextAttachment: '该附件不包含可导入的文本内容',
    clearConfirm: '确认清空本地知识库？该操作不可恢复。',
    clearSuccess: '知识库已清空'
  },

  // 聊天界面
  chat: {
    placeholder: '输入您的消息...',
    thinking: 'AI正在思考中',
    sendButton: '发送',
    retry: '重试',
    newConversation: '新对话',
    deleteConversation: '删除对话',
    conversationTitle: '对话 {number}',
    emptyState: '开始新的对话',
    tokenInfo: {
      tokens: '令牌',
      responseTime: '响应时间',
      model: '模型',
      seconds: '秒'
    },
    placeholders: {
      askAnything: '想问什么就问吧...',
      selectProvider: '选择服务商',
      selectModel: '选择模型',
      loadingProviders: '正在加载服务商...',
      systemPrompt: '设置系统提示...'
    },
    autoRoute: '自动路由'
  },



  // Agent系统
  agent: {
    title: 'AI助手',
    selectAgent: '选择助手',
    noAgentSelected: '请选择一个AI助手',
    defaultAgent: '通用助手',
    agentSpace: 'AI助手空间',
    currentAgent: '当前助手',
    categories: {
      all: '全部',
      general: '通用',
      programming: '编程',
      design: '设计',
      data: '数据',
      writing: '写作',
      research: '研究',
      analysis: '分析'
    },
    agents: {
      generalAssistant: {
        name: '通用AI助手',
        description: '专业、友好、高效的全能AI助手，能够处理各种日常问题和任务。',
        examples: [
          '"我想学习一个新技能"',
          '"解答一个技术问题"'
        ],
        tags: ['问答咨询', '已经取名', '信息整理']
      },
      seniorEngineer: {
        name: '高级软件工程师',
        description: '经验丰富的全栈开发专家，精通多种编程语言和技术栈。',
        examples: [
          '"代码开发"',
          '"架构设计"',
          '"性能优化"'
        ],
        tags: ['代码开发', '架构设计', '性能优化']
      },
      codeReviewer: {
        name: '代码审查专家',
        description: '资深代码审查专家，提供专业的代码质量评估和改进建议。',
        examples: [
          '"审查代码的Python代码"',
          '"检查API接口的安全性"'
        ],
        tags: ['代码审查', '质量评估', '安全检查']
      },
      uiuxDesigner: {
        name: 'UI/UX设计师',
        description: '专业的用户界面和用户体验设计师，精通现代设计理念。',
        examples: [
          '"设计一个移动App的登录界面"',
          '"改进网站的用户体验流程"'
        ],
        tags: ['界面设计', '用户研究', '原型制作']
      }
    },
    buttons: {
      select: '选择',
      cancel: '取消',
      confirm: '确认'
    },
    examples: '示例对话',
    recommended: '推荐'
  },

  // 主题选项
  theme: {
    light: '浅色',
    dark: '深色',
    auto: '跟随系统'
  },

  // 服务商名称
  providers: {
    openrouter: 'OpenRouter',
    moonshot: 'Moonshot',
    zhipu: '智谱', 
    siliconflow: 'SiliconFlow',
    deepseek: 'DeepSeek',
    '302ai': '302AI',
    lingyi: '零一万物',
    minimax: 'MiniMax',
    spark: '讯飞星火',

    openai: 'OpenAI',
    anthropic: 'Anthropic',
    google: 'Google',
    azure: 'Azure OpenAI'
  },

  // 语言选项
  language: {
    'zh-CN': '中文',
    'en-US': 'English'
  },

  // 快捷键选项
  shortcut: {
    enter: 'Enter',
    ctrlEnter: 'Ctrl + Enter'
  },

  // 侧边栏
  sidebar: {
    newChat: '新建对话',
    userName: '用户',
    aiAssistantSpace: 'AI助手空间',
    spaces: '空间',
    conversations: '对话',
    settings: '设置',
    support: '支持',
    stats: '数据统计',
    profile: '个人资料',
    userProfile: '用户资料',
    programmingSpace: '编程助手',
    learningSpace: '学习空间'
  },

  // 数据统计
  stats: {
    title: '数据统计',
    toggle: '展开/收起统计',
    table: '表格',
    totalTokens: '累计 Tokens',
    totalCost: '预估费用(USD)',
    avgLatency: '平均响应时间',
    model: '模型',
    provider: '提供商',
    session: '会话',
    promptTokens: '输入Tokens',
    completionTokens: '输出Tokens',
    responseTime: '响应时间',
    cost: '费用',
    scope: '范围',
    scopeAll: '全部会话',
    scopeCurrent: '当前会话',
    dateRange: '时间范围',
    today: '今天',
    last7d: '近7天',
    last30d: '近30天',
    custom: '自定义',
    from: '从',
    to: '到',
    view: '视图',
    byModel: '按模型',
    byProvider: '按提供商',
    byTab: '按会话',
    trend: '趋势',
    exportCSV: '导出CSV',
    exportJSON: '导出JSON',
    copySummary: '复制摘要',
    clear: '清理范围内数据',
    comingSoon: '即将推出'
  },

  // 消息列表
  messages: {
    thinking: 'AI正在思考中',
    loadingHistory: '加载历史消息...',
    emptyState: '开始新的对话',
    quickActions: {
      deepThink: '深度思考',
      imageEdit: '图片编辑'
    },
    attachments: {
      prefix: '附件',
      defaultPrompt: '请分析这些文件的内容。'
    }
  },

  // 主题切换
  themeToggle: {
    lightMode: '浅色模式',
    darkMode: '深色模式'
  },

  // 快捷键描述
  shortcuts: {
    newChat: '新建对话',
    saveChat: '保存对话',
    search: '搜索消息',
    promptLibrary: '提示词库',
    sendMessage: '发送消息',
    clearChat: '清空对话',
    help: '帮助',
    closeDialog: '关闭对话框',
    switchSpace1: '切换到AI助手空间',
    switchSpace2: '切换到编程助手空间',
    switchSpace3: '切换到学习空间',
    toggleTheme: '切换主题',
    openAgentSelector: '打开智能助手选择器',
    toggleStats: '切换数据统计悬浮窗',
    toggleSidebar: '切换侧边栏'
  },

  // 错误信息
  errors: {
    networkError: '网络连接错误',
    serverError: '服务器错误',
    unknownError: '未知错误',
    loadFailed: '加载失败',
    saveFailed: '保存失败',
    generic: '抱歉，出错了。',
    imageNotSupported: '当前模型不支持图像输入，请切换到支持多模态的模型，或移除图片后重试。'
  },

  // 确认类提示
  confirm: {
    clearCurrentChat: '确定要清空当前聊天吗？'
  },

  // 通知类消息
  notifications: {
    newChatCreated: '已创建新聊天',
    chatSaved: '聊天已保存',
    clearedChat: '聊天已清空',
    sidebarToggleInfo: '侧边栏切换功能待实现',
    budgetWarn: '已接近本月令牌预算阈值'
  },

  // 图像生成
  imageGeneration: {
    title: 'AI图像生成',
    prompt: '图像描述',
    promptPlaceholder: '描述您想要生成的图像...',
    size: '图像尺寸',
    model: '生成模型',
    provider: '服务商',
    generate: '生成图像',
    generating: 'AI正在为您创作图像，请稍候...',
    download: '下载',
    copyToClipboard: '复制到剪贴板',
    addToChat: '添加到对话',
    preview: '图像预览',
    examplePrompts: '试试这些示例：',
    emptyState: '在左侧输入描述，开始AI创作之旅',
    actions: {
      download: '下载图像',
      copy: '复制图像',
      chat: '添加到对话'
    }
  },

  // 消息操作
  messageActions: {
    copy: '复制',
    edit: '编辑',
    delete: '删除',
    regenerate: '重新生成',
    continue: '继续生成',
    save: '保存到提示词库'
  },

  // 附件预览
  attachmentPreview: {
    preview: '预览',
    download: '下载',
    open: '打开',
    close: '关闭'
  },

  // 代码块
  codeBlock: {
    copy: '复制代码',
    copied: '已复制',
    expand: '展开',
    collapse: '收起'
  },

  // 用户资料
  userProfile: {
    title: '用户资料',
    name: '姓名',
    email: '邮箱',
    avatar: '头像',
    save: '保存',
    cancel: '取消',
    uploadAvatar: '上传头像',
    removeAvatar: '移除头像'
  },

  

  // 提示词库
  prompts: {
    title: '提示词库',
    add: '添加提示词',
    edit: '编辑提示词',
    delete: '删除提示词',
    category: '分类',
    content: '内容',
    name: '名称',
    description: '描述',
    search: '搜索提示词',
    noResults: '没有找到匹配的提示词'
  },

  // 插件管理
  plugins: {
    title: '插件管理',
    enable: '启用',
    disable: '禁用',
    configure: '配置',
    description: '描述',
    version: '版本',
    author: '作者',
    status: '状态',
    active: '活跃',
    inactive: '非活跃'
  },

  // 历史搜索
  historySearch: {
    title: '搜索历史消息',
    search: '搜索',
    searchPlaceholder: '输入关键词搜索...',
    category: '分类',
    dateRange: '日期范围',
    results: '搜索结果',
    noResults: '没有找到匹配的消息',
    clearSearch: '清空搜索',
    advancedSearch: '高级搜索',
    allCategories: '全部分类'
  },

  // A/B测试
  // 已移除A/B测试功能
};