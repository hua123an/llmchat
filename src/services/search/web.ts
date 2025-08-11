export type WebHit = { title: string; url: string; snippet: string };

/**
 * 多引擎并行搜索（使用API服务）
 * 支持Google/Bing/Baidu API + DuckDuckGo备用
 */
export async function webSearch(query: string, options?: {
  providers?: Array<'google'|'bing'|'baidu'|'duckduckgo'>;
  limit?: number;
  whitelist?: string[];
  blacklist?: string[];
}): Promise<WebHit[]> {
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
    console.error('❌ 前端搜索失败:', error);
    return [];
  }
}

/**
 * 获取网页可读内容
 */
export async function fetchReadable(url: string): Promise<string> {
  try {
    console.log(`📄 前端请求网页内容: ${url}`);
    const startTime = Date.now();
    
    const content = await (window as any).electronAPI.fetchReadable(url);
    const elapsed = Date.now() - startTime;
    
    console.log(`✅ 网页内容获取完成: ${content.length} 字符, 耗时 ${elapsed}ms`);
    
    return content || '';
  } catch (error) {
    console.error(`❌ 获取网页内容失败 ${url}:`, error);
    return '';
  }
}

/**
 * 搜索并获取网页内容的组合方法（支持直接答案）
 */
export async function searchAndFetch(
  query: string, 
  topN = 8, 
  options?: Parameters<typeof webSearch>[1]
): Promise<Array<{ url: string; title: string; content: string; isDirect?: boolean }>> {
  try {
    console.log(`🚀 开始智能搜索并获取内容: "${query}", 目标 ${topN} 个结果`);
    
    // 第一步：搜索
    const hits = await webSearch(query, {
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
        const content = await fetchReadable(hit.url);
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


