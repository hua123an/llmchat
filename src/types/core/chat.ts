import { MessageId, TabId, AttachmentId, ProviderId } from './index';

// 消息内容类型
export interface MessageContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string };
}

// 消息使用统计
export interface MessageUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

// 搜索注释
export interface SearchAnnotation {
  type: 'url_citation';
  url_citation: {
    url: string;
    title: string;
    content?: string;
    start_index: number;
    end_index: number;
  };
}

// 引用链接
export interface Citation {
  index: number;
  title: string;
  url: string;
}

// 附件类型
export interface Attachment {
  id: AttachmentId;
  name: string;
  mime: string;
  size: number;
  dataUrl?: string;
  textSnippet?: string;
  fullText?: string;
}

// 消息实体
export interface Message {
  id: MessageId;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  richContent?: MessageContent[];
  attachmentsSnapshot?: Attachment[];
  usage?: MessageUsage;
  searchAnnotations?: SearchAnnotation[];
  citations?: Citation[];
  responseTime?: number;
  model?: string;
  provider?: string;
  webSearchEnabled?: boolean;
}

// 聊天标签
export interface ChatTab {
  id: TabId;
  name: string;
  title: string;
  messages: Message[];
  provider: string;
  model: string;
  models: Array<{ id: string; name?: string }>;
  systemPrompt: string;
  attachments?: Attachment[];
}

// 提供商
export interface Provider {
  id: ProviderId;
  name: string;
  baseUrl: string;
  models?: string[];
}

// 搜索结果
export interface SearchResult {
  messageId: MessageId;
  tabTitle: string;
  highlightedContent: string;
}
