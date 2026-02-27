export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
}

export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  Tasks: undefined;
};
