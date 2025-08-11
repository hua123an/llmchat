import { ElMessage, ElMessageBox } from 'element-plus';
import { handleError, createError } from './errorHandler';

// 备份数据接口
interface BackupData {
  version: string;
  timestamp: string;
  userAgent: string;
  data: {
    chatTabs: any[];
    agents: any[];
    settings: any;
    activeTab: string;
  };
  checksum: string;
}

// 备份配置
interface BackupConfig {
  autoBackup: boolean;
  backupInterval: number; // 分钟
  maxBackups: number;
  compressionEnabled: boolean;
}

export class BackupManager {
  private static instance: BackupManager;
  private config: BackupConfig;
  private autoBackupTimer: number | null = null;

  private constructor() {
    this.config = this.loadConfig();
    this.startAutoBackup();
  }

  public static getInstance(): BackupManager {
    if (!BackupManager.instance) {
      BackupManager.instance = new BackupManager();
    }
    return BackupManager.instance;
  }

  /**
   * 创建完整备份
   */
  public async createBackup(manual = false): Promise<boolean> {
    try {
      console.log(`Creating ${manual ? 'manual' : 'automatic'} backup...`);
      
      const backupData: BackupData = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        data: {
          chatTabs: this.getStorageItem('chatTabs', []),
          agents: this.getStorageItem('agents', []),
          settings: this.getStorageItem('settings', {}),
          activeTab: this.getStorageItem('activeTab', '')
        },
        checksum: ''
      };

      // 生成校验和
      backupData.checksum = await this.generateChecksum(backupData.data);

      // 保存备份
      const success = await this.saveBackup(backupData, manual);
      
      if (success && manual) {
        ElMessage.success('备份创建成功');
      }

      return success;
    } catch (error) {
      handleError(
        createError.system('Failed to create backup', 'createBackup', '创建备份失败'),
        'BackupManager'
      );
      return false;
    }
  }

  /**
   * 从备份恢复数据
   */
  public async restoreFromBackup(backupData: BackupData): Promise<boolean> {
    try {
      // 验证备份数据
      if (!this.validateBackup(backupData)) {
        throw new Error('Invalid backup data');
      }

      // 验证校验和
      const calculatedChecksum = await this.generateChecksum(backupData.data);
      if (calculatedChecksum !== backupData.checksum) {
        throw new Error('Backup data corrupted (checksum mismatch)');
      }

      // 确认恢复操作
      const confirmed = await ElMessageBox.confirm(
        `确定要恢复到 ${new Date(backupData.timestamp).toLocaleString()} 的备份吗？\n当前数据将被覆盖！`,
        '确认恢复',
        {
          confirmButtonText: '确定恢复',
          cancelButtonText: '取消',
          type: 'warning',
          dangerouslyUseHTMLString: false
        }
      );

      if (confirmed !== 'confirm') {
        return false;
      }

      // 创建当前数据的备份
      await this.createBackup(true);

      // 恢复数据
      this.setStorageItem('chatTabs', backupData.data.chatTabs);
      this.setStorageItem('agents', backupData.data.agents);
      this.setStorageItem('settings', backupData.data.settings);
      this.setStorageItem('activeTab', backupData.data.activeTab);

      ElMessage.success('数据恢复成功，页面将自动刷新');
      
      // 延迟刷新页面以应用恢复的数据
      setTimeout(() => {
        window.location.reload();
      }, 1500);

      return true;
    } catch (error) {
      if (error instanceof Error && error.message === 'cancel') {
        return false;
      }
      
      handleError(
        createError.system('Failed to restore backup', 'restoreFromBackup', '恢复备份失败'),
        'BackupManager'
      );
      return false;
    }
  }

  /**
   * 导出备份文件
   */
  public async exportBackup(): Promise<void> {
    try {
      const backupData = await this.createBackupData();
      const jsonString = JSON.stringify(backupData, null, 2);
      
      // 创建下载链接
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `chatllm-backup-${new Date().toISOString().split('T')[0]}.json`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
      ElMessage.success('备份文件已导出');
    } catch (error) {
      handleError(
        createError.system('Failed to export backup', 'exportBackup', '导出备份失败'),
        'BackupManager'
      );
    }
  }

  /**
   * 导入备份文件
   */
  public async importBackup(file: File): Promise<boolean> {
    try {
      const text = await this.readFileAsText(file);
      const backupData: BackupData = JSON.parse(text);
      
      return await this.restoreFromBackup(backupData);
    } catch (error) {
      handleError(
        createError.validation('Failed to import backup file', 'importBackup', '导入备份文件失败，请检查文件格式'),
        'BackupManager'
      );
      return false;
    }
  }

  /**
   * 获取备份列表
   */
  public getBackupList(): Array<{
    id: string;
    timestamp: string;
    type: 'manual' | 'auto';
    size: number;
  }> {
    try {
      const backups = this.getStorageItem('backups', []);
      return backups.map((backup: any) => ({
        id: backup.id,
        timestamp: backup.timestamp,
        type: backup.type || 'auto',
        size: JSON.stringify(backup).length
      }));
    } catch (error) {
      console.error('Failed to get backup list:', error);
      return [];
    }
  }

  /**
   * 删除备份
   */
  public deleteBackup(backupId: string): boolean {
    try {
      const backups = this.getStorageItem('backups', []);
      const filteredBackups = backups.filter((backup: any) => backup.id !== backupId);
      
      this.setStorageItem('backups', filteredBackups);
      
      ElMessage.success('备份已删除');
      return true;
    } catch (error) {
      handleError(
        createError.system('Failed to delete backup', 'deleteBackup', '删除备份失败'),
        'BackupManager'
      );
      return false;
    }
  }

  /**
   * 清理旧备份
   */
  public cleanupOldBackups(): void {
    try {
      const backups = this.getStorageItem('backups', []);
      
      // 按时间排序，保留最新的
      const sortedBackups = backups.sort((a: any, b: any) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      // 只保留配置指定数量的备份
      const backupsToKeep = sortedBackups.slice(0, this.config.maxBackups);
      
      if (backupsToKeep.length < backups.length) {
        this.setStorageItem('backups', backupsToKeep);
        console.log(`Cleaned up ${backups.length - backupsToKeep.length} old backups`);
      }
    } catch (error) {
      console.error('Failed to cleanup old backups:', error);
    }
  }

  /**
   * 配置自动备份
   */
  public configureAutoBackup(config: Partial<BackupConfig>): void {
    this.config = { ...this.config, ...config };
    this.saveConfig();
    
    // 重启自动备份
    this.stopAutoBackup();
    if (this.config.autoBackup) {
      this.startAutoBackup();
    }
    
    ElMessage.success('自动备份配置已更新');
  }

  /**
   * 获取备份统计信息
   */
  public getBackupStats(): {
    totalBackups: number;
    totalSize: number;
    lastBackup: string | null;
    autoBackupEnabled: boolean;
    nextBackupIn: number; // 分钟
  } {
    const backups = this.getBackupList();
    const totalSize = backups.reduce((sum, backup) => sum + backup.size, 0);
    const lastBackup = backups.length > 0 ? backups[0].timestamp : null;
    
    const nextBackupIn = this.config.autoBackup ? 
      this.config.backupInterval - (Date.now() % (this.config.backupInterval * 60 * 1000)) / (60 * 1000) : 0;

    return {
      totalBackups: backups.length,
      totalSize,
      lastBackup,
      autoBackupEnabled: this.config.autoBackup,
      nextBackupIn: Math.round(nextBackupIn)
    };
  }

  // 私有方法
  private async createBackupData(): Promise<BackupData> {
    const data = {
      chatTabs: this.getStorageItem('chatTabs', []),
      agents: this.getStorageItem('agents', []),
      settings: this.getStorageItem('settings', {}),
      activeTab: this.getStorageItem('activeTab', '')
    };

    return {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      data,
      checksum: await this.generateChecksum(data)
    };
  }

  private async saveBackup(backupData: BackupData, manual = false): Promise<boolean> {
    try {
      const backups = this.getStorageItem('backups', []);
      
      const backup = {
        id: this.generateId(),
        type: manual ? 'manual' : 'auto',
        ...backupData
      };

      backups.unshift(backup);
      this.setStorageItem('backups', backups);
      
      // 清理旧备份
      this.cleanupOldBackups();
      
      return true;
    } catch (error) {
      console.error('Failed to save backup:', error);
      return false;
    }
  }

  private validateBackup(backupData: BackupData): boolean {
    return !!(
      backupData &&
      backupData.version &&
      backupData.timestamp &&
      backupData.data &&
      backupData.checksum &&
      Array.isArray(backupData.data.chatTabs) &&
      Array.isArray(backupData.data.agents)
    );
  }

  private async generateChecksum(data: any): Promise<string> {
    const jsonString = JSON.stringify(data);
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(jsonString);
    
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }

  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  private getStorageItem(key: string, defaultValue: any): any {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private setStorageItem(key: string, value: any): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      throw new Error(`Failed to save ${key} to localStorage`);
    }
  }

  private loadConfig(): BackupConfig {
    const defaultConfig: BackupConfig = {
      autoBackup: true,
      backupInterval: 30, // 30分钟
      maxBackups: 10,
      compressionEnabled: false
    };

    try {
      const saved = localStorage.getItem('backupConfig');
      return saved ? { ...defaultConfig, ...JSON.parse(saved) } : defaultConfig;
    } catch {
      return defaultConfig;
    }
  }

  private saveConfig(): void {
    try {
      localStorage.setItem('backupConfig', JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to save backup config:', error);
    }
  }

  private startAutoBackup(): void {
    if (!this.config.autoBackup) return;

    this.autoBackupTimer = window.setInterval(() => {
      this.createBackup(false);
    }, this.config.backupInterval * 60 * 1000);

    console.log(`Auto backup started (interval: ${this.config.backupInterval} minutes)`);
  }

  private stopAutoBackup(): void {
    if (this.autoBackupTimer) {
      clearInterval(this.autoBackupTimer);
      this.autoBackupTimer = null;
      console.log('Auto backup stopped');
    }
  }

  /**
   * 清理资源
   */
  public destroy(): void {
    this.stopAutoBackup();
  }
}

// 导出单例实例
export const backupManager = BackupManager.getInstance();

// 页面卸载时清理资源
window.addEventListener('beforeunload', () => {
  backupManager.destroy();
});

export default BackupManager;