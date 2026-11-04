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
  } catch (error: any) {
    // The axios interceptor rejects with the raw AxiosResponse (not an Error), so
    // `error.message` is empty here — pull the backend's actual reason out of its
    // response envelope and surface that instead of a generic fallback.
    const backendMessage = error?.data?.MESSAGE;
    console.error("Login error:", backendMessage || error);
    throw new Error(
      typeof backendMessage === "string" ? backendMessage : "Invalid email or password",
    );
  }
}

export function LogOut() {
  LocalStorage.remove("rideshare-admin-user");
  window.location.href = "/login";
}

// The stored user only proves a token exists — role and active status come from the server,
// so editing localStorage can't unlock super-admin pages and a disabled admin is signed out.
// (A 401 here triggers the global logout in lib/api.ts.)
export async function getCurrentUser(): Promise<User | null> {
  const stored = LocalStorage.get<User>("rideshare-admin-user");
  if (!stored?.access_token) return null;

  let me;
  try {
    const res = await apiClient.get<{ id: string; name: string; email: string; role: User["role"]; isActive: boolean }>("/admin/me");
    me = res.MESSAGE;
  } catch (error: any) {
    // 401/403 → the session is gone (lib/api.ts already logs out on 401). Anything else is a
    // transient outage: keep the stored session — the backend enforces roles regardless.
    if (error?.status === 401 || error?.status === 403) return null;
    return { ...stored };
  }
  if (!me || me.isActive === false) {
    LogOut();
    return null;
  }
  const user: User = { ...stored, id: me.id, name: me.name, email: me.email, role: me.role, isActive: me.isActive };
  LocalStorage.set("rideshare-admin-user", user);
  return user;
}
