import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import type { Employee, PayrollRecord } from "@/lib/types";

export default async function EmployeePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const authEmail = user.email?.toLowerCase() ?? "";
  const { data: employee, error: employeeError } = await supabase
    .from("employees")
    .select("id, employee_code, name, email, hire_date, resignation_date, status, role, auth_user_id, created_at, updated_at")
    .ilike("email", authEmail)
    .maybeSingle();

  const payrollRecords = employee
    ? await fetchPayrollRecords(supabase, employee.id)
    : { data: [], error: null };

  return (
    <AppShell expectedRole="employee">
      <div className="page-header">
        <div>
          <p className="eyebrow">Employee</p>
          <h1>従業員トップページ</h1>
          <p className="lead">
            ログイン中のメールアドレスに紐づく給与明細データを表示します。
          </p>
        </div>
        <span className="status-pill">Payroll</span>
      </div>

      <div className="stack">
        <section className="panel">
          <h2>従業員情報</h2>
          {employeeError ? (
            <div className="error">
              従業員情報を取得できませんでした。管理者に確認してください。
            </div>
          ) : employee ? (
            <div className="summary-row">
              <span className="status-pill">社員番号 {employee.employee_code}</span>
              <span className="status-pill">氏名 {employee.name}</span>
              <span className="status-pill">メール {employee.email}</span>
            </div>
          ) : (
            <div className="error">
              ログイン中のメールアドレスに一致する従業員情報がありません。
            </div>
          )}
        </section>

        <section className="panel">
          <h2>給与明細一覧</h2>
          {payrollRecords.error ? (
            <div className="error">
              給与明細データを取得できませんでした。管理者に確認してください。
            </div>
          ) : payrollRecords.data.length === 0 ? (
            <p>表示できる給与明細データはまだありません。</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>対象年月</th>
                    <th>基本給</th>
                    <th>残業代</th>
                    <th>各種手当</th>
                    <th>交通費</th>
                    <th>控除合計</th>
                    <th>差引支給額</th>
                  </tr>
                </thead>
                <tbody>
                  {payrollRecords.data.map((record) => (
                    <tr key={record.id}>
                      <td>{formatPayrollMonth(record.payroll_month)}</td>
                      <td>{formatCurrency(record.base_salary)}</td>
                      <td>{formatCurrency(record.overtime_pay)}</td>
                      <td>{formatCurrency(record.allowances)}</td>
                      <td>{formatCurrency(record.transportation_expense)}</td>
                      <td>{formatCurrency(record.total_deductions)}</td>
                      <td>{formatCurrency(record.net_pay)}</td>
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

async function fetchPayrollRecords(
  supabase: Awaited<ReturnType<typeof createClient>>,
  employeeId: Employee["id"],
) {
  return supabase
    .from("payroll_records")
    .select(
      "id, employee_id, payroll_month, base_salary, overtime_pay, allowances, transportation_expense, total_deductions, net_pay, created_at, updated_at",
    )
    .eq("employee_id", employeeId)
    .order("payroll_month", { ascending: false })
    .returns<PayrollRecord[]>();
}

function formatPayrollMonth(value: string): string {
  return value.slice(0, 7);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(value);
}
