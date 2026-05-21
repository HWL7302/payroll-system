import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import type { Employee, PayrollRecord } from "@/lib/types";

type StatementItem = {
  label: string;
  value: string;
  emphasis?: boolean;
};

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
  const statement = buildStatement(record);

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

      <div className="statement-table-layout">
        <StatementTableSection title="勤怠項目" items={statement.attendanceItems} />
        <StatementTableSection title="支給項目" items={statement.paymentItems} />
        <StatementTableSection title="控除項目" items={statement.deductionItems} />
        <StatementTableSection title="合計" items={statement.totalItems} />
      </div>

      <footer className="statement-total">
        <span>差引支給額</span>
        <strong>{formatCurrency(record.net_pay)}</strong>
      </footer>
    </article>
  );
}

function StatementTableSection({
  title,
  items,
}: {
  title: string;
  items: StatementItem[];
}) {
  return (
    <section className="statement-table-section">
      <h3>{title}</h3>
      <div className="statement-grid-table">
        {items.map((item) => (
          <div
            className={`statement-grid-row${item.emphasis ? " emphasis" : ""}`}
            key={item.label}
          >
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function buildStatement(record: PayrollRecord) {
  const taxableTransportationAllowance = 0;
  const nonTaxableTransportationAllowance = record.transportation_expense;
  const holidayAllowance = 0;
  const lateNightAllowance = 0;
  const nursingCareInsurance = 0;
  const childCareSupport = 0;
  const cashPayment = 0;
  const bankTransferPayment = record.net_pay;

  const paymentTotal =
    record.base_salary +
    record.overtime_pay +
    holidayAllowance +
    lateNightAllowance +
    taxableTransportationAllowance +
    nonTaxableTransportationAllowance;
  const socialInsuranceTotal =
    record.health_insurance +
    record.pension_insurance +
    record.employment_insurance +
    nursingCareInsurance;
  const taxableAmount =
    paymentTotal - nonTaxableTransportationAllowance - socialInsuranceTotal;

  return {
    attendanceItems: [
      textItem("出勤日数", "0日"),
      textItem("休日出勤日数", "0日"),
      textItem("有給日数", "0日"),
      textItem("欠勤日数", "0日"),
      textItem("遅刻・早退回数", "0回"),
      textItem("所定労働時間", "0:00"),
      textItem("時間外労働時間", "0:00"),
      textItem("休日労働時間", "0:00"),
      textItem("深夜時間", "0:00"),
      textItem("遅刻・早退時間", "0:00"),
    ],
    paymentItems: [
      moneyItem("基本給", record.base_salary),
      moneyItem("普通残業手当", record.overtime_pay),
      moneyItem("休日手当", holidayAllowance),
      moneyItem("深夜手当", lateNightAllowance),
      moneyItem("課税通勤手当", taxableTransportationAllowance),
      moneyItem("非課税通勤手当", nonTaxableTransportationAllowance),
      moneyItem("支給額合計", paymentTotal, true),
    ],
    deductionItems: [
      moneyItem("健康保険", record.health_insurance),
      moneyItem("厚生年金", record.pension_insurance),
      moneyItem("雇用保険", record.employment_insurance),
      moneyItem("介護保険", nursingCareInsurance),
      moneyItem("所得税", record.income_tax),
      moneyItem("住民税", record.resident_tax),
      moneyItem("子ども・子育て支援金", childCareSupport),
      moneyItem("その他控除", record.other_deductions),
      moneyItem("控除額合計", record.total_deductions, true),
    ],
    totalItems: [
      moneyItem("社会保険合計", socialInsuranceTotal),
      moneyItem("課税対象額", taxableAmount),
      moneyItem("振込支給額", bankTransferPayment),
      moneyItem("現金支給額", cashPayment),
      moneyItem("差引支給額", record.net_pay, true),
    ],
  };
}

function textItem(label: string, value: string): StatementItem {
  return {
    label,
    value,
  };
}

function moneyItem(label: string, value: number, emphasis = false): StatementItem {
  return {
    label,
    value: formatCurrency(value),
    emphasis,
  };
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
