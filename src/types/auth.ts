export interface User {
  id: string;
  username: string;
  isAdmin: boolean;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface LoginInput {
  username: string;
  password: string;
}
