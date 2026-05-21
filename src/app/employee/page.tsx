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
    .select(
      "id, employee_code, name, email, hire_date, resignation_date, status, role, auth_user_id, created_at, updated_at",
    )
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
          <h1>給与明細</h1>
          <p className="lead">
            ログイン中のメールアドレスに紐づく給与明細データを表示します。
          </p>
        </div>
        <span className="status-pill">Payroll</span>
      </div>

      <div className="stack">
        {employeeError ? (
          <div className="error">
            従業員情報を取得できませんでした。管理者に確認してください。
          </div>
        ) : !employee ? (
          <div className="error">
            ログイン中のメールアドレスに一致する従業員情報がありません。
          </div>
        ) : payrollRecords.error ? (
          <div className="error">
            給与明細データを取得できませんでした。管理者に確認してください。
          </div>
        ) : payrollRecords.data.length === 0 ? (
          <section className="panel">
            <h2>給与明細一覧</h2>
            <p>表示できる給与明細データはまだありません。</p>
          </section>
        ) : (
          payrollRecords.data.map((record) => (
            <PayrollStatementCard
              key={record.id}
              employee={employee}
              record={record}
            />
          ))
        )}
      </div>
    </AppShell>
  );
}

function PayrollStatementCard({
  employee,
  record,
}: {
  employee: Employee;
  record: PayrollRecord;
}) {
  const paymentItems = [
    ["基本給", record.base_salary],
    ["残業代", record.overtime_pay],
    ["各種手当", record.allowances],
    ["交通費", record.transportation_expense],
  ] as const;

  const deductionItems = [
    ["健康保険", record.health_insurance],
    ["厚生年金", record.pension_insurance],
    ["雇用保険", record.employment_insurance],
    ["所得税", record.income_tax],
    ["住民税", record.resident_tax],
    ["その他控除", record.other_deductions],
    ["控除合計", record.total_deductions],
  ] as const;

  return (
    <article className="payroll-statement">
      <header className="statement-header">
        <div>
          <p className="eyebrow">給与明細書</p>
          <h2>{formatPayrollMonth(record.payroll_month)}</h2>
        </div>
        <div className="statement-meta">
          <div>
            <span>氏名</span>
            <strong>{employee.name}</strong>
          </div>
          <div>
            <span>社員番号</span>
            <strong>{employee.employee_code}</strong>
          </div>
          <div>
            <span>メールアドレス</span>
            <strong>{employee.email}</strong>
          </div>
          <div>
            <span>対象年月</span>
            <strong>{formatPayrollMonth(record.payroll_month)}</strong>
          </div>
        </div>
      </header>

      <div className="statement-sections">
        <StatementSection title="支給" items={paymentItems} />
        <StatementSection title="控除" items={deductionItems} />
      </div>

      <footer className="statement-total">
        <span>差引支給額</span>
        <strong>{formatCurrency(record.net_pay)}</strong>
      </footer>
    </article>
  );
}

function StatementSection({
  title,
  items,
}: {
  title: string;
  items: readonly (readonly [string, number])[];
}) {
  return (
    <section className="statement-section">
      <h3>{title}</h3>
      <dl>
        {items.map(([label, value]) => (
          <div key={label} className="statement-line">
            <dt>{label}</dt>
            <dd>{formatCurrency(value)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

async function fetchPayrollRecords(
  supabase: Awaited<ReturnType<typeof createClient>>,
  employeeId: Employee["id"],
) {
  return supabase
    .from("payroll_records")
    .select(
      "id, employee_id, payroll_month, base_salary, overtime_pay, allowances, transportation_expense, health_insurance, pension_insurance, employment_insurance, income_tax, resident_tax, other_deductions, total_deductions, net_pay, created_at, updated_at",
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
