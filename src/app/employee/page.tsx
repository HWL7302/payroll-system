import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import type { Employee, PayrollRecord } from "@/lib/types";

type StatementCell = {
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
        <StatementTableSection title="勤怠項目" cells={statement.attendanceCells} />
        <StatementTableSection title="支給項目" cells={statement.paymentCells} />
        <StatementTableSection title="控除項目" cells={statement.deductionCells} />
        <StatementTableSection title="合計" cells={statement.totalCells} />
      </div>

      <footer className="statement-total">
        <span>差引支給額</span>
        <strong>{formatAmount(record.net_pay)}</strong>
      </footer>
    </article>
  );
}

function StatementTableSection({
  title,
  cells,
}: {
  title: string;
  cells: StatementCell[];
}) {
  const rows = chunkCells(cells, 5);

  return (
    <section className="statement-table-section">
      <h3>{title}</h3>
      <div className="statement-grid-table">
        {rows.map((row, rowIndex) => (
          <div className="statement-item-row" key={`${title}-${rowIndex}`}>
            {row.map((cell, cellIndex) => (
              <div className="statement-label-cell" key={`label-${cellIndex}`}>
                {cell.label}
              </div>
            ))}
            {row.map((cell, cellIndex) => (
              <div
                className={`statement-value-cell${cell.emphasis ? " emphasis" : ""}`}
                key={`value-${cellIndex}`}
              >
                {cell.value}
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}

function buildStatement(record: PayrollRecord) {
  const taxableTransportationAllowance: number | null = null;
  const nonTaxableTransportationAllowance = record.transportation_expense;
  const holidayAllowance: number | null = null;
  const lateNightAllowance: number | null = null;
  const nursingCareInsurance: number | null = null;
  const childCareSupport: number | null = null;
  const cashPayment: number | null = null;
  const bankTransferPayment = record.net_pay;

  const paymentTotal = sumKnownAmounts([
    record.base_salary,
    record.overtime_pay,
    holidayAllowance,
    lateNightAllowance,
    taxableTransportationAllowance,
    nonTaxableTransportationAllowance,
  ]);
  const socialInsuranceTotal = sumKnownAmounts([
    record.health_insurance,
    record.pension_insurance,
    record.employment_insurance,
    nursingCareInsurance,
  ]);
  const taxableAmount =
    paymentTotal - nonTaxableTransportationAllowance - socialInsuranceTotal;

  return {
    attendanceCells: [
      emptyCell(),
      emptyCell(),
      emptyCell(),
      emptyCell(),
      emptyCell(),
      emptyCell(),
      emptyCell(),
      emptyCell(),
      emptyCell(),
      emptyCell(),
    ],
    paymentCells: [
      moneyCell("基本給", record.base_salary),
      moneyCell("普通残業手当", record.overtime_pay),
      moneyCell("休日手当", holidayAllowance),
      moneyCell("深夜手当", lateNightAllowance),
      moneyCell("課税通勤手当", taxableTransportationAllowance),
      moneyCell("非課税通勤手当", nonTaxableTransportationAllowance),
      moneyCell("支給額合計", paymentTotal, true),
    ],
    deductionCells: [
      moneyCell("健康保険", record.health_insurance),
      moneyCell("介護保険", nursingCareInsurance),
      moneyCell("厚生年金", record.pension_insurance),
      moneyCell("雇用保険", record.employment_insurance),
      moneyCell("所得税", record.income_tax),
      moneyCell("住民税", record.resident_tax),
      moneyCell("子ども・子育て支援金", childCareSupport),
      moneyCell("その他控除", record.other_deductions),
      moneyCell("控除額合計", record.total_deductions, true),
    ],
    totalCells: [
      moneyCell("社会保険合計", socialInsuranceTotal),
      moneyCell("課税対象額", taxableAmount),
      moneyCell("振込支給額", bankTransferPayment),
      moneyCell("現金支給額", cashPayment),
    ],
  };
}

function chunkCells(cells: StatementCell[], size: number): StatementCell[][] {
  const paddedCells = [...cells];

  while (paddedCells.length % size !== 0) {
    paddedCells.push(emptyCell());
  }

  const rows: StatementCell[][] = [];

  for (let index = 0; index < paddedCells.length; index += size) {
    rows.push(paddedCells.slice(index, index + size));
  }

  return rows;
}

function emptyCell(): StatementCell {
  return {
    label: "",
    value: "",
  };
}

function moneyCell(
  label: string,
  value: number | null,
  emphasis = false,
): StatementCell {
  if (value === null) {
    return emptyCell();
  }

  return {
    label,
    value: formatAmount(value),
    emphasis,
  };
}

function sumKnownAmounts(values: Array<number | null>): number {
  return values.reduce<number>((total, value) => total + (value ?? 0), 0);
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

function formatAmount(value: number): string {
  return new Intl.NumberFormat("ja-JP", {
    maximumFractionDigits: 0,
  }).format(value);
}
