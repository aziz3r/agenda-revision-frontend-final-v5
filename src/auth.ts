// src/auth.ts
export type AuthPayload = {
  jwt: string;
  user: { id: number; email: string; username?: string };
};

const KEY = "auth";

export function saveAuth(data: AuthPayload) {
  localStorage.setItem(KEY, JSON.stringify(data));
}
export function getAuth(): AuthPayload | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as AuthPayload; } catch { return null; }
}
export function logout() {
  localStorage.removeItem(KEY);
}
export function getAuthEmail(): string | null {
  return getAuth()?.user?.email ?? null;
}
