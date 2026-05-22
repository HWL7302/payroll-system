import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import type { Employee, PayrollRecord } from "@/lib/types";
import { PayrollMonthSelector } from "./PayrollMonthSelector";

type EmployeePageProps = {
  searchParams?: Promise<{
    month?: string | string[];
  }>;
};

type StatementCell = {
  label: string;
  value: string;
  emphasis?: boolean;
};

type PayrollMonthOption = {
  value: string;
  label: string;
};

export default async function EmployeePage({ searchParams }: EmployeePageProps) {
  const params = await searchParams;
  const requestedMonth = Array.isArray(params?.month)
    ? params?.month[0]
    : params?.month;
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
  const records = payrollRecords.data ?? [];
  const monthOptions = buildMonthOptions(records);
  const selectedMonth = chooseSelectedMonth(monthOptions, requestedMonth);
  const selectedRecord =
    records.find(
      (record) => formatPayrollMonth(record.payroll_month) === selectedMonth,
    ) ?? records[0];

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
        ) : records.length === 0 ? (
          <section className="panel">
            <h2>給与明細一覧</h2>
            <p>表示できる給与明細データはまだありません。</p>
          </section>
        ) : (
          <>
            <PayrollMonthSelector
              options={monthOptions}
              selectedMonth={selectedMonth}
            />
            <PayrollStatementCard employee={employee} record={selectedRecord} />
          </>
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
          <h2>{formatPayrollMonthLabel(record.payroll_month)}</h2>
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
            <strong>{formatPayrollMonthLabel(record.payroll_month)}</strong>
          </div>
        </div>
        <div className="statement-download">
          <button className="button secondary" type="button">
            給与明細ダウンロード
          </button>
        </div>
      </header>

      <div className="statement-table-layout">
        <StatementTableSection title="勤怠項目" cells={statement.attendanceCells} />
        <StatementTableSection title="支給項目" cells={statement.paymentCells} />
        <StatementTableSection title="控除項目" cells={statement.deductionCells} />
        <StatementTableSection title="合計" cells={statement.totalCells} />
      </div>

      <footer className="statement-total">
        <span>振込支給額</span>
        <strong>{formatDisplayAmount(nonZeroOrFallback(record.bank_transfer_amount, record.net_pay))}</strong>
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
  const nonTaxableTransportationAllowance = nonZeroOrFallback(
    record.non_taxable_transportation_allowance,
    record.transportation_expense,
  );
  const paymentTotalFallback = sumDisplayAmounts([
    record.base_salary,
    record.overtime_pay,
    record.holiday_pay,
    record.late_night_pay,
    record.taxable_transportation_allowance,
    nonTaxableTransportationAllowance,
  ]);
  const socialInsuranceTotalFallback = sumDisplayAmounts([
    record.health_insurance,
    record.pension_insurance,
    record.employment_insurance,
    record.nursing_care_insurance,
  ]);
  const paymentTotal = nonZeroOrFallback(record.payment_total, paymentTotalFallback);
  const socialInsuranceTotal = nonZeroOrFallback(
    record.social_insurance_total,
    socialInsuranceTotalFallback,
  );
  const taxableAmountFallback =
    valueForCalculation(paymentTotal) -
    valueForCalculation(nonTaxableTransportationAllowance) -
    valueForCalculation(socialInsuranceTotal);
  const taxableAmount = nonZeroOrFallback(record.taxable_amount, taxableAmountFallback);

  const paymentItems = [
    amountCell("基本給", record.base_salary),
    amountCell("普通残業手当", record.overtime_pay),
    amountCell("休日手当", record.holiday_pay),
    amountCell("深夜手当", record.late_night_pay),
    amountCell("課税通勤手当", record.taxable_transportation_allowance),
    amountCell("非課税通勤手当", nonTaxableTransportationAllowance),
  ];
  const deductionItems = [
    amountCell("健康保険", record.health_insurance),
    amountCell("厚生年金", record.pension_insurance),
    amountCell("雇用保険", record.employment_insurance),
    amountCell("介護保険", record.nursing_care_insurance),
    amountCell("その他控除", record.other_deductions),
    amountCell("所得税", record.income_tax),
    amountCell("住民税", record.resident_tax),
    amountCell("子ども・子育て支援金", record.child_care_support),
  ];

  return {
    attendanceCells: [
      valueCell("出勤日数", record.attendance_days),
      valueCell("休日出勤日数", record.holiday_attendance_days),
      valueCell("有給日数", record.paid_leave_days),
      valueCell("欠勤日数", record.absence_days),
      valueCell("遅刻・早退回数", record.late_early_count),
      valueCell("所定労働時間", record.scheduled_work_hours),
      valueCell("時間外労働時間", record.overtime_work_hours),
      valueCell("休日労働時間", record.holiday_work_hours),
      valueCell("深夜時間", record.late_night_hours),
      valueCell("遅刻・早退時間", record.late_early_hours),
    ],
    paymentCells: placeLastCellAtRowEnd(
      paymentItems,
      amountCell("支給額合計", paymentTotal, true),
      5,
    ),
    deductionCells: placeLastCellAtRowEnd(
      deductionItems,
      amountCell("控除額合計", record.total_deductions, true),
      5,
    ),
    totalCells: [
      amountCell("社会保険合計", socialInsuranceTotal),
      amountCell("課税対象額", taxableAmount),
      blankCell(),
      blankCell(),
      amountCell("差引支給額", record.net_pay, true),
    ],
  };
}

