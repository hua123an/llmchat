export type PricingInfo = {
  inputPer1K: number; // 每 1K 输入 token 价格（美元）
  outputPer1K: number; // 每 1K 输出 token 价格（美元）
};

// 简要价格表：可按需扩展或从服务端加载。
// 数据来源（2025-06 ~ 2025-08 实测公开资料，按 USD/1K tokens）：
// - OpenAI GPT-4o: $0.005 in / $0.015 out [pinzhanghao.com, artificialanalysis.ai]
// - OpenAI GPT-4.1: $0.002 in / $0.008 out [docsbot.ai]
// - OpenAI GPT-4o mini: $0.00015 in / $0.0006 out [economize.cloud]
// - Anthropic Claude 3.5/3.7/4 Sonnet: $0.003 in / $0.015 out [typingmind calculators, api.chat]
// - Anthropic Claude 3.5 Haiku: $0.001 in / $0.005 out [typingmind calculators]
// - DeepSeek V3(deepseek-chat): $0.00027 in(miss) / $0.0011 out [deepseek api docs]
// - DeepSeek R1(deepseek-reasoner): $0.00055 in(miss) / $0.00219 out [deepseek api docs]
const MODEL_PRICING: Record<string, PricingInfo> = {
  // OpenAI
  'gpt-4o': { inputPer1K: 0.005, outputPer1K: 0.015 },
  'gpt-4o-mini': { inputPer1K: 0.00015, outputPer1K: 0.0006 },
  'gpt-4.1': { inputPer1K: 0.002, outputPer1K: 0.008 },
  // 历史型号（保守取值）
  'gpt-3.5-turbo': { inputPer1K: 0.001, outputPer1K: 0.002 },

  // Anthropic
  'claude-3.5-sonnet': { inputPer1K: 0.003, outputPer1K: 0.015 },
  'claude-3.7-sonnet': { inputPer1K: 0.003, outputPer1K: 0.015 },
  'claude-4-sonnet': { inputPer1K: 0.003, outputPer1K: 0.015 },
  'claude-3.5-haiku': { inputPer1K: 0.001, outputPer1K: 0.005 },

  // 阿里通义（示例，取低价位常见区间）
  'qwen-2.5': { inputPer1K: 0.0002, outputPer1K: 0.0008 },

  // DeepSeek 官方 API（按 cache miss 标准价）
  'deepseek-chat': { inputPer1K: 0.00027, outputPer1K: 0.0011 },
  'deepseek-reasoner': { inputPer1K: 0.00055, outputPer1K: 0.00219 },
};

export function getPricingForModel(modelId?: string): PricingInfo | null {
  if (!modelId) return null;
  const key = modelId.toLowerCase();
  return MERGED_PRICING[key] || null;
}

export function estimateCostUSD(params: {
  modelId?: string;
  promptTokens?: number;
  completionTokens?: number;
}): number | null {
  const pricing = getPricingForModel(params.modelId);
  if (!pricing) return null;

  const promptTokens = params.promptTokens ?? 0;
  const completionTokens = params.completionTokens ?? 0;

  const inputCost = (promptTokens / 1000) * pricing.inputPer1K;
  const outputCost = (completionTokens / 1000) * pricing.outputPer1K;
  const total = inputCost + outputCost;

  // 保留到 6 位小数，避免浮点误差放大
  return Math.round(total * 1_000_000) / 1_000_000;
}

// ===== 合并定价：支持在运行时覆盖静态价目表 =====
let MERGED_PRICING: Record<string, PricingInfo> = { ...MODEL_PRICING };

export function mergePricing(overrides: Record<string, PricingInfo> | null | undefined): void {
  if (!overrides) return;
  const normalized: Record<string, PricingInfo> = {};
  for (const key of Object.keys(overrides)) {
    if (!key) continue;
    const k = key.toLowerCase();
    const info = overrides[key];
    if (!info) continue;
    const input = Number(info.inputPer1K);
    const output = Number(info.outputPer1K);
    if (isFinite(input) && isFinite(output) && input >= 0 && output >= 0) {
      normalized[k] = { inputPer1K: input, outputPer1K: output };
    }
  }
  MERGED_PRICING = { ...MODEL_PRICING, ...MERGED_PRICING, ...normalized };
}

