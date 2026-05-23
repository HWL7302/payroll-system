import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserRole, type UserRole } from "@/lib/auth";
import { SignOutButton } from "@/components/SignOutButton";

type AppShellProps = {
  children: React.ReactNode;
  expectedRole: UserRole;
};

export async function AppShell({ children, expectedRole }: AppShellProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const role = getUserRole(user);

  if (role !== expectedRole) {
    redirect(role === "admin" ? "/admin" : "/employee");
  }

  return (
    <div className={`app-shell ${role}-theme`}>
      <header className="topbar">
        <a className="brand" href={role === "admin" ? "/admin" : "/employee"}>
          給与閲覧システム
        </a>
        <div className="topbar-actions">
          <span>{user.email}</span>
          <SignOutButton />
        </div>
      </header>
      <main className="main">{children}</main>
    </div>
  );
}
