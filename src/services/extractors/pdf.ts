// Lightweight PDF text extraction using pdfjs-dist (dynamic import)
export async function extractPdfText(buffer: ArrayBuffer, maxPages = 20): Promise<string> {
  const pdfjs = await import('pdfjs-dist');
  try {
    const workerSrc = (await import('pdfjs-dist/build/pdf.worker.mjs?worker&url')).default as any;
    (pdfjs as any).GlobalWorkerOptions.workerSrc = workerSrc;
  } catch {
    // ignore worker config in certain bundlers; pdfjs can still run
  }
  const loadingTask = (pdfjs as any).getDocument({ data: buffer });
  const doc = await loadingTask.promise;
  const pages = Math.min(doc.numPages, maxPages);
  let text = '';
  for (let i = 1; i <= pages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const parts = content.items.map((it: any) => it.str).join(' ');
    text += parts + '\n';
  }
  try { await doc.cleanup(); } catch {}
  return text.trim();
}


