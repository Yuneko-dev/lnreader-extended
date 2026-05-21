import { create } from 'zustand';

interface Task {
  id: number;
  url: string;
  type: 'interstitial' | 'turnstile';
  resolve: (value: boolean) => void;
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
      const newTask = { id: ++taskId, url, type, resolve };
      set(state => ({ tasks: [...state.tasks, newTask] }));
    });
  },
  completeTask: (id, result) => {
    const { tasks } = get();
    const taskIndex = tasks.findIndex(t => t.id === id);
    if (taskIndex !== -1) {
      tasks[taskIndex].resolve(result);
      set(state => ({ tasks: state.tasks.filter(t => t.id !== id) }));
    }
  },
}));

export const solveCloudflareAPI = async (
  url: string,
  type: 'interstitial' | 'turnstile' = 'turnstile',
): Promise<boolean> => {
  return useCloudflareStore.getState().pushTask(url, type);
};
