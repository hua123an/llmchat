/**
 * A/B 对比（Streaming 实现）：并行对多个 provider/model 发起请求，基于 electronAPI 的 onMessage 收集结果
 */
export type ABCase = { provider: string; model: string };

type Handler = { buffer: string; resolve: (s: string) => void; timer?: any };
const messageHandlers: Map<string, Handler> = new Map();
let initialized = false;

function ensureInit() {
  if (initialized) return;
  initialized = true;
  (window as any).electronAPI?.onMessage?.((_evt: any, data: any) => {
    try {
      const id = data?.messageId;
      if (!id) return;
      const h = messageHandlers.get(id);
      if (!h) return; // 非本次 A/B 的消息
      const delta = data?.delta || '';
      if (delta === '[DONE]') {
        clearTimeout(h.timer);
        h.resolve(h.buffer);
        messageHandlers.delete(id);
        return;
      }
      h.buffer += delta;
    } catch {}
  });
}

function genId(prefix: string) { return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`; }

export async function runABTest(prompt: string, cases: ABCase[], systemPrompt?: string): Promise<Array<{ provider: string; model: string; content: string }>> {
  ensureInit();
  const tasks = cases.map(c => new Promise<{ provider: string; model: string; content: string }>(async (resolve) => {
    const userId = genId('ab-user');
    const assistantId = genId('ab-assistant');
    // 注册 handler
    const h: Handler = { buffer: '', resolve } as any;
    h.timer = setTimeout(() => { resolve({ provider: c.provider, model: c.model, content: h.buffer || '[TIMEOUT]' }); messageHandlers.delete(assistantId); }, 60_000);
    messageHandlers.set(assistantId, h);
    // 构造消息
    const msgs: Array<{ role: 'system'|'user'; content: string }> = [];
    if (systemPrompt) msgs.push({ role: 'system', content: systemPrompt });
    msgs.push({ role: 'user', content: prompt });
    // 发起请求
    try {
      await (window as any).electronAPI?.sendMessage?.(c.provider, c.model, msgs, userId, assistantId, undefined, false, { search_context_size: 'medium' });
    } catch {
      clearTimeout(h.timer); messageHandlers.delete(assistantId);
      resolve({ provider: c.provider, model: c.model, content: '[ERROR]' });
    }
  }).then(res => ({ provider: res.provider, model: res.model, content: res.content })));

  const raw = await Promise.all(tasks);
  return raw;
}


