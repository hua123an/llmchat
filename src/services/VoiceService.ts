/**
 * 语音服务
 * 支持语音识别（STT）和语音合成（TTS）
 */

// 浏览器语音识别API类型声明
interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  readonly length: number;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResult[];
  readonly resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  abort(): void;
  start(): void;
  stop(): void;
}

declare global {
  var SpeechRecognition: {
    prototype: SpeechRecognition;
    new(): SpeechRecognition;
  };
  var webkitSpeechRecognition: {
    prototype: SpeechRecognition;
    new(): SpeechRecognition;
  };
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof webkitSpeechRecognition;
  }
}

export interface VoiceSettings {
  // STT设置
  sttProvider?: 'browser' | 'xfyun';
  xfyunAppId?: string;
  xfyunApiKey?: string;
  xfyunApiSecret?: string;
  speechRecognitionLang: string;
  speechRecognitionContinuous: boolean;
  speechRecognitionInterim: boolean;
  
  // TTS设置
  speechSynthesisVoice: string;
  speechSynthesisRate: number;
  speechSynthesisVolume: number;
  speechSynthesisPitch: number;
  
  // 其他设置
  autoPlayResponse: boolean;
  voiceInputEnabled: boolean;
  wakeWordEnabled: boolean;
  wakeWord: string;
}

export interface VoiceSpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export class VoiceService {
  private static instance: VoiceService;
  private recognition: SpeechRecognition | null = null;
  private synthesis: SpeechSynthesis | null = null;
  private isListening = false;
  private isSupported = false;
  // XFYun runtime
  private xfWs: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private xfClosed = false;
  private callbacks: {
    onResult?: (result: VoiceSpeechRecognitionResult) => void;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (error: string) => void;
  } = {};

  constructor() {
    this.initializeSpeechRecognition();
    this.initializeSpeechSynthesis();
  }

  static getInstance(): VoiceService {
    if (!VoiceService.instance) {
      VoiceService.instance = new VoiceService();
    }
    return VoiceService.instance;
  }

