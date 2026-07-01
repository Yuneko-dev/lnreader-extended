import { APP_SETTINGS } from '@hooks/persisted/useSettings';
import { MMKVStorage } from '@utils/mmkv/mmkv';
import { showToast } from '@utils/showToast';
import { createHash,randomUUID } from 'react-native-quick-crypto';
import { create } from 'zustand';

export function hashMD5(input: string): string {
  const hash = createHash('md5');
  hash.update(input);
  return hash.digest('hex');
}

interface Task {
  id: string;
  url: string;
  type: 'interstitial' | 'turnstile' | 'solve-turnstile';
  sitekey?: string;
  html?: string;
  resolve: (value: boolean | string) => void;
  timeoutId: NodeJS.Timeout;
}

const buildTurnstileHtml = (
  url: string,
  sitekey: string,
): string => `<!DOCTYPE html>
<html>
<head>
  <title>${hashMD5(url)}</title>
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=myCallback" async defer></script>
</head>
<body style="display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #fff;">
  <div id="captcha"></div>
  <script>
    window.turnstileToken = null;
    window.myCallback = function() {
      turnstile.render('#captcha', {
        sitekey: ${JSON.stringify(sitekey)},
        callback: function(token) {
          window.turnstileToken = token;
        }
      });
    };
  </script>
</body>
</html>`;

interface CloudflareState {
  tasks: Task[];
  pushTask: (
    url: string,
    type: 'interstitial' | 'turnstile',
  ) => Promise<boolean>;
  pushTurnstileTask: (url: string, sitekey: string) => Promise<string>;
  completeTask: (id: string, result: boolean | string) => void;
}

export const useCloudflareStore = create<CloudflareState>((set, get) => ({
  tasks: [],
  pushTask: (url, type) => {
    return new Promise<boolean>(resolve => {
      const id = randomUUID();
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
      const id = randomUUID();
      const timeoutId = setTimeout(() => {
        get().completeTask(id, '');
      }, 45000);
      const newTask: Task = {
        id,
        url,
        type: 'solve-turnstile',
        sitekey,
        html: buildTurnstileHtml(url, sitekey),
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
    const { hostname } = new URL(url);
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
