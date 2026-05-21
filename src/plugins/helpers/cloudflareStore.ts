import { create } from 'zustand';

interface Task {
  id: number;
  url: string;
  type: 'interstitial' | 'turnstile';
  resolve: (value: boolean) => void;
}

interface CloudflareState {
  task: Task | null;
  pushTask: (
    url: string,
    type: 'interstitial' | 'turnstile',
  ) => Promise<boolean>;
  completeTask: (result: boolean) => void;
}

let taskId = 0;
export const useCloudflareStore = create<CloudflareState>((set, get) => ({
  task: null,
  pushTask: (url, type) => {
    return new Promise(resolve => {
      set({ task: { id: ++taskId, url, type, resolve } });
    });
  },
  completeTask: result => {
    const task = get().task;
    if (task) {
      task.resolve(result);
      set({ task: null });
    }
  },
}));

export const solveCloudflareAPI = async (
  url: string,
  type: 'interstitial' | 'turnstile' = 'turnstile',
): Promise<boolean> => {
  return useCloudflareStore.getState().pushTask(url, type);
};
