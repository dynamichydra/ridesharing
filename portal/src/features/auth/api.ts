import { apiClient } from "@/lib/api-client";
import type { LoginData, User } from "./types";
import { LocalStorage } from "@/lib/utils";

export async function Login(loginData: LoginData): Promise<User | null> {
  try {
    // Calling POST /auth/admin/login
    const data = await apiClient.post<{
      accessToken: string;
      admin: { id: string; name: string; email: string; role: any };
    }>("/auth/admin/login", {
      email: loginData.email,
      password: loginData.password,
    });
    
    const user: User = {
      id: data.admin.id,
      name: data.admin.name,
      email: data.admin.email,
      role: data.admin.role,
      isActive: true,
      access_token: data.accessToken,
    };
    
    LocalStorage.set("rideshare-admin-user", user);
    return user;
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
}

export function LogOut() {
  LocalStorage.remove("rideshare-admin-user");
  window.location.href = "/login";
}

export async function getCurrentUser(): Promise<User | null> {
  const data: User = LocalStorage.get("rideshare-admin-user");
  if (!data) return null;
  return { ...data };
}
