import { ref, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useTabsStore } from '../stores/useTabsStore';
import { inject, SERVICE_TOKENS } from '../services/container';
import { IAttachmentService, IEventService } from '../types/services';
import { Attachment, AttachmentId, createAttachmentId } from '../types';

export function useAttachments() {
  // Store 引用
  const tabsStore = useTabsStore();
  
  // 服务注入
  const attachmentService = inject<IAttachmentService>(SERVICE_TOKENS.ATTACHMENT_SERVICE);
  const eventService = inject<IEventService>(SERVICE_TOKENS.EVENT_SERVICE);

  // 状态
  const isProcessing = ref(false);
  const processingError = ref<Error | null>(null);
  const dragOverCounter = ref(0);

  // 从 store 获取状态
  const { activeTab } = storeToRefs(tabsStore);

  // 计算属性
  const attachments = computed(() => {
    return activeTab.value?.attachments || [];
  });

  const hasAttachments = computed(() => {
    return attachments.value.length > 0;
  });

  const attachmentCount = computed(() => {
    return attachments.value.length;
  });

  const totalSize = computed(() => {
    return attachments.value.reduce((total, attachment) => total + attachment.size, 0);
  });

  const isDragOver = computed(() => {
    return dragOverCounter.value > 0;
  });

  const imageAttachments = computed(() => {
    return attachments.value.filter(att => att.mime?.startsWith('image/'));
  });

  const documentAttachments = computed(() => {
    return attachments.value.filter(att => 
      !att.mime?.startsWith('image/') && 
      (att.mime?.includes('pdf') || 
       att.mime?.includes('document') || 
       att.mime?.includes('text') ||
       att.textSnippet)
    );
  });

  // 文件处理
  const processFile = async (file: File): Promise<Attachment> => {
    try {
      isProcessing.value = true;
      processingError.value = null;

      const attachment = await attachmentService.processFile(file);
      
      eventService.emit('attachment:processed', { attachment });
      return attachment;

    } catch (error) {
      processingError.value = error as Error;
      eventService.emit('attachment:process_failed', { error: error as Error, fileName: file.name });
      throw error;
    } finally {
      isProcessing.value = false;
    }
  };

  // 添加附件
  const addAttachment = async (file: File) => {
    if (!activeTab.value) {
      throw new Error('没有活动的对话标签');
    }

    try {
      const attachment = await processFile(file);
      
      const currentAttachments = activeTab.value.attachments || [];
      const updatedAttachments = [...currentAttachments, attachment];
      
      tabsStore.updateTab(activeTab.value.id, { attachments: updatedAttachments });
      
      eventService.emit('attachment:added', { 
        tabId: activeTab.value.id, 
        attachment 
      });

      return attachment;

    } catch (error) {
      console.error('添加附件失败:', error);
      throw error;
    }
  };

  // 批量添加附件
  const addMultipleAttachments = async (files: FileList | File[]) => {
    if (!activeTab.value) {
      throw new Error('没有活动的对话标签');
    }

    const fileArray = Array.from(files);
    const results: { success: Attachment[]; failed: { file: File; error: Error }[] } = {
      success: [],
      failed: []
    };

    for (const file of fileArray) {
      try {
        const attachment = await addAttachment(file);
        results.success.push(attachment);
      } catch (error) {
        results.failed.push({ file, error: error as Error });
      }
    }

    eventService.emit('attachments:batch_added', { 
      tabId: activeTab.value.id, 
      results 
    });

    return results;
  };

  // 移除附件
  const removeAttachment = (attachmentId: AttachmentId) => {
    if (!activeTab.value) return;

    const currentAttachments = activeTab.value.attachments || [];
    const filteredAttachments = currentAttachments.filter(att => att.id !== attachmentId);
    
    tabsStore.updateTab(activeTab.value.id, { attachments: filteredAttachments });
    
    eventService.emit('attachment:removed', { 
      tabId: activeTab.value.id, 
      attachmentId 
    });
  };

  // 清除所有附件
  const clearAttachments = () => {
    if (!activeTab.value) return;

    const oldAttachments = activeTab.value.attachments || [];
    tabsStore.updateTab(activeTab.value.id, { attachments: [] });
    
    eventService.emit('attachments:cleared', { 
      tabId: activeTab.value.id, 
      count: oldAttachments.length 
    });
  };

  // 拖拽处理
  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    dragOverCounter.value++;
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    dragOverCounter.value--;
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    dragOverCounter.value = 0;

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      await addMultipleAttachments(files);
    }
  };

  // 文件选择处理
  const handleFileSelect = async (e: Event) => {
    const target = e.target as HTMLInputElement;
    const files = target.files;
    
    if (files && files.length > 0) {
      await addMultipleAttachments(files);
      // 清空input以允许重复选择同一文件
      target.value = '';
    }
  };

  // 提取文本内容
  const extractText = async (attachment: Attachment): Promise<string> => {
    try {
      const text = await attachmentService.extractText(attachment);
      
      eventService.emit('attachment:text_extracted', { 
        attachmentId: attachment.id, 
        textLength: text.length 
      });
      
      return text;
    } catch (error) {
      eventService.emit('attachment:text_extraction_failed', { 
        attachmentId: attachment.id, 
        error: error as Error 
      });
      throw error;
    }
  };

  // 图像识别
  const recognizeImage = async (file: File): Promise<string> => {
    try {
      isProcessing.value = true;
      const text = await attachmentService.recognizeImage(file);
      
      eventService.emit('attachment:image_recognized', { 
        fileName: file.name, 
        textLength: text.length 
      });
      
      return text;
    } catch (error) {
      eventService.emit('attachment:image_recognition_failed', { 
        fileName: file.name, 
        error: error as Error 
      });
      throw error;
    } finally {
      isProcessing.value = false;
    }
  };

  // 附件验证
  const validateFile = (file: File): { valid: boolean; reason?: string } => {
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

    const isSupported = supportedTypes.some(type => file.type.startsWith(type));
    if (!isSupported) {
      return { valid: false, reason: '不支持的文件类型' };
    }

    return { valid: true };
  };

  // 获取附件预览信息
  const getAttachmentPreview = (attachment: Attachment) => {
    return {
      isImage: attachment.mime?.startsWith('image/'),
      isDocument: !attachment.mime?.startsWith('image/'),
      hasPreview: !!(attachment.dataUrl || attachment.textSnippet),
      size: formatFileSize(attachment.size),
      type: getFileTypeDisplay(attachment.mime || ''),
    };
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 获取文件类型显示名称
  const getFileTypeDisplay = (mime: string): string => {
    if (mime.startsWith('image/')) return '图片';
    if (mime.includes('pdf')) return 'PDF';
    if (mime.includes('word')) return 'Word';
    if (mime.includes('text')) return '文本';
    if (mime.includes('json')) return 'JSON';
    return '文件';
  };

  // 清除错误
  const clearError = () => {
    processingError.value = null;
  };

  return {
    // 状态
    isProcessing,
    processingError,
    isDragOver,

    // 计算属性
    attachments,
    hasAttachments,
    attachmentCount,
    totalSize,
    imageAttachments,
    documentAttachments,

    // 方法
    addAttachment,
    addMultipleAttachments,
    removeAttachment,
    clearAttachments,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleFileSelect,
    extractText,
    recognizeImage,
    validateFile,
    getAttachmentPreview,
    formatFileSize,
    getFileTypeDisplay,
    clearError,
  };
}