function buildMonthOptions(records: PayrollRecord[]): PayrollMonthOption[] {
  const months = new Map<string, string>();

  for (const record of records) {
    const month = formatPayrollMonth(record.payroll_month);
    months.set(month, formatPayrollMonthLabel(record.payroll_month));
  }

  return [...months.entries()].map(([value, label]) => ({
    value,
    label,
  }));
}

function chooseSelectedMonth(
  options: PayrollMonthOption[],
  requestedMonth: string | undefined,
): string {
  const normalizedMonth = requestedMonth?.slice(0, 7);
  const requestedOption = options.find((option) => option.value === normalizedMonth);

  return requestedOption?.value ?? options[0]?.value ?? "";
}

function placeLastCellAtRowEnd(
  cells: StatementCell[],
  lastCell: StatementCell,
  rowSize: number,
): StatementCell[] {
  const arrangedCells = [...cells];
  const nextPosition = arrangedCells.length % rowSize;

  if (nextPosition !== rowSize - 1) {
    const blanksNeeded = rowSize - 1 - nextPosition;

    for (let index = 0; index < blanksNeeded; index += 1) {
      arrangedCells.push(blankCell());
    }
  }

  arrangedCells.push(lastCell);
  return arrangedCells;
}

function chunkCells(cells: StatementCell[], size: number): StatementCell[][] {
  const paddedCells = [...cells];

  while (paddedCells.length % size !== 0) {
    paddedCells.push(blankCell());
  }

  const rows: StatementCell[][] = [];

  for (let index = 0; index < paddedCells.length; index += size) {
    rows.push(paddedCells.slice(index, index + size));
  }

  return rows;
}

function blankCell(): StatementCell {
  return {
    label: "",
    value: "",
  };
}

function valueCell(label: string, value: string | number | null | undefined): StatementCell {
  return {
    label,
    value: value === null || value === undefined || value === 0 ? "" : String(value),
  };
}

function amountCell(
  label: string,
  value: number | null | undefined,
  emphasis = false,
): StatementCell {
  return {
    label,
    value: value === null || value === undefined || value === 0 ? "" : formatAmount(value),
    emphasis,
  };
}

function nonZeroOrFallback(
  value: number | null | undefined,
  fallback: number | null | undefined,
): number | null {
  return value === null || value === undefined || value === 0 ? (fallback ?? null) : value;
}

function sumDisplayAmounts(values: Array<number | null | undefined>): number {
  return values.reduce<number>(
    (total, value) =>
      value === null || value === undefined || value === 0 ? total : total + value,
    0,
  );
}

function valueForCalculation(value: number | null | undefined): number {
  return value ?? 0;
}

async function fetchPayrollRecords(
  supabase: Awaited<ReturnType<typeof createClient>>,
  employeeId: Employee["id"],
) {
  return supabase
    .from("payroll_records")
    .select(
      "id, employee_id, payroll_month, attendance_days, holiday_attendance_days, paid_leave_days, absence_days, late_early_count, scheduled_work_hours, overtime_work_hours, holiday_work_hours, late_night_hours, late_early_hours, base_salary, overtime_pay, allowances, holiday_pay, late_night_pay, taxable_transportation_allowance, non_taxable_transportation_allowance, payment_total, transportation_expense, health_insurance, pension_insurance, employment_insurance, nursing_care_insurance, income_tax, resident_tax, child_care_support, other_deductions, total_deductions, social_insurance_total, taxable_amount, bank_transfer_amount, net_pay, created_at, updated_at",
    )
    .eq("employee_id", employeeId)
    .order("payroll_month", { ascending: false })
    .returns<PayrollRecord[]>();
}

function formatPayrollMonth(value: string): string {
  return value.slice(0, 7);
}

function formatPayrollMonthLabel(value: string): string {
  const [year, month] = formatPayrollMonth(value).split("-");
  return `${year}年${month}月`;
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat("ja-JP", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDisplayAmount(value: number | null | undefined): string {
  return value === null || value === undefined || value === 0 ? "" : formatAmount(value);
}
