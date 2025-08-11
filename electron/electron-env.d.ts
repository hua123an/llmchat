
/// <reference types="vite/client" />

import { ElectronAPI } from './preload';

declare global {
  interface Window {
    electronAPI: ElectronAPI;
    ipcRenderer: {
      on: (channel: string, listener: (event: any, ...args: any[]) => void) => void;
    };
  }
}
