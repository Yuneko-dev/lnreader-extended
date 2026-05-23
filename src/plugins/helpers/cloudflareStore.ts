import { create } from 'zustand';
import { MMKVStorage } from '@utils/mmkv/mmkv';
import { APP_SETTINGS } from '@hooks/persisted/useSettings';
import { showToast } from '@utils/showToast';

interface Task {
  id: number;
  url: string;
  type: 'interstitial' | 'turnstile' | 'solve-turnstile';
  sitekey?: string;
  resolve: (value: boolean | string) => void;
  timeoutId: NodeJS.Timeout;
}

interface CloudflareState {
  tasks: Task[];
  pushTask: (
    url: string,
    type: 'interstitial' | 'turnstile',
  ) => Promise<boolean>;
  pushTurnstileTask: (url: string, sitekey: string) => Promise<string>;
  completeTask: (id: number, result: boolean | string) => void;
}

let taskId = 0;
export const useCloudflareStore = create<CloudflareState>((set, get) => ({
  tasks: [],
  pushTask: (url, type) => {
    return new Promise<boolean>(resolve => {
      const id = ++taskId;
      const timeoutId = setTimeout(() => {
        get().completeTask(id, false);
      }, 45000);
      const newTask: Task = {
        id,
        url,
        type,
        resolve: resolve as (value: boolean | string) => void,
        timeoutId,
      };
      set(state => ({ tasks: [...state.tasks, newTask] }));
    });
  },
  pushTurnstileTask: (url, sitekey) => {
    return new Promise<string>(resolve => {
      const id = ++taskId;
      const timeoutId = setTimeout(() => {
        get().completeTask(id, '');
      }, 45000);
      const newTask: Task = {
        id,
        url,
        type: 'solve-turnstile',
        sitekey,
        resolve: resolve as (value: boolean | string) => void,
        timeoutId,
      };
      set(state => ({ tasks: [...state.tasks, newTask] }));
    });
  },
  completeTask: (id, result) => {
    const { tasks } = get();
    const taskIndex = tasks.findIndex(t => t.id === id);
    if (taskIndex !== -1) {
      clearTimeout(tasks[taskIndex].timeoutId);
      tasks[taskIndex].resolve(result);
      set(state => ({ tasks: state.tasks.filter(t => t.id !== id) }));
    }
  },
}));

const appSettingsStr = MMKVStorage.getString(APP_SETTINGS);
let initialAllowBypass = false;
if (appSettingsStr) {
  try {
    const settings = JSON.parse(appSettingsStr);
    initialAllowBypass = !!settings.allowCloudflareBypass;
  } catch {}
}

export const solveCloudflareAPI = async (
  url: string,
  type: 'interstitial' | 'turnstile' = 'turnstile',
): Promise<boolean> => {
  if (!initialAllowBypass) {
    throw new Error('Cloudflare bypass is disabled in settings.');
  }

  try {
    const hostname = new URL(url).hostname;
    showToast(`Bypassing Cloudflare: ${hostname}`);
  } catch {
    showToast(`Bypassing Cloudflare...`);
  }

  return useCloudflareStore.getState().pushTask(url, type);
};

export const solveCloudflareTurnstileAPI = async (
  url: string,
  sitekey: string,
): Promise<string> => {
  if (!initialAllowBypass) {
    throw new Error('Cloudflare bypass is disabled in settings.');
  }
  showToast(`Bypassing Turnstile...`);
  return useCloudflareStore.getState().pushTurnstileTask(url, sitekey);
};
