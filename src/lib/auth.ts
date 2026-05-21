import type { User } from "@supabase/supabase-js";

export type UserRole = "employee" | "admin";

export function getUserRole(user: User | null): UserRole {
  const role = user?.app_metadata?.role ?? user?.user_metadata?.role;

  return role === "admin" ? "admin" : "employee";
}
