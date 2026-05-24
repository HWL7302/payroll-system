import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import type { Employee } from "@/lib/types";
import { EmployeeForm } from "./EmployeeForm";
import { EmployeeManagementTable } from "./EmployeeManagementTable";

export default async function AdminEmployeesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("employees")
    .select(
      "id, employee_code, name, email, hire_date, resignation_date, status, role, auth_user_id, created_at, updated_at",
    )
    .order("employee_code", { ascending: true });

  const employees = (data ?? []) as Employee[];

  return (
    <AppShell expectedRole="admin">
      <div className="page-header">
        <div>
          <p className="eyebrow">株式会社HWL</p>
          <h1>管理者トップページ</h1>
        </div>
        <a className="button secondary" href="/admin">
          管理者トップへ
        </a>
      </div>

      <div className="stack">
        <section className="panel">
          <h2>新規登録</h2>
          <EmployeeForm />
        </section>

        <section className="panel">
          <h2>登録済み従業員</h2>
          {error ? (
            <div className="error">
              従業員一覧を取得できませんでした。Supabase の setup SQL が実行済みか確認してください。
            </div>
          ) : employees.length === 0 ? (
            <p>登録済みの従業員はまだありません。</p>
          ) : (
            <EmployeeManagementTable employees={employees} />
          )}
        </section>
      </div>
    </AppShell>
  );
}
