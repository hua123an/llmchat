/**
 * 胜算云搜索服务
 * 支持联网搜索和思考模式
 */

export interface ShengsuanyunSearchOptions {
  search_context_size?: 'low' | 'medium' | 'high';
  max_results?: number;
  timeout_sec?: number;
  model?: string;
}

export interface ShengsuanyunSearchResult {
  title: string;
  url: string;
  snippet: string;
  source?: string;
  timestamp?: string;
}

/**
 * 胜算云联网搜索
 */
export async function shengsuanyunWebSearch(
  query: string, 
  options: ShengsuanyunSearchOptions = {}
): Promise<ShengsuanyunSearchResult[]> {
  try {
    console.log('🔍 胜算云联网搜索:', query);
    
    // 通过Electron主进程调用胜算云搜索API
    if (typeof window !== 'undefined') {
      const { shengsuanyunWebSearch: doSearch } = await import('../../modules/system/ipc');
      const results = await doSearch(query, options);
      
      if (Array.isArray(results)) {
        console.log(`✅ 胜算云搜索完成，获得 ${results.length} 个结果`);
        return results;
      } else {
        console.warn('⚠️ 胜算云搜索返回格式异常:', results);
        return [];
      }
    } else {
      throw new Error('胜算云搜索需要在Electron环境中运行');
    }
  } catch (error) {
    console.error('❌ 胜算云搜索失败:', error);
    return [];
  }
}

/**
 * 胜算云思考模式搜索（结合联网搜索和思考链）
 */
export async function shengsuanyunThinkingSearch(
  query: string,
  options: ShengsuanyunSearchOptions = {}
): Promise<{
  searchResults: ShengsuanyunSearchResult[];
  thinkingProcess: string;
  finalAnswer: string;
}> {
  try {
    console.log('🧠 胜算云思考模式搜索:', query);
    
    // 第一步：执行联网搜索
    const searchResults = await shengsuanyunWebSearch(query, options);
    
    // 第二步：通过思考模式生成回答
    if (typeof window !== 'undefined') {
      const { shengsuanyunThinkingSearch: thinkingSearch } = await import('../../modules/system/ipc');
      const thinkingResult = await thinkingSearch(query, searchResults, options);
      
      return {
        searchResults,
        thinkingProcess: thinkingResult.thinkingProcess || '',
        finalAnswer: thinkingResult.finalAnswer || ''
      };
    } else {
      throw new Error('胜算云思考模式搜索需要在Electron环境中运行');
    }
  } catch (error) {
    console.error('❌ 胜算云思考模式搜索失败:', error);
    return {
      searchResults: [],
      thinkingProcess: '',
      finalAnswer: '搜索失败，请稍后重试'
    };
  }
}

/**
 * 胜算云搜索建议（智能推荐搜索关键词）
 */
export async function shengsuanyunSearchSuggestions(
  partialQuery: string,
  maxSuggestions: number = 5
): Promise<string[]> {
  try {
    if (typeof window !== 'undefined') {
      const { shengsuanyunSearchSuggestions: getSuggestions } = await import('../../modules/system/ipc');
      const suggestions = await getSuggestions(partialQuery, maxSuggestions);
      
      return Array.isArray(suggestions) ? suggestions : [];
    } else {
      return [];
    }
  } catch (error) {
    console.error('❌ 获取胜算云搜索建议失败:', error);
    return [];
  }
}

/**
 * 胜算云搜索历史记录
 */
export interface ShengsuanyunSearchHistory {
  query: string;
  timestamp: number;
  resultCount: number;
  model: string;
}

export function getShengsuanyunSearchHistory(): ShengsuanyunSearchHistory[] {
  try {
    const history = localStorage.getItem('shengsuanyunSearchHistory');
    return history ? JSON.parse(history) : [];
  } catch {
    return [];
  }
}

export function saveShengsuanyunSearchHistory(
  query: string,
  resultCount: number,
  model: string
): void {
  try {
    const history = getShengsuanyunSearchHistory();
    const newEntry: ShengsuanyunSearchHistory = {
      query,
      timestamp: Date.now(),
      resultCount,
      model
    };
    
    // 保持最近100条记录
    history.unshift(newEntry);
    if (history.length > 100) {
      history.splice(100);
    }
    
    localStorage.setItem('shengsuanyunSearchHistory', JSON.stringify(history));
  } catch (error) {
    console.error('保存胜算云搜索历史失败:', error);
  }
}

/**
 * 清除胜算云搜索历史
 */
export function clearShengsuanyunSearchHistory(): void {
  try {
    localStorage.removeItem('shengsuanyunSearchHistory');
  } catch (error) {
    console.error('清除胜算云搜索历史失败:', error);
  }
}
