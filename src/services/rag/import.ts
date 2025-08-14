import { chunkText } from './chunker';
import { putDoc } from './store';
import type { Attachment } from '../../store/chat';

export async function importAttachmentAsDoc(attachment: Attachment): Promise<{ docId: string; name: string; size: number }> {
  const text = attachment.fullText || attachment.textSnippet || '';
  if (!text || text.trim().length === 0) {
    const err: any = new Error('NO_TEXT');
    err.code = 'NO_TEXT';
    throw err;
  }

  const docId = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const name = attachment.name || 'Untitled';
  const size = text.length;
  const chunks = chunkText(docId, text);
  await putDoc({ id: docId, name, createdAt: Date.now(), size }, chunks);
  return { docId, name, size };
}


