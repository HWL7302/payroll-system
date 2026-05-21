import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import type { Employee } from "@/lib/types";
import { EmployeeForm } from "./EmployeeForm";

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
          <p className="eyebrow">Admin / Employees</p>
          <h1>従業員一覧</h1>
          <p className="lead">
            従業員マスタの基本情報を登録・確認するための画面です。
          </p>
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
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>社員番号</th>
                    <th>氏名</th>
                    <th>メール</th>
                    <th>入社日</th>
                    <th>退職日</th>
                    <th>ステータス</th>
                    <th>権限</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((employee) => (
                    <tr key={employee.id}>
                      <td>{employee.employee_code}</td>
                      <td>{employee.name}</td>
                      <td>{employee.email}</td>
                      <td>{employee.hire_date ?? "-"}</td>
                      <td>{employee.resignation_date ?? "-"}</td>
                      <td>{formatStatus(employee.status)}</td>
                      <td>{formatRole(employee.role)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function formatStatus(status: Employee["status"]) {
  const labels = {
    active: "在籍",
    inactive: "休職など",
    resigned: "退職",
  };

  return labels[status];
}

function formatRole(role: Employee["role"]) {
  return role === "admin" ? "管理者" : "従業員";
}
