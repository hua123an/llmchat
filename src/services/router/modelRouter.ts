// 删除未使用的导入
import { useQuery, useMutation } from '@tanstack/vue-query';

/**
 * A thin wrapper to call OpenAI-compatible endpoints (OpenAI SDK v4)
 * - Uses provider.baseUrl and apiKey from electron main via exposed IPC
 */
export async function listModelsViaOpenAI(providerName: string): Promise<Array<{ id: string; name?: string }>> {
  // We can't import electronAPI here directly, so expose a tiny runtime bridge
  const providers = await (window as any).electronAPI.getProviders();
  const provider = (providers || []).find((p: any) => p.name === providerName);
  if (!provider) return [];
  const apiKey = await (window as any).electronAPI.hasProviderKey(providerName);
  if (!apiKey?.hasKey) return [];

  // 删除未使用的客户端创建代码
  // 直接使用 IPC 调用获取模型
  // Since sdk v4 requires apiKey, but we don't want to expose real key to renderer,
  // we instead rely on our existing send-message/get-models paths for auth. For listing, fall back to IPC.
  const models = await (window as any).electronAPI.getModels(providerName);
  return Array.isArray(models) ? models : [];
}

// Vue Query wrapper hooks
export function useModels(providerName: string) {
  return useQuery({
    queryKey: ['models', providerName],
    queryFn: () => (window as any).electronAPI.getModels(providerName),
    staleTime: 1000 * 60,
    refetchOnWindowFocus: false,
  });
}

export function useChatMutation() {
  return useMutation({
    mutationKey: ['chat-send'],
    mutationFn: async (params: { 
      provider: string; 
      model: string; 
      messages: any[]; 
      userMessageId: string; 
      assistantMessageId: string; 
      attachments?: any[];
      webSearchEnabled?: boolean;
      webSearchOptions?: { search_context_size?: 'low' | 'medium' | 'high' };
    }) => {
      const { provider, model, messages, userMessageId, assistantMessageId, attachments, webSearchEnabled, webSearchOptions } = params;
      await (window as any).electronAPI.sendMessage(
        provider, 
        model, 
        messages, 
        userMessageId, 
        assistantMessageId, 
        attachments,
        webSearchEnabled,
        webSearchOptions || { search_context_size: 'medium' }
      );
      return { userMessageId, assistantMessageId };
    },
    retry: (failureCount, error: any) => {
      // 自定义重试逻辑：网络错误或超时可重试，认证错误等不重试
      if (failureCount >= 3) return false;
      const message = String(error?.message || '').toLowerCase();
      if (message.includes('network') || message.includes('timeout') || message.includes('fetch')) {
        return true;
      }
      if (message.includes('auth') || message.includes('api key') || message.includes('unauthorized')) {
        return false;
      }
      return true;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}


/**
 * 简易模型自动路由（MVP）：
 * - 从统计账本中计算各 provider 的平均时延与历史请求数
 * - 从可用 providers 列表中选取（优先：低时延，其次：有历史成功记录），返回 {provider, model}
 */
export type ProviderInfo = { name: string; models?: Array<{ id: string; name?: string }> };

export function pickRoute(providers: ProviderInfo[], stats: Array<{ provider?: string; model?: string; responseTimeMs?: number }>): { provider?: string; model?: string } {
  if (!providers || providers.length === 0) return {};
  const agg: Record<string, { count: number; avg: number }> = {};
  for (const s of stats || []) {
    const key = (s.provider || '').toLowerCase();
    if (!key) continue;
    if (!agg[key]) agg[key] = { count: 0, avg: 0 };
    const a = agg[key];
    const rt = s.responseTimeMs ?? 0;
    a.avg = (a.avg * a.count + (rt > 0 ? rt : 10000)) / (a.count + 1);
    a.count += 1;
  }

  const scored = providers.map(p => {
    const key = p.name.toLowerCase();
    const a = agg[key] || { count: 0, avg: 999999 };
    return { p, score: a.avg + (a.count > 0 ? 0 : 5000) };
  });

  scored.sort((a, b) => a.score - b.score);
  const best = scored[0]?.p;
  if (!best) return {};
  const model = best.models && best.models[0] ? best.models[0].id : '';
  return { provider: best.name, model };
}