  /**
   * 初始化语音识别
   */
  private initializeSpeechRecognition() {
    // 检查浏览器支持
    const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('Speech Recognition not supported');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.isSupported = true;

    const settings = this.getSettings();
    
    // 配置语音识别
    this.recognition.lang = settings.speechRecognitionLang;
    this.recognition.continuous = settings.speechRecognitionContinuous;
    this.recognition.interimResults = settings.speechRecognitionInterim;

    // 事件监听
    this.recognition.onstart = () => {
      this.isListening = true;
      this.callbacks.onStart?.();
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.callbacks.onEnd?.();
    };

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      const results = Array.from(event.results);
      const latest = results[results.length - 1];
      
      if (latest) {
        const transcript = latest[0].transcript;
        const confidence = latest[0].confidence || 1;
        const isFinal = latest.isFinal;
        
        this.callbacks.onResult?.({
          transcript,
          confidence,
          isFinal
        });
      }
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      this.isListening = false;
      let message = event.error;
      switch (event.error) {
        case 'not-allowed':
        case 'service-not-allowed':
          message = '未授予麦克风权限，请在系统/浏览器设置中开启麦克风权限后重试';
          break;
        case 'no-speech':
          message = '未检测到语音，请靠近麦克风再试';
          break;
        case 'audio-capture':
          message = '未检测到麦克风设备，请检查音频输入设备';
          break;
        case 'network':
          message = '当前环境不支持内置语音识别（Electron/非HTTPS）。建议使用讯飞/阿里云等STT服务，或在Chrome浏览器HTTPS页面下使用';
          break;
      }
      this.callbacks.onError?.(message);
    };
  }

  /**
   * 初始化语音合成
   */
  private initializeSpeechSynthesis() {
    if ('speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
    } else {
      console.warn('Speech Synthesis not supported');
    }
  }

  /**
   * 开始语音识别
   */
  startListening(callbacks?: {
    onResult?: (result: VoiceSpeechRecognitionResult) => void;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (error: string) => void;
  }): boolean {
    // 设置回调
    this.callbacks = callbacks || {};

    const settings = this.getSettings();
    if (settings.sttProvider === 'xfyun') {
      this.startXfYunIat(settings).catch(err => {
        console.error('XFYun start error:', err);
        this.callbacks.onError?.(String(err?.message || err) || '讯飞听写启动失败');
      });
      return true;
    }

    if (!this.isSupported || !this.recognition) {
      return false;
    }

    if (this.isListening) {
      this.stopListening();
    }

    try {
      if (navigator?.mediaDevices?.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true }).finally(() => {
          try { this.recognition!.start(); } catch {}
        });
      } else {
        this.recognition.start();
      }
      return true;
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      this.callbacks.onError?.('启动语音识别失败：当前环境可能不支持原生识别，请在Chrome(HTTPS)环境或改用第三方STT');
      return false;
    }
  }

  /**
   * 停止语音识别
   */
  stopListening() {
    try {
      if (this.recognition && this.isListening) {
        this.recognition.stop();
      }
    } catch {}
    // stop XFYun
    this.stopXfYun();
  }

  /**
   * 语音合成播放文本
   */
  speak(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synthesis) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      // 停止当前播放
      this.synthesis.cancel();

      const settings = this.getSettings();
      const utterance = new SpeechSynthesisUtterance(text);
      
      // 设置语音参数
      utterance.rate = settings.speechSynthesisRate;
      utterance.volume = settings.speechSynthesisVolume;
      utterance.pitch = settings.speechSynthesisPitch;

      // 设置声音
      const voices = this.synthesis.getVoices();
      const selectedVoice = voices.find(voice => 
        voice.name === settings.speechSynthesisVoice ||
        voice.lang.startsWith('zh') ||
        voice.default
      );
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      utterance.onend = () => resolve();
      utterance.onerror = (event) => reject(new Error(event.error));

      this.synthesis.speak(utterance);
    });
  }

  // ===== XFYun IAT (WebSocket) =====
  private async startXfYunIat(settings: VoiceSettings): Promise<void> {
    if (!settings.xfyunAppId || !settings.xfyunApiKey || !settings.xfyunApiSecret) {
      throw new Error('请先在设置中填写讯飞 AppID/APIKey/APISecret');
    }
    // Build signed URL
    const host = 'iat-api.xfyun.cn';
    const path = '/v2/iat';
    const date = new Date().toUTCString();
    const algorithm = 'hmac-sha256';
    const headers = 'host date request-line';
    const signatureOrigin = `host: ${host}\ndate: ${date}\nGET ${path} HTTP/1.1`;
    const signature = await this.hmacSha256Base64(settings.xfyunApiSecret!, signatureOrigin);
    const authorizationOrigin = `hmac username=\"${settings.xfyunApiKey}\", algorithm=\"${algorithm}\", headers=\"${headers}\", signature=\"${signature}\"`;
    const authorization = this.base64Utf8(authorizationOrigin);
    const url = `wss://${host}${path}?authorization=${encodeURIComponent(authorization)}&date=${encodeURIComponent(date)}&host=${encodeURIComponent(host)}`;

    // Open WS
    this.xfClosed = false;
    const ws = new WebSocket(url);
    this.xfWs = ws;

    ws.onopen = async () => {
      try {
        await this.initMicPipeline(settings.speechRecognitionLang || 'zh-CN');
        this.isListening = true;
        this.callbacks.onStart?.();
      } catch (e) {
        this.callbacks.onError?.('麦克风初始化失败');
        this.stopXfYun();
      }
    };

    ws.onmessage = (evt: MessageEvent) => {
      try {
        const data = JSON.parse(String(evt.data || '{}'));
        if (data?.code !== 0) {
          if (data?.code) {
            this.callbacks.onError?.(`识别错误: ${data.code} ${data.message || ''}`);
          }
          return;
        }
        const status = data?.data?.status;
        const segments = data?.data?.result?.ws || [];
        const text = segments.map((w: any) => (w.cw || []).map((c: any) => c.w || '').join('')).join('');
        if (text) {
          this.callbacks.onResult?.({ transcript: text, confidence: 1, isFinal: status === 2 });
        }
        if (status === 2) {
          this.stopXfYun();
        }
      } catch (e) {
        // ignore
      }
    };

    ws.onerror = () => {
      this.callbacks.onError?.('讯飞连接错误');
    };

    ws.onclose = () => {
      this.teardownMicPipeline();
      this.isListening = false;
      if (!this.xfClosed) {
        this.callbacks.onEnd?.();
      }
    };
  }

  private stopXfYun() {
    try {
      if (this.xfWs && this.xfWs.readyState === WebSocket.OPEN) {
        // send last frame with status 2
        const lastFrame = { data: { status: 2, format: 'audio/L16;rate=16000', encoding: 'raw', audio: '' } };
        try { this.xfWs.send(JSON.stringify(lastFrame)); } catch {}
      }
    } finally {
      this.xfClosed = true;
      try { this.xfWs?.close(); } catch {}
      this.xfWs = null;
      this.teardownMicPipeline();
      this.callbacks.onEnd?.();
    }
  }

  private async initMicPipeline(lang: string) {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.mediaStream = stream;
    const source = this.audioContext.createMediaStreamSource(stream);
    // Use ScriptProcessor for simplicity
    const bufferSize = 4096;
    const processor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
    this.processor = processor;

    let firstSent = false;
    processor.onaudioprocess = (e) => {
      if (!this.xfWs || this.xfWs.readyState !== WebSocket.OPEN) return;
      const input = e.inputBuffer.getChannelData(0);
      // AudioContext already at 16k due to constructor option; still convert to Int16
      const pcm16 = this.floatTo16BitPCM(input);
      const chunkBase64 = this.base64FromArrayBuffer(pcm16.buffer);
      const frame = {
        common: firstSent ? undefined : { app_id: this.getSettings().xfyunAppId },
        business: firstSent ? undefined : {
          language: lang.startsWith('zh') ? 'zh_cn' : 'en_us',
          domain: 'iat',
          accent: 'mandarin',
          dwa: 'wpgs',
          vad_eos: 8000
        },
        data: {
          status: firstSent ? 1 : 0,
          format: 'audio/L16;rate=16000',
          encoding: 'raw',
          audio: chunkBase64
        }
      } as any;
      try { this.xfWs!.send(JSON.stringify(frame)); firstSent = true; } catch {}
    };
    source.connect(processor);
    processor.connect(this.audioContext.destination);
  }

  private teardownMicPipeline() {
    try { this.processor?.disconnect(); } catch {}
    try { this.audioContext?.close(); } catch {}
    try { this.mediaStream?.getTracks().forEach(t => t.stop()); } catch {}
    this.processor = null;
    this.audioContext = null;
    this.mediaStream = null;
  }

  private async hmacSha256Base64(secret: string, data: string): Promise<string> {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
    return this.base64FromArrayBuffer(sig);
  }

  private base64Utf8(input: string): string {
    return btoa(unescape(encodeURIComponent(input)));
  }

  private base64FromArrayBuffer(buf: ArrayBuffer | ArrayBufferLike): string {
    const bytes = new Uint8Array(buf as ArrayBufferLike);
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as any);
    }
    return btoa(binary);
  }

  private floatTo16BitPCM(input: Float32Array): Int16Array {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      let s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return output;
  }

  /**
   * 停止语音播放
   */
  stopSpeaking() {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
  }

  /**
   * 获取可用的语音列表
   */
  getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!this.synthesis) return [];
    return this.synthesis.getVoices();
  }

  /**
   * 检查是否支持语音功能
   */
  isVoiceSupported(): boolean {
    return this.isSupported && !!this.synthesis;
  }

  /**
   * 当前是否正在监听
   */
  getIsListening(): boolean {
    return this.isListening;
  }

  /**
   * 当前是否正在播放
   */
  getIsSpeaking(): boolean {
    return this.synthesis ? this.synthesis.speaking : false;
  }

  /**
   * 获取语音设置
   */
  private getSettings(): VoiceSettings {
    try {
      const saved = localStorage.getItem('voiceSettings');
      const settings = saved ? JSON.parse(saved) : {};
      
      return {
        sttProvider: settings.sttProvider || 'browser',
        xfyunAppId: settings.xfyunAppId || '',
        xfyunApiKey: settings.xfyunApiKey || '',
        xfyunApiSecret: settings.xfyunApiSecret || '',
        speechRecognitionLang: settings.speechRecognitionLang || 'zh-CN',
        speechRecognitionContinuous: settings.speechRecognitionContinuous ?? true,
        speechRecognitionInterim: settings.speechRecognitionInterim ?? true,
        speechSynthesisVoice: settings.speechSynthesisVoice || '',
        speechSynthesisRate: settings.speechSynthesisRate ?? 1,
        speechSynthesisVolume: settings.speechSynthesisVolume ?? 1,
        speechSynthesisPitch: settings.speechSynthesisPitch ?? 1,
        autoPlayResponse: settings.autoPlayResponse ?? false,
        voiceInputEnabled: settings.voiceInputEnabled ?? true,
        wakeWordEnabled: settings.wakeWordEnabled ?? false,
        wakeWord: settings.wakeWord || '小助手'
      };
    } catch {
      return {
        sttProvider: 'browser',
        xfyunAppId: '',
        xfyunApiKey: '',
        xfyunApiSecret: '',
        speechRecognitionLang: 'zh-CN',
        speechRecognitionContinuous: true,
        speechRecognitionInterim: true,
        speechSynthesisVoice: '',
        speechSynthesisRate: 1,
        speechSynthesisVolume: 1,
        speechSynthesisPitch: 1,
        autoPlayResponse: false,
        voiceInputEnabled: true,
        wakeWordEnabled: false,
        wakeWord: '小助手'
      };
    }
  }

  /**
   * 保存语音设置
   */
  saveSettings(settings: Partial<VoiceSettings>) {
    try {
      const current = this.getSettings();
      const updated = { ...current, ...settings };
      localStorage.setItem('voiceSettings', JSON.stringify(updated));
      
      // 更新语音识别配置
      if (this.recognition) {
        this.recognition.lang = updated.speechRecognitionLang;
        this.recognition.continuous = updated.speechRecognitionContinuous;
        this.recognition.interimResults = updated.speechRecognitionInterim;
      }
    } catch (error) {
      console.error('Failed to save voice settings:', error);
    }
  }

  /**
   * 是否已配置讯飞听写所需凭据
   */
  isXfYunConfigured(): boolean {
    const s = this.getSettings();
    return !!(s.xfyunAppId && s.xfyunApiKey && s.xfyunApiSecret);
  }

  /**
   * 语音命令识别
   */
  recognizeCommand(text: string): { 
    type: 'send' | 'clear' | 'stop' | 'new_chat' | 'voice_off' | 'unknown';
    confidence: number;
  } {
    const lowerText = text.toLowerCase().trim();
    
    // 发送消息命令
    const sendCommands = ['发送', '提交', '确认', '发出去', 'send'];
    if (sendCommands.some(cmd => lowerText.includes(cmd))) {
      return { type: 'send', confidence: 0.9 };
    }
    
    // 清空输入命令
    const clearCommands = ['清空', '清除', '删除', '重新开始', 'clear'];
    if (clearCommands.some(cmd => lowerText.includes(cmd))) {
      return { type: 'clear', confidence: 0.8 };
    }
    
    // 停止命令
    const stopCommands = ['停止', '暂停', '结束', '不要说了', 'stop'];
    if (stopCommands.some(cmd => lowerText.includes(cmd))) {
      return { type: 'stop', confidence: 0.9 };
    }
    
    // 新建对话命令
    const newChatCommands = ['新建对话', '新聊天', '重新开始', '新的对话'];
    if (newChatCommands.some(cmd => lowerText.includes(cmd))) {
      return { type: 'new_chat', confidence: 0.8 };
    }
    
    // 关闭语音命令
    const voiceOffCommands = ['关闭语音', '退出语音', '语音模式关闭'];
    if (voiceOffCommands.some(cmd => lowerText.includes(cmd))) {
      return { type: 'voice_off', confidence: 0.9 };
    }
    
    return { type: 'unknown', confidence: 0 };
  }

  /**
   * 文本预处理（去除不适合语音播放的内容）
   */
  preprocessTextForSpeech(text: string): string {
    // 移除Markdown语法
    let processed = text
      .replace(/#{1,6}\s/g, '') // 移除标题标记
      .replace(/\*\*(.*?)\*\*/g, '$1') // 移除粗体标记
      .replace(/\*(.*?)\*/g, '$1') // 移除斜体标记
      .replace(/`(.*?)`/g, '$1') // 移除内联代码标记
      .replace(/```[\s\S]*?```/g, '[代码块]') // 替换代码块
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // 移除链接格式，保留文本
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '[图片]') // 替换图片
      .replace(/>\s/g, '') // 移除引用标记
      .replace(/[-*+]\s/g, '') // 移除列表标记
      .replace(/\d+\.\s/g, '') // 移除有序列表标记
      .replace(/\n{2,}/g, '。'); // 多个换行替换为句号
    
    // 移除HTML标签
    processed = processed.replace(/<[^>]*>/g, '');
    
    // 移除多余的空格和换行
    processed = processed.replace(/\s+/g, ' ').trim();
    
    // 限制长度（TTS有时对很长的文本处理不好）
    if (processed.length > 500) {
      processed = processed.substring(0, 500) + '...';
    }
    
    return processed;
  }

  /**
   * 检测唤醒词
   */
  detectWakeWord(text: string): boolean {
    const settings = this.getSettings();
    if (!settings.wakeWordEnabled) return false;
    
    const lowerText = text.toLowerCase();
    const wakeWord = settings.wakeWord.toLowerCase();
    
    return lowerText.includes(wakeWord);
  }
}

// 声明浏览器API类型
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

export const voiceService = VoiceService.getInstance();
