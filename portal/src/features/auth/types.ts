export type UserRole = "super_admin" | "admin";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  access_token: string;
}

export interface LoginData {
  email: string;
  password: string;
}
