import { safeStorage, app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

export class SecureStorage {
  private static instance: SecureStorage;
  private configPath: string;

  private constructor() {
    // 获取用户数据目录
    try {
      const userDataPath = app.getPath('userData');
      this.configPath = path.join(userDataPath, 'secure-config.json');
    } catch (error) {
      // 如果无法获取electron，使用当前目录
      this.configPath = path.join(process.cwd(), 'secure-config.json');
    }
  }

  public static getInstance(): SecureStorage {
    if (!SecureStorage.instance) {
      SecureStorage.instance = new SecureStorage();
    }
    return SecureStorage.instance;
  }

  /**
   * 安全存储API密钥
   */
  public storeApiKey(provider: string, apiKey: string): boolean {
    try {
      if (!safeStorage.isEncryptionAvailable()) {
        return this.storeFallback(provider, apiKey);
      }

      const encryptedKey = safeStorage.encryptString(apiKey);
      const config = this.loadConfig();
      
      config.apiKeys = config.apiKeys || {};
      config.apiKeys[provider] = {
        encrypted: encryptedKey.toString('base64'),
        timestamp: Date.now()
      };

      this.saveConfig(config);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取API密钥
   */
  public getApiKey(provider: string): string | null {
    try {
      const config = this.loadConfig();
      const keyData = config.apiKeys?.[provider];
      
      if (!keyData) {
        return null;
      }

      if (!safeStorage.isEncryptionAvailable()) {
        return this.getFallback(provider);
      }

      const encryptedBuffer = Buffer.from(keyData.encrypted, 'base64');
      return safeStorage.decryptString(encryptedBuffer);
    } catch (error) {
      return null;
    }
  }

  /**
   * 获取API密钥的预览格式（用于前端显示）
   */
  public getApiKeyPreview(provider: string): string | null {
    try {
      const fullKey = this.getApiKey(provider);
      if (!fullKey) return null;
      
      // 生成预览格式：显示前8位...后6位
      if (fullKey.length <= 14) {
        // 如果密钥太短，显示前半部分...
        const half = Math.floor(fullKey.length / 2);
        return fullKey.substring(0, half) + '...';
      } else {
        return fullKey.substring(0, 8) + '...' + fullKey.substring(fullKey.length - 6);
      }
    } catch (error) {
      return null;
    }
  }

  /**
   * 删除API密钥
   */
  public removeApiKey(provider: string): boolean {
    try {
      const config = this.loadConfig();
      if (config.apiKeys?.[provider]) {
        delete config.apiKeys[provider];
        this.saveConfig(config);
      }
      return true;
    } catch (error) {
      console.error('删除API密钥失败:', error);
      return false;
    }
  }

  /**
   * 获取所有已配置的服务商
   */
  public getConfiguredProviders(): string[] {
    try {
      const config = this.loadConfig();
      return Object.keys(config.apiKeys || {});
    } catch (error) {
      console.error('获取服务商列表失败:', error);
      return [];
    }
  }

  /**
   * 迁移旧配置文件
   */
  public migrateFromOldConfig(_oldConfigPath: string): boolean {
    // 已禁用：不再在启动时迁移或备份 llmconfig.txt，防止生成 .backup.* 文件
    return true;
  }

  /**
   * 备用存储方案（简单混淆，不是真正的加密）
   */
  private storeFallback(provider: string, apiKey: string): boolean {
    try {
      const obfuscated = Buffer.from(apiKey).toString('base64');
      const config = this.loadConfig();
      
      config.fallbackKeys = config.fallbackKeys || {};
      config.fallbackKeys[provider] = {
        data: obfuscated,
        timestamp: Date.now()
      };

      this.saveConfig(config);
      return true;
    } catch (error) {
      console.error('备用存储失败:', error);
      return false;
    }
  }

  private getFallback(provider: string): string | null {
    try {
      const config = this.loadConfig();
      const keyData = config.fallbackKeys?.[provider];
      
      if (!keyData) {
        return null;
      }

      return Buffer.from(keyData.data, 'base64').toString();
    } catch (error) {
      console.error('备用获取失败:', error);
      return null;
    }
  }

  private loadConfig(): any {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf8');
        return JSON.parse(data);
      }
      return {};
    } catch (error) {
      console.error('加载配置失败:', error);
      return {};
    }
  }

  private saveConfig(config: any): void {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
    } catch (error) {
      console.error('保存配置失败:', error);
      throw error;
    }
  }
}

export default SecureStorage;