// Serverless Tasks Service
// Uses localStorage for persistence

export type Task = {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  created_at: string;
};

const TASKS_STORAGE_KEY = 'agronexus_tasks';

export const getTasks = async (): Promise<Task[]> => {
  await new Promise(resolve => setTimeout(resolve, 200));
  
  const tasks = localStorage.getItem(TASKS_STORAGE_KEY);
  if (tasks) {
    return JSON.parse(tasks);
  }
  
  // Initialize with empty array
  localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify([]));
  return [];
};

export const createTask = async (payload: any): Promise<Task> => {
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const tasks = await getTasks();
  const newTask: Task = {
    id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9),
    title: payload.title,
    description: payload.description || '',
    due_date: payload.due_date,
    priority: payload.priority || 'medium',
    completed: false,
    created_at: new Date().toISOString(),
  };
  
  tasks.push(newTask);
  localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
  
  return newTask;
};

export const updateTask = async (id: string, payload: any): Promise<Task> => {
  await new Promise(resolve => setTimeout(resolve, 250));
  
  const tasks = await getTasks();
  const taskIndex = tasks.findIndex(t => t.id === id);
  
  if (taskIndex === -1) {
    throw new Error('Task not found');
  }
  
  tasks[taskIndex] = { ...tasks[taskIndex], ...payload };
  localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
  
  return tasks[taskIndex];
};

export const deleteTask = async (id: string): Promise<void> => {
  await new Promise(resolve => setTimeout(resolve, 200));
  
  const tasks = await getTasks();
  const filteredTasks = tasks.filter(t => t.id !== id);
  localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(filteredTasks));
};

export default { getTasks, createTask, updateTask, deleteTask };
