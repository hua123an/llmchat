// 轻量接入：动态导入 tesseract.js，避免主包臃肿
export async function recognizeImage(file: File): Promise<string> {
  try {
    const T = await import('tesseract.js');
    const worker = await T.createWorker();
    // 从设置读取语言
    let lang = 'eng';
    try {
      const raw = localStorage.getItem('appSettings');
      const cfg = raw ? JSON.parse(raw) : {};
      if (typeof cfg.ocrLang === 'string') lang = cfg.ocrLang;
    } catch {}
    await worker.reinitialize(lang);
    const { data } = await worker.recognize(file);
    await worker.terminate();
    return (data?.text || '').trim() || '[OCR empty]';
  } catch (e) {
    return '[OCR error]';
  }
}


