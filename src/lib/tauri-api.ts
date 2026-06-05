import { invoke } from '@tauri-apps/api/core';
import { getVersion } from '@tauri-apps/api/app';
import { listen } from '@tauri-apps/api/event';

// Gateway state to keep track of current URL
let currentGatewayUrl = 'http://127.0.0.1:18789';

export const tauriAPI = {
  app: {
    version: async (): Promise<string> => {
      try {
        return await getVersion();
      } catch {
        return await invoke('get_app_version');
      }
    },
    platform: async (): Promise<string> => {
      return await invoke('get_platform');
    },
  },

  gateway: {
    health: async (): Promise<any> => {
      return await invoke('gateway_health', { gatewayUrl: currentGatewayUrl });
    },
    request: async <T = any>(
      path: string,
      init?: RequestInit,
    ): Promise<{ ok: boolean; data?: T; error?: string }> => {
      return await invoke('gateway_request', {
        path,
        init,
        gatewayUrl: currentGatewayUrl,
      });
    },
    streamUrl: async (): Promise<string> => {
      return await invoke('gateway_stream_url', { gatewayUrl: currentGatewayUrl });
    },
    updateUrl: async (url: string): Promise<void> => {
      currentGatewayUrl = url;
      await invoke('gateway_update_url', { newUrl: url });
      // Also save to settings
      await tauriAPI.settings.set('gateway', {
        mode: 'local',
        url: url,
        tokenSecretRef: '',
      });
    },
    status: async (): Promise<{ url: string; connected: boolean }> => {
      return await invoke('gateway_status', { gatewayUrl: currentGatewayUrl });
    },
  },

  settings: {
    get: async (key: string): Promise<any> => {
      const allSettings = await tauriAPI.settings.getAll();
      // Convert camelCase to snake_case for Rust compatibility
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      return allSettings[snakeKey] || allSettings[key];
    },
    set: async (key: string, value: any): Promise<void> => {
      await invoke('set_settings', { key, value });
      // If we're setting gateway, update our local URL
      if (key === 'gateway' && value?.url) {
        currentGatewayUrl = value.url;
        await invoke('gateway_update_url', { newUrl: value.url });
      }
    },
    getAll: async (): Promise<any> => {
      return await invoke('get_all_settings');
    },
    reset: async (): Promise<void> => {
      await invoke('reset_settings');
      currentGatewayUrl = 'http://127.0.0.1:18789';
    },
  },

  shell: {
    openExternal: async (url: string): Promise<void> => {
      await invoke('shell_open_external', { url });
    },
    quit: async (): Promise<void> => {
      // TODO: Implement proper app quit
      window.close();
    },
  },

  window: {
    toggle: async (): Promise<void> => {
      await invoke('window_toggle');
    },
    minimize: async (): Promise<void> => {
      await invoke('window_minimize');
    },
    maximize: async (): Promise<void> => {
      await invoke('window_maximize');
    },
    flash: async (): Promise<void> => {
      await invoke('window_flash');
    },
    setAlwaysOnTop: async (flag: boolean): Promise<void> => {
      await invoke('window_set_always_on_top', { flag });
    },
  },

  tray: {
    updateStatus: async (status: 'connected' | 'disconnected' | 'checking'): Promise<void> => {
      await invoke('tray_update_status', { status });
    },
  },

  notification: {
    show: async (opts: { title: string; body: string; silent?: boolean }): Promise<{ ok: boolean }> => {
      return await invoke('notification_show', opts);
    },
  },

  shortcuts: {
    register: async (accelerator: string, action: string): Promise<{ ok: boolean; error?: string }> => {
      // TODO: Implement shortcut registration in Rust backend first
      return { ok: false };
    },
    unregister: async (accelerator: string): Promise<void> => {
      // TODO: Implement shortcut unregistration in Rust backend first
    },
    isRegistered: async (accelerator: string): Promise<boolean> => {
      // TODO: Implement shortcut check in Rust backend first
      return false;
    },
  },

  updater: {
    checkForUpdates: async (): Promise<{ ok: boolean; [key: string]: any }> => {
      // TODO: Implement updater
      return { ok: false };
    },
    downloadUpdate: async (): Promise<{ ok: boolean; error?: string }> => {
      // TODO: Implement download
      return { ok: false };
    },
    installAndRestart: async (): Promise<{ ok: boolean }> => {
      // TODO: Implement install
      return { ok: false };
    },
  },

  openclawCli: {
    cronList: async (): Promise<{ ok: boolean; jobs: any[]; error?: string }> => {
      return await invoke('openclaw_cron_list_json');
    },
    cronListText: async (): Promise<{ ok: boolean; text: string; stderr: string }> => {
      return await invoke('openclaw_cron_list_text');
    },
    cronToggle: async (id: string, enabled: boolean): Promise<{ ok: boolean; error?: string }> => {
      return await invoke('openclaw_cron_toggle', { id, enabled });
    },
    cronRun: async (id: string): Promise<{ ok: boolean; error?: string }> => {
      return await invoke('openclaw_cron_run', { id });
    },
    sandboxList: async (): Promise<{ ok: boolean; text: string; stderr: string }> => {
      return await invoke('openclaw_sandbox_list');
    },
    sandboxExplain: async (): Promise<{ ok: boolean; text: string; stderr: string }> => {
      return await invoke('openclaw_sandbox_explain');
    },
  },

  on: (channel: string, callback: (...args: any[]) => void): (() => void) => {
    let unlisten: (() => void) | null = null;
    
    (async () => {
      try {
        unlisten = await listen(channel, (event) => {
          callback(event.payload);
        });
      } catch (error) {
        console.error('Failed to listen to event:', error);
      }
    })();
    
    return () => {
      unlisten?.();
    };
  },
};

// Initialize gateway URL from settings
(async () => {
  try {
    const settings = await tauriAPI.settings.getAll();
    if (settings?.gateway?.url) {
      currentGatewayUrl = settings.gateway.url;
    }
  } catch {
    // Keep default
  }
})();

// Make it available globally for backward compatibility
if (typeof window !== 'undefined') {
  (window as any).openclawAPI = tauriAPI;
}
