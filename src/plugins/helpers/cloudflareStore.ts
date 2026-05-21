import { create } from 'zustand';
import { MMKVStorage } from '@utils/mmkv/mmkv';
import { APP_SETTINGS } from '@hooks/persisted/useSettings';

interface Task {
  id: number;
  url: string;
  type: 'interstitial' | 'turnstile';
  resolve: (value: boolean) => void;
  timeoutId: NodeJS.Timeout;
}

interface CloudflareState {
  tasks: Task[];
  pushTask: (
    url: string,
    type: 'interstitial' | 'turnstile',
  ) => Promise<boolean>;
  completeTask: (id: number, result: boolean) => void;
}

let taskId = 0;
export const useCloudflareStore = create<CloudflareState>((set, get) => ({
  tasks: [],
  pushTask: (url, type) => {
    return new Promise(resolve => {
      const id = ++taskId;
      const timeoutId = setTimeout(() => {
        get().completeTask(id, false);
      }, 45000);
      const newTask = { id, url, type, resolve, timeoutId };
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

  return useCloudflareStore.getState().pushTask(url, type);
};
