import { getCurrentLanguage } from '../locales';
import type { Agent } from '../store/chat';

// Agent国际化数据
const agentTranslations = {
  'zh-CN': {
    'general-assistant': {
      name: '通用AI助手',
      description: '专业、友好、高效的全能AI助手，能够处理各种日常问题和任务。',
      capabilities: ['问答咨询', '任务规划', '信息整理', '学习辅导', '生活建议'],
      examples: [
        '帮我制定一个学习计划',
        '解释一下区块链的基本概念',
        '推荐几本好看的科幻小说'
      ]
    },
    'senior-developer': {
      name: '高级软件工程师',
      description: '经验丰富的全栈开发专家，精通多种编程语言和技术栈。',
      capabilities: ['代码开发', '架构设计', '性能优化', '技术选型', '代码重构'],
      examples: [
        '帮我设计一个用户认证系统',
        '优化这个SQL查询的性能',
        '实现一个RESTful API'
      ]
    },
    'code-reviewer': {
      name: '代码审查专家',
      description: '资深代码审查专家，提供专业的代码质量评估和改进建议。',
      capabilities: ['代码审查', '质量评估', '安全检查', '性能分析', '最佳实践'],
      examples: [
        '审查这段Python代码',
        '检查API接口的安全性',
        '评估代码的性能瓶颈'
      ]
    },
    'ui-ux-designer': {
      name: 'UI/UX设计师',
      description: '专业的用户界面和用户体验设计师，精通现代设计理念。',
      capabilities: ['界面设计', '用户研究', '原型制作', '交互设计', '视觉设计'],
      examples: [
        '设计一个移动App的登录界面',
        '改进网站的用户体验流程',
        '制作一个产品原型'
      ]
    },
    // 兼容旧ID
    'ui-ux-expert': {
      name: 'UI/UX设计师',
      description: '专业的用户界面和用户体验设计师，精通现代设计理念。',
      capabilities: ['界面设计', '用户研究', '原型制作', '交互设计', '视觉设计'],
      examples: [
        '设计一个移动App的登录界面',
        '改进网站的用户体验流程',
        '制作一个产品原型'
      ]
    },
    'data-analyst': {
      name: '数据分析师',
      description: '专业的数据分析专家，擅长数据挖掘和商业智能分析。',
      capabilities: ['数据分析', '统计建模', '数据可视化', '商业洞察', '预测分析'],
      examples: [
        '分析销售数据的趋势',
        '建立用户流失预测模型',
        '制作数据分析报告'
      ]
    },
    'content-writer': {
      name: '内容创作专家',
      description: '专业的内容创作者，擅长各种文体写作和营销文案。',
      capabilities: ['文案写作', '内容策划', 'SEO优化', '品牌文案', '技术写作'],
      examples: [
        '写一篇产品发布的新闻稿',
        '创作社交媒体营销文案',
        '撰写用户使用手册'
      ]
    }
  },
  'en-US': {
    'general-assistant': {
      name: 'General AI Assistant',
      description: 'Professional, friendly, and efficient all-purpose AI assistant capable of handling various daily questions and tasks.',
      capabilities: ['Q&A Consulting', 'Task Planning', 'Information Organization', 'Learning Support', 'Life Advice'],
      examples: [
        'Help me create a study plan',
        'Explain the basic concepts of blockchain',
        'Recommend some good science fiction novels'
      ]
    },
    'senior-developer': {
      name: 'Senior Software Engineer',
      description: 'Experienced full-stack development expert, proficient in multiple programming languages and technology stacks.',
      capabilities: ['Code Development', 'Architecture Design', 'Performance Optimization', 'Technology Selection', 'Code Refactoring'],
      examples: [
        'Help me design a user authentication system',
        'Optimize the performance of this SQL query',
        'Implement a RESTful API'
      ]
    },
    'code-reviewer': {
      name: 'Code Review Expert',
      description: 'Senior code review expert providing professional code quality assessment and improvement recommendations.',
      capabilities: ['Code Review', 'Quality Assessment', 'Security Check', 'Performance Analysis', 'Best Practices'],
      examples: [
        'Review this Python code',
        'Check the security of API interfaces',
        'Evaluate code performance bottlenecks'
      ]
    },
    'ui-ux-designer': {
      name: 'UI/UX Designer',
      description: 'Professional user interface and user experience designer, proficient in modern design concepts.',
      capabilities: ['Interface Design', 'User Research', 'Prototyping', 'Interaction Design', 'Visual Design'],
      examples: [
        'Design a mobile app login interface',
        'Improve website user experience flow',
        'Create a product prototype'
      ]
    },
    // Legacy ID compatibility
    'ui-ux-expert': {
      name: 'UI/UX Designer',
      description: 'Professional user interface and user experience designer, proficient in modern design concepts.',
      capabilities: ['Interface Design', 'User Research', 'Prototyping', 'Interaction Design', 'Visual Design'],
      examples: [
        'Design a mobile app login interface',
        'Improve website user experience flow',
        'Create a product prototype'
      ]
    },
    'data-analyst': {
      name: 'Data Analyst',
      description: 'Professional data analysis expert skilled in data mining and business intelligence analytics.',
      capabilities: ['Data Analysis', 'Statistical Modeling', 'Data Visualization', 'Business Insights', 'Predictive Analytics'],
      examples: [
        'Analyze sales data trends',
        'Build a user churn prediction model',
        'Create a data analysis report'
      ]
    },
    'content-writer': {
      name: 'Content Writer',
      description: 'Professional content creator skilled in various writing styles and marketing copywriting.',
      capabilities: ['Copywriting', 'Content Planning', 'SEO Optimization', 'Brand Copy', 'Technical Writing'],
      examples: [
        'Write a press release for a product launch',
        'Create social media marketing copy',
        'Draft a user guide'
      ]
    }
  }
};

// 获取本地化的Agent数据
export function getLocalizedAgent(agent: Agent): Agent {
  const currentLang = getCurrentLanguage();
  const translations = agentTranslations[currentLang as keyof typeof agentTranslations];
  
  if (!translations || !(agent.id in translations)) {
    return agent;
  }
  
  const translation = (translations as any)[agent.id];
  
  return {
    ...agent,
    name: translation.name || agent.name,
    description: translation.description || agent.description,
    capabilities: translation.capabilities || agent.capabilities,
    examples: translation.examples || agent.examples
  };
}

// 获取本地化的Agent列表
export function getLocalizedAgents(agents: Agent[]): Agent[] {
  return agents.map(agent => getLocalizedAgent(agent));
}

// 获取分类名称
export function getCategoryName(categoryId: string): string {
  const currentLang = getCurrentLanguage();
  
  const categoryNames = {
    'zh-CN': {
      'all': '全部',
      'general': '通用',
      'programming': '编程',
      'design': '设计',
      'data': '数据',
      'writing': '写作',
      'research': '研究',
      'analysis': '分析'
    },
    'en-US': {
      'all': 'All',
      'general': 'General',
      'programming': 'Programming',
      'design': 'Design',
      'data': 'Data',
      'writing': 'Writing',
      'research': 'Research',
      'analysis': 'Analysis'
    }
  };
  
  const names = categoryNames[currentLang as keyof typeof categoryNames];
  return names?.[categoryId as keyof typeof names] || categoryId;
}