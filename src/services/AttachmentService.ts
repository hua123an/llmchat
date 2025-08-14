import { IAttachmentService } from '../types/services';
import { Attachment, createAttachmentId } from '../types';
import { injectable, SERVICE_TOKENS } from './container';

@injectable(SERVICE_TOKENS.ATTACHMENT_SERVICE)
export class AttachmentService implements IAttachmentService {

  async processFile(file: File): Promise<Attachment> {
    try {
      const attachmentId = createAttachmentId(`att-${Date.now()}`);
      
      const attachment: Attachment = {
        id: attachmentId,
        name: file.name,
        mime: file.type,
        size: file.size,
      };

      // 处理图片文件
      if (file.type.startsWith('image/')) {
        attachment.dataUrl = await this.fileToDataUrl(file);
      }

      // 处理文本文件
      if (file.type.startsWith('text/') || this.isTextFile(file)) {
        const text = await this.readTextFile(file);
        attachment.fullText = text;
        attachment.textSnippet = this.createTextSnippet(text);
      }

      // 处理PDF文件
      if (file.type === 'application/pdf') {
        try {
          const text = await this.extractPdfText(file);
          attachment.fullText = text;
          attachment.textSnippet = this.createTextSnippet(text);
        } catch (error) {
          console.warn('PDF text extraction failed:', error);
          attachment.textSnippet = `PDF文件: ${file.name} (${this.formatFileSize(file.size)})`;
        }
      }

      // 处理Word文档
      if (file.type.includes('wordprocessingml') || file.name.endsWith('.docx')) {
        try {
          const text = await this.extractDocxText(file);
          attachment.fullText = text;
          attachment.textSnippet = this.createTextSnippet(text);
        } catch (error) {
          console.warn('DOCX text extraction failed:', error);
          attachment.textSnippet = `Word文档: ${file.name} (${this.formatFileSize(file.size)})`;
        }
      }

      // 如果没有提取到文本内容，创建基础描述
      if (!attachment.textSnippet) {
        attachment.textSnippet = this.createBasicDescription(file);
      }

      return attachment;

    } catch (error) {
      console.error('Failed to process file:', error);
      throw new Error(`Failed to process file ${file.name}: ${error}`);
    }
  }

  async extractText(attachment: Attachment): Promise<string> {
    if (attachment.fullText) {
      return attachment.fullText;
    }

    if (attachment.textSnippet) {
      return attachment.textSnippet;
    }

    throw new Error(`No text content available for attachment ${attachment.name}`);
  }

  async recognizeImage(file: File): Promise<string> {
    try {
      // 这里集成OCR服务，比如Tesseract.js
      const text = await (window as any).electronAPI?.recognizeImage?.(file);
      return text || '';
    } catch (error) {
      console.error('Image recognition failed:', error);
      throw new Error(`Failed to recognize text in image: ${error}`);
    }
  }

  // 私有辅助方法

  private async fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file as data URL'));
      reader.readAsDataURL(file);
    });
  }

  private async readTextFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read text file'));
      reader.readAsText(file, 'UTF-8');
    });
  }

  private isTextFile(file: File): boolean {
    const textExtensions = [
      '.txt', '.md', '.json', '.xml', '.csv', '.yml', '.yaml',
      '.js', '.ts', '.jsx', '.tsx', '.vue', '.py', '.java',
      '.c', '.cpp', '.h', '.css', '.html', '.php', '.rb',
      '.go', '.rs', '.swift', '.kt', '.scala', '.sh', '.sql'
    ];
    
    return textExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
  }

  private async extractPdfText(file: File): Promise<string> {
    try {
      // 使用electron API处理PDF
      const arrayBuffer = await file.arrayBuffer();
      const text = await (window as any).electronAPI?.extractPdfText?.(arrayBuffer);
      return text || '';
    } catch (error) {
      console.error('PDF extraction failed:', error);
      throw new Error(`Failed to extract PDF text: ${error}`);
    }
  }

  private async extractDocxText(file: File): Promise<string> {
    try {
      // 使用electron API处理DOCX
      const arrayBuffer = await file.arrayBuffer();
      const text = await (window as any).electronAPI?.extractDocxText?.(arrayBuffer);
      return text || '';
    } catch (error) {
      console.error('DOCX extraction failed:', error);
      throw new Error(`Failed to extract DOCX text: ${error}`);
    }
  }

  private createTextSnippet(text: string, maxLength = 200): string {
    if (!text || text.trim().length === 0) {
      return '';
    }

    const cleanText = text.trim().replace(/\s+/g, ' ');
    
    if (cleanText.length <= maxLength) {
      return cleanText;
    }

    return cleanText.substring(0, maxLength) + '...';
  }

  private createBasicDescription(file: File): string {
    const type = this.getFileTypeDisplay(file.type);
    const size = this.formatFileSize(file.size);
    return `${type}: ${file.name} (${size})`;
  }

  private getFileTypeDisplay(mime: string): string {
    if (mime.startsWith('image/')) return '图片';
    if (mime.includes('pdf')) return 'PDF文档';
    if (mime.includes('word')) return 'Word文档';
    if (mime.includes('text')) return '文本文件';
    if (mime.includes('json')) return 'JSON文件';
    if (mime.includes('xml')) return 'XML文件';
    if (mime.includes('csv')) return 'CSV文件';
    return '文件';
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // 验证文件
  validateFile(file: File): { valid: boolean; reason?: string } {
    // 文件大小限制 (50MB)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return { valid: false, reason: '文件大小超过50MB限制' };
    }

    // 支持的文件类型
    const supportedTypes = [
      'image/',
      'text/',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/json',
      'application/xml',
    ];

    const isSupported = supportedTypes.some(type => file.type.startsWith(type)) || 
                       this.isTextFile(file);
    
    if (!isSupported) {
      return { valid: false, reason: '不支持的文件类型' };
    }

    return { valid: true };
  }

  // 获取文件元数据
  async getFileMetadata(file: File): Promise<{
    name: string;
    size: number;
    type: string;
    lastModified: number;
    isImage: boolean;
    isText: boolean;
    isDocument: boolean;
  }> {
    return {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      isImage: file.type.startsWith('image/'),
      isText: file.type.startsWith('text/') || this.isTextFile(file),
      isDocument: file.type.includes('pdf') || file.type.includes('word'),
    };
  }

  // 压缩图片
  async compressImage(file: File, maxWidth = 1024, quality = 0.8): Promise<File> {
    if (!file.type.startsWith('image/')) {
      throw new Error('File is not an image');
    }

    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // 计算新尺寸
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;

        // 绘制压缩图片
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          file.type,
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }
}
