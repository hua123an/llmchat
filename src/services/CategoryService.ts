import { ChatTab } from '../store/chat';

export interface CategoryAnalysis {
  category: 'work' | 'study' | 'creative' | 'technical' | 'daily' | 'other';
  confidence: number;
  tags: string[];
  reason: string;
}

/**
 * 智能会话分类服务
 * 基于消息内容分析会话类型和标签
 */
export class CategoryService {
  // 关键词映射表
  private static readonly KEYWORD_PATTERNS = {
    work: [
      '项目', '工作', '会议', '汇报', '计划', '任务', '客户', '业务', '管理', '团队',
      'project', 'meeting', 'report', 'business', 'client', 'management', 'task'
    ],
    study: [
      '学习', '课程', '教育', '考试', '论文', '研究', '学校', '老师', '作业', '知识',
      'study', 'course', 'education', 'exam', 'paper', 'research', 'university', 'homework'
    ],
    creative: [
      '创作', '设计', '写作', '艺术', '创意', '灵感', '故事', '小说', '诗歌', '音乐',
      'creative', 'design', 'writing', 'art', 'inspiration', 'story', 'novel', 'music'
    ],
    technical: [
      '编程', '代码', '技术', '开发', '算法', '数据库', '服务器', 'bug', '架构', '框架',
      'programming', 'code', 'development', 'algorithm', 'database', 'server', 'framework', 'api'
    ],
    daily: [
      '生活', '日常', '健康', '美食', '旅行', '购物', '娱乐', '电影', '游戏', '聊天',
      'life', 'daily', 'health', 'food', 'travel', 'shopping', 'entertainment', 'movie', 'game'
    ]
  };

  /**
   * 分析会话内容并自动分类
   */
  static async analyzeConversation(tab: ChatTab): Promise<CategoryAnalysis> {
    // 如果没有消息，返回默认分类
    if (!tab.messages || tab.messages.length === 0) {
      return {
        category: 'other',
        confidence: 0.1,
        tags: [],
        reason: '暂无对话内容'
      };
    }

    // 提取前5条消息的文本内容进行分析
    const messagesToAnalyze = tab.messages
      .slice(0, 5)
      .map(m => m.content)
      .join(' ')
      .toLowerCase();

    // 计算各分类的得分
    const scores = this.calculateCategoryScores(messagesToAnalyze);
    
    // 找出最高分的分类
    const maxScore = Math.max(...Object.values(scores));
    const bestCategory = Object.entries(scores).find(([_, score]) => score === maxScore)?.[0] as any || 'other';
    
    // 提取标签
    const extractedTags = this.extractTags(messagesToAnalyze, bestCategory);
    
    // 计算置信度
    const confidence = maxScore / 10; // 简单的置信度计算
    
    return {
      category: bestCategory,
      confidence: Math.min(confidence, 1),
      tags: extractedTags,
      reason: this.generateReason(bestCategory, maxScore)
    };
  }

  /**
   * 计算各分类的得分
   */
  private static calculateCategoryScores(text: string): Record<string, number> {
    const scores: Record<string, number> = {
      work: 0,
      study: 0,
      creative: 0,
      technical: 0,
      daily: 0
    };

    // 遍历每个分类的关键词
    Object.entries(this.KEYWORD_PATTERNS).forEach(([category, keywords]) => {
      keywords.forEach(keyword => {
        const matches = (text.match(new RegExp(keyword, 'gi')) || []).length;
        scores[category] += matches;
      });
    });

    return scores;
  }

  /**
   * 根据分类提取相关标签
   */
  private static extractTags(text: string, category: string): string[] {
    const categoryKeywords = this.KEYWORD_PATTERNS[category as keyof typeof this.KEYWORD_PATTERNS] || [];
    const foundTags: string[] = [];

    categoryKeywords.forEach(keyword => {
      if (text.includes(keyword.toLowerCase()) && !foundTags.includes(keyword)) {
        foundTags.push(keyword);
      }
    });

    return foundTags.slice(0, 3); // 最多返回3个标签
  }

  /**
   * 生成分类原因说明
   */
  private static generateReason(category: string, _score: number): string {
    const reasons = {
      work: '检测到工作相关关键词',
      study: '检测到学习相关内容',
      creative: '检测到创作类话题',
      technical: '检测到技术讨论',
      daily: '检测到日常生活话题',
      other: '未能明确分类'
    };

    return reasons[category as keyof typeof reasons] || '自动分类';
  }

  /**
   * 获取分类的中文显示名称
   */
  static getCategoryDisplayName(category: string): string {
    const displayNames = {
      work: '💼 工作',
      study: '📚 学习',
      creative: '🎨 创作',
      technical: '💻 技术',
      daily: '🏠 日常',
      other: '📝 其他'
    };

    return displayNames[category as keyof typeof displayNames] || '📝 其他';
  }

  /**
   * 获取分类颜色
   */
  static getCategoryColor(category: string): string {
    const colors = {
      work: '#409EFF',
      study: '#67C23A',
      creative: '#E6A23C',
      technical: '#F56C6C',
      daily: '#909399',
      other: '#C0C4CC'
    };

    return colors[category as keyof typeof colors] || '#C0C4CC';
  }
}
