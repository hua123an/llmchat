import type { StatsEntry } from '../store/chat';

export function toCSV(entries: StatsEntry[]): string {
  const header = ['id','tabName','provider','model','timestamp','promptTokens','completionTokens','totalTokens','responseTimeMs','costUSD'];
  const lines = entries.map(e => [
    e.id,
    e.tabName,
    e.provider ?? '',
    e.model ?? '',
    e.timestamp,
    e.promptTokens,
    e.completionTokens,
    e.totalTokens,
    e.responseTimeMs ?? '',
    e.costUSD ?? ''
  ].join(','));
  return [header.join(','), ...lines].join('\n');
}

export function toJSON(entries: StatsEntry[]): string {
  return JSON.stringify(entries, null, 2);
}

export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // 降级方案
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}

