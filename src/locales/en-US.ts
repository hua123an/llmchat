export default {
  // Common
  common: {
    confirm: 'Confirm',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    search: 'Search',
    loading: 'Loading...',
    success: 'Success',
    error: 'Error',
    warning: 'Warning',
    info: 'Info',
    close: 'Close',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    yes: 'Yes',
    no: 'No',
    reset: 'Reset',
    library: 'Library',
    expand: 'Expand',
    collapse: 'Collapse',
    name: 'Name',
    email: 'Email',
    avatar: 'Avatar',
    upload: 'Upload Image',
    remove: 'Remove',
    show: 'Show',
    hide: 'Hide'
  },

  // Navigation and Layout
  nav: {
    newChat: 'New Chat',
    settings: 'Settings',
    help: 'Help',
    about: 'About'
  },

  // Settings Page
  settings: {
    title: 'Settings',
    tabs: {
      general: 'General',
      ai: 'AI Settings',
      providers: 'Providers',
      shortcuts: 'Shortcuts',
      about: 'About',
      tools: 'Tools',
      knowledge: 'Knowledge',
      limits: 'Cost & Limits'
    },
    general: {
      appearance: 'Appearance',
      theme: 'Theme',
      language: 'Language',
      behavior: 'Behavior',
      sendShortcut: 'Send Message Shortcut',
      autoSave: 'Auto Save Conversations'
    },
    ai: {
      defaultConfig: 'Default Configuration',
      defaultProvider: 'Default Provider',
      defaultSystemPrompt: 'You are a helpful AI assistant.',
      systemPromptPlaceholder: 'Enter default system prompt...',
      security: 'Security',
      dataEncryption: 'Data Encryption',
      autoCleanup: 'Auto Cleanup History',
      cleanupOptions: {
        never: 'Never',
        sevenDays: 'After 7 days',
        thirtyDays: 'After 30 days',
        ninetyDays: 'After 90 days'
      }
    },
    shortcuts: {
      title: 'Keyboard Shortcuts',
      description: 'Use keyboard shortcuts to improve efficiency',
      list: {
        newChat: 'New Chat',
        saveChat: 'Save Chat',
        search: 'Search Messages',
        promptLibrary: 'Prompt Library',
        sendMessage: 'Send Message',
        clearChat: 'Clear Chat',
        help: 'Help',
        closeDialog: 'Close Dialog'
      }
    },
    about: {
      title: 'About ChatLLM',
      version: 'Version',
      description: 'A modern AI conversation application that supports multiple AI service providers, offering rich features and excellent user experience.',
      links: {
        github: 'GitHub',
        docs: 'Documentation',
        checkUpdates: 'Check for Updates'
      }
    },
    messages: {
      saveSuccess: 'Settings saved successfully',
      loadError: 'Failed to load settings',
      upToDate: 'You are already using the latest version!'
    },
    providers: {
      title: 'Providers & API Configuration',
      name: 'Name',
      actions: 'Actions',
      add: 'Add Provider',
      test: 'Test',
      autosaveHint: 'Auto-save enabled (typing saves)',
      saveSuccess: 'Providers saved',
      saveFailed: 'Save failed',
      keyPlaceholder: 'Enter and save API Key (will not display after saving)',
      keyExists: 'Saved (enter to update)',
      removeKey: 'Remove Key',
      keyMissing: 'Please enter API Key first',
      keySaved: 'API Key saved',
      keySaveFailed: 'Failed to save API Key',
      keyRemoved: 'API Key removed',
      keyRemoveFailed: 'Failed to remove API Key',
      testOK: 'Connectivity OK',
      testFailed: 'Connectivity test failed',

    }
  },

  tools: {
    ocr: 'OCR',
    enableOCR: 'Enable OCR (Tesseract.js)',
    ocrLang: 'OCR Language',
    desktop: 'Desktop',
    enableTray: 'Enable Tray Icon',
    enableGlobalScreenshot: 'Enable Global Screenshot (Ctrl+Shift+S)'
  },

  knowledge: {
    title: 'Knowledge Base',
    importToKB: 'Import to Knowledge',
    importText: 'Import Text',
    selectFile: 'Select File',
    paste: 'Paste Text',
    or: 'or',
    dragHere: 'drag here',
    total: 'Total',
    characters: 'Characters',
    search: 'Search',
    documents: 'Documents',
    clear: 'Clear',
    importSuccess: 'Imported to knowledge base',
    importFailure: 'Import failed',
    notTextAttachment: 'This attachment has no importable text content'
  },

  // Chat Interface
  chat: {
    placeholder: 'Type your message...',
    thinking: 'AI is thinking',
    sendButton: 'Send',
    retry: 'Retry',
    newConversation: 'New Conversation',
    deleteConversation: 'Delete Conversation',
    conversationTitle: 'Conversation {number}',
    emptyState: 'Start a new conversation',
    tokenInfo: {
      tokens: 'Tokens',
      responseTime: 'Response Time',
      model: 'Model',
      seconds: 's'
    },
    placeholders: {
      askAnything: 'Ask anything...',
      selectProvider: 'Select Provider',
      selectModel: 'Select Model',
      loadingProviders: 'Loading providers...',
      systemPrompt: 'Set system prompt...'
    }
  },



  // Agent System
  agent: {
    title: 'AI Assistant',
    selectAgent: 'Select Assistant',
    noAgentSelected: 'Please select an AI assistant',
    defaultAgent: 'General Assistant',
    agentSpace: 'AI Assistant Space',
    currentAgent: 'Current Assistant',
    categories: {
      all: 'All',
      general: 'General',
      programming: 'Programming',
      design: 'Design',
      data: 'Data',
      writing: 'Writing',
      research: 'Research',
      analysis: 'Analysis'
    },
    agents: {
      generalAssistant: {
        name: 'General AI Assistant',
        description: 'Professional, friendly, and efficient all-purpose AI assistant capable of handling various daily questions and tasks.',
        examples: [
          '"I want to learn a new skill"',
          '"Answer a technical question"'
        ],
        tags: ['Q&A Consulting', 'Named', 'Information Organization']
      },
      seniorEngineer: {
        name: 'Senior Software Engineer',
        description: 'Experienced full-stack development expert, proficient in multiple programming languages and technology stacks.',
        examples: [
          '"Code Development"',
          '"Architecture Design"',
          '"Performance Optimization"'
        ],
        tags: ['Code Development', 'Architecture Design', 'Performance Optimization']
      },
      codeReviewer: {
        name: 'Code Review Expert',
        description: 'Senior code review expert providing professional code quality assessment and improvement recommendations.',
        examples: [
          '"Review Python code"',
          '"Check API interface security"'
        ],
        tags: ['Code Review', 'Quality Assessment', 'Security Check']
      },
      uiuxDesigner: {
        name: 'UI/UX Designer',
        description: 'Professional user interface and user experience designer, proficient in modern design concepts.',
        examples: [
          '"Design a mobile app login interface"',
          '"Improve website user experience flow"'
        ],
        tags: ['Interface Design', 'User Research', 'Prototyping']
      }
    },
    buttons: {
      select: 'Select',
      cancel: 'Cancel',
      confirm: 'Confirm'
    },
    examples: 'Example Conversations',
    recommended: 'Recommended'
  },

  // Theme Options
  theme: {
    light: 'Light',
    dark: 'Dark',
    auto: 'Follow System'
  },

  // Provider names
  providers: {
    openrouter: 'OpenRouter',
    moonshot: 'Moonshot',
    zhipu: 'ZhiPu',
    siliconflow: 'SiliconFlow',
    deepseek: 'DeepSeek',
    '302ai': '302AI',
    lingyi: 'Yi (01.AI)',
    minimax: 'MiniMax',
    spark: 'iFlytek Spark',

    openai: 'OpenAI',
    anthropic: 'Anthropic',
    google: 'Google',
    azure: 'Azure OpenAI'
  },

  // Language Options
  language: {
    'zh-CN': '中文',
    'en-US': 'English'
  },

  // Shortcut Options
  shortcut: {
    enter: 'Enter',
    ctrlEnter: 'Ctrl + Enter'
  },

  // Sidebar
  sidebar: {
    newChat: 'New Chat',
    userName: 'User',
    aiAssistantSpace: 'AI Assistant Space',
    spaces: 'Spaces',
    conversations: 'Conversations',
    settings: 'Settings',
    support: 'Support',
    stats: 'Statistics',
    profile: 'Profile',
    userProfile: 'User Profile',
    programmingSpace: 'Programming Assistant',
    learningSpace: 'Learning Space'
  },

  // Statistics
  stats: {
    title: 'Usage Statistics',
    toggle: 'Toggle Stats',
    table: 'Table',
    totalTokens: 'Total Tokens',
    totalCost: 'Estimated Cost (USD)',
    avgLatency: 'Average Latency',
    model: 'Model',
    provider: 'Provider',
    session: 'Session',
    promptTokens: 'Prompt Tokens',
    completionTokens: 'Completion Tokens',
    responseTime: 'Response Time',
    cost: 'Cost',
    scope: 'Scope',
    scopeAll: 'All Sessions',
    scopeCurrent: 'Current Session',
    dateRange: 'Date Range',
    today: 'Today',
    last7d: 'Last 7 days',
    last30d: 'Last 30 days',
    custom: 'Custom',
    from: 'From',
    to: 'To',
    view: 'View',
    byModel: 'By Model',
    byProvider: 'By Provider',
    byTab: 'By Session',
    trend: 'Trend',
    exportCSV: 'Export CSV',
    exportJSON: 'Export JSON',
    copySummary: 'Copy Summary',
    clear: 'Clear in Range',
    comingSoon: 'Coming soon'
  },

  // Message List
  messages: {
    thinking: 'AI is thinking',
    loadingHistory: 'Loading history...',
    emptyState: 'Start a new conversation',
    quickActions: {
      deepThink: 'Deep Think',
      imageEdit: 'Image Edit'
    },
    attachments: {
      prefix: 'Attachments',
      defaultPrompt: 'Please analyze the contents of these files.'
    }
  },

  // Theme Toggle
  themeToggle: {
    lightMode: 'Light Mode',
    darkMode: 'Dark Mode'
  },

  // Shortcuts Description
  shortcuts: {
    newChat: 'New Chat',
    saveChat: 'Save Chat',
    search: 'Search Messages',
    promptLibrary: 'Prompt Library',
    sendMessage: 'Send Message',
    clearChat: 'Clear Chat',
    help: 'Help',
    closeDialog: 'Close Dialog',
    switchSpace1: 'Switch to AI Assistant Space',
    switchSpace2: 'Switch to Programming Space',
    switchSpace3: 'Switch to Learning Space',
    toggleTheme: 'Toggle Theme',
    openAgentSelector: 'Open Agent Selector',
    toggleStats: 'Toggle Stats Floating',
    toggleSidebar: 'Toggle Sidebar'
  },

  // Error Messages
  errors: {
    networkError: 'Network connection error',
    serverError: 'Server error',
    unknownError: 'Unknown error',
    loadFailed: 'Failed to load',
    saveFailed: 'Failed to save',
    generic: 'Sorry, something went wrong.',
    imageNotSupported: 'The current model does not support image input. Please switch to a multimodal model or remove images and try again.'
  },

  // Confirm
  confirm: {
    clearCurrentChat: 'Are you sure you want to clear the current chat?'
  },

  // Notifications
  notifications: {
    newChatCreated: 'New chat created',
    chatSaved: 'Chat saved',
    clearedChat: 'Chat cleared',
    sidebarToggleInfo: 'Sidebar toggle is not implemented yet',
    budgetWarn: 'You are approaching the monthly token budget'
  }
};