export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
}

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  dueDate?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Tasks: undefined;
  CreateTask: { taskId?: string };
  TaskDetail: { taskId: string };
};
