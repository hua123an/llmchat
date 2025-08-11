import type { Attachment } from '../store/chat';

export async function fileToAttachment(file: File): Promise<Attachment | null> {
  const mime = file.type || 'application/octet-stream';
  if (mime.startsWith('image/')) {
    if (file.size > 2 * 1024 * 1024) {
      (window as any).ElMessage?.warning?.('Image too large (>2MB), skipped');
      return null;
    }
    const dataUrl = await readAsDataURL(file);
    return {
      id: `att-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: file.name,
      mime,
      size: file.size,
      dataUrl,
    };
  }
  if (mime.startsWith('text/') || file.name.toLowerCase().match(/\.(md|markdown|mdx|mdc|txt|csv|json|ya?ml|xml|ini|cfg|log|py|js|jsx|ts|tsx|java|go|rs|rb|php|c|cc|cpp|h|hh|hpp|cs|kt|kts|swift|scala|sh|bash|zsh|bat|ps1|sql|toml|gradle|m|mm|r|pl|lua|dart)$/)) {
    const text = await readAsText(file);
    return {
      id: `att-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: file.name,
      mime: mime || 'text/plain',
      size: file.size,
      textSnippet: String(text).slice(0, 64 * 1024),
      fullText: text,
    };
  }
  if (mime === 'application/pdf') {
    try {
      const buf = await readAsArrayBuffer(file);
      const { extractPdfText } = await import('./extractors/pdf');
      const text = await extractPdfText(buf, 10);
      return {
        id: `att-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: file.name,
        mime,
        size: file.size,
        textSnippet: text.slice(0, 64 * 1024),
        fullText: text,
      };
    } catch {
      (window as any).ElMessage?.warning?.('Failed to parse PDF');
      return null;
    }
  }
  if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.toLowerCase().endsWith('.docx')) {
    try {
      const buf = await readAsArrayBuffer(file);
      const { extractDocxText } = await import('./extractors/docx');
      const text = await extractDocxText(buf);
      return {
        id: `att-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: file.name,
        mime,
        size: file.size,
        textSnippet: text.slice(0, 64 * 1024),
        fullText: text,
      };
    } catch {
      (window as any).ElMessage?.warning?.('Failed to parse DOCX');
      return null;
    }
  }
  (window as any).ElMessage?.info?.('This file type is not directly supported yet; skipped');
  return null;
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function readAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}


// ===== 通用附件 -> 多模态内容构造 =====
export type UnifiedAttachmentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

// 将单个附件转换为可被大模型直接消费的多模态 parts
// - 图片：优先输出 image_url；同时附加一行简要说明，便于非多模态模型回退
// - 文本/PDF/DOCX：输出正文（带头部标识）
// - 其它：仅输出文件名/类型占位
export async function buildAttachmentParts(att: Attachment): Promise<UnifiedAttachmentPart[]> {
  const parts: UnifiedAttachmentPart[] = [];
  try {
    if (att.dataUrl && att.mime?.startsWith('image/')) {
      parts.push({ type: 'image_url', image_url: { url: att.dataUrl } });
      parts.push({ type: 'text', text: `[Image: ${att.name} · ${Math.round((att.size || 0) / 1024)}KB]` });
      return parts;
    }

    const header = `[Attachment: ${att.name}${att.mime ? ` · ${att.mime}` : ''}]`;
    const text = (att.fullText || att.textSnippet || '').toString();
    if (text) {
      parts.push({ type: 'text', text: `${header}\n${text}` });
      return parts;
    }

    parts.push({ type: 'text', text: `${header}\n(Preview unavailable)` });
    return parts;
  } catch {
    parts.push({ type: 'text', text: `[Attachment parse error: ${att.name}]` });
    return parts;
  }
}

