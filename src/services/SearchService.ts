import { ISearchService } from '../types/services';
import { WebSearchOptions, WebSearchHit } from '../types/api';
import { injectable, SERVICE_TOKENS } from './container';

@injectable(SERVICE_TOKENS.SEARCH_SERVICE)
export class SearchService implements ISearchService {
  async webSearch(query: string, options?: WebSearchOptions): Promise<WebSearchHit[]> {
    try {
      const searchOptions = {
        providers: options?.providers || ['google', 'bing', 'baidu', 'duckduckgo'],
        limit: options?.limit || 20,
        whitelist: options?.whitelist || [],
        blacklist: options?.blacklist || []
      };
      
      const results = await (window as any).electronAPI.webSearch(query, searchOptions);
      
      return Array.isArray(results) ? results : [];
    } catch (error) {
      console.error('❌ 搜索失败:', error);
      return [];
    }
  }

  async fetchReadable(url: string): Promise<string> {
    try {
      const content = await (window as any).electronAPI.fetchReadable(url);
      return typeof content === 'string' ? content : '';
    } catch (error) {
      console.error('❌ 获取网页内容失败:', error);
      return '';
    }
  }

  async searchAndFetch(
    query: string, 
    topN = 8, 
    options?: WebSearchOptions
  ): Promise<Array<{ url: string; title: string; content: string; isDirect?: boolean }>> {
    try {
      console.log(`🚀 开始智能搜索并获取内容: "${query}", 目标 ${topN} 个结果`);
      
      // 第一步：搜索
      const hits = await this.webSearch(query, {
        ...options,
        limit: Math.min(topN * 2, 20) // 多搜索一些以备选择
      });
      
      if (hits.length === 0) {
        console.warn('⚠️ 搜索没有返回任何结果');
        return [];
      }
      
      console.log(`📊 搜索阶段完成: ${hits.length} 个结果`);
      
      // 检查是否有直接答案
      const directAnswerHit = hits.find((hit: any) => hit.isDirect);
      if (directAnswerHit) {
        console.log(`🎯 发现直接答案: "${directAnswerHit.snippet}"`);
        return [{
          url: directAnswerHit.url,
          title: directAnswerHit.title,
          content: directAnswerHit.snippet,
          isDirect: true
        }];
      }
      
      // 第二步：获取网页内容（常规搜索结果）
      const selected = hits.slice(0, topN);
      const results: Array<{ url: string; title: string; content: string }> = [];
      
      for (const hit of selected) {
        try {
          const content = await this.fetchReadable(hit.url);
          if (content && content.trim().length > 50) {
            results.push({
              url: hit.url,
              title: hit.title,
              content: content
            });
          }
        } catch (error) {
          console.warn(`⚠️ 获取内容失败 ${hit.url}:`, error);
        }
      }
      
      console.log(`🎉 搜索并获取内容完成: ${results.length} 个有效结果`);
      return results;
      
    } catch (error) {
      console.error('❌ 搜索并获取内容失败:', error);
      return [];
    }
  }

  // 高级搜索功能
  async searchWithFilters(
    query: string,
    filters: {
      dateRange?: { start: Date; end: Date };
      fileType?: string;
      site?: string;
      excludeTerms?: string[];
    },
    options?: WebSearchOptions
  ): Promise<WebSearchHit[]> {
    let enhancedQuery = query;

    // 添加时间过滤
    if (filters.dateRange) {
      const startDate = filters.dateRange.start.toISOString().split('T')[0];
      const endDate = filters.dateRange.end.toISOString().split('T')[0];
      enhancedQuery += ` after:${startDate} before:${endDate}`;
    }

    // 添加文件类型过滤
    if (filters.fileType) {
      enhancedQuery += ` filetype:${filters.fileType}`;
    }

    // 添加站点过滤
    if (filters.site) {
      enhancedQuery += ` site:${filters.site}`;
    }

    // 排除词汇
    if (filters.excludeTerms?.length) {
      enhancedQuery += ` ${filters.excludeTerms.map(term => `-${term}`).join(' ')}`;
    }

    return this.webSearch(enhancedQuery, options);
  }
}
