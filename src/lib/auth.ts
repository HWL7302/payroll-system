import type { User } from "@supabase/supabase-js";

export type UserRole = "employee" | "admin";

const TEMPORARY_ADMIN_EMAILS = new Set(["admin@test.com"]);

export function getUserRole(user: User | null): UserRole {
  if (!user) {
    return "employee";
  }

  if (isTemporaryAdmin(user.email)) {
    return "admin";
  }

  const role = user.app_metadata?.role ?? user.user_metadata?.role;

  return role === "admin" ? "admin" : "employee";
}

function isTemporaryAdmin(email: string | undefined): boolean {
  return email ? TEMPORARY_ADMIN_EMAILS.has(email.toLowerCase()) : false;
}
