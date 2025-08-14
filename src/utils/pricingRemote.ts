import type { PricingInfo } from './pricing';

// 占位的远程定价获取；可扩展为多源聚合
export async function fetchRemotePricing(): Promise<Record<string, PricingInfo>> {
  try {
    // 示例：从自有镜像/静态文件获取
    // const resp = await fetch('https://your-domain.example/pricing.json', { cache: 'no-cache' });
    // if (!resp.ok) return {};
    // const data = await resp.json();
    // 期望结构：{ modelId: { inputPer1K, outputPer1K }, ... }
    return {};
  } catch {
    return {};
  }
}

