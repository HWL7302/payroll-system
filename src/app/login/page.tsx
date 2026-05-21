import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(getUserRole(user) === "admin" ? "/admin" : "/employee");
  }

  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="login-title">
        <p className="eyebrow">Payroll Viewer</p>
        <h1 id="login-title">ログイン</h1>
        <p className="lead">
          登録済みのメールアドレスとパスワードでログインしてください。
        </p>
        <LoginForm />
      </section>
    </main>
  );
}
