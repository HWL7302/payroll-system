import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import type { Employee, PayrollRecord } from "@/lib/types";
import {
  PayrollSummaryClient,
  type PayrollSummaryColumn,
  type PayrollSummaryColumnKey,
  type PayrollSummaryRow,
} from "./PayrollSummaryClient";

type PayrollSummaryPageProps = {
  searchParams?: Promise<{
    month?: string | string[];
  }>;
};

const summaryColumns: PayrollSummaryColumn[] = [
  { key: "baseSalary", label: "基本給" },
  { key: "overtimePay", label: "普通残業手当" },
  { key: "holidayPay", label: "休日手当" },
  { key: "lateNightPay", label: "深夜手当" },
  { key: "taxableTransportationAllowance", label: "課税通勤手当" },
  { key: "nonTaxableTransportationAllowance", label: "非課税通勤手当" },
  { key: "paymentTotal", label: "支給額合計" },
  { key: "healthInsurance", label: "健康保険" },
  { key: "pensionInsurance", label: "厚生年金" },
  { key: "employmentInsurance", label: "雇用保険" },
  { key: "nursingCareInsurance", label: "介護保険" },
  { key: "otherDeductions", label: "その他控除" },
  { key: "incomeTax", label: "所得税" },
  { key: "residentTax", label: "住民税" },
  { key: "childCareSupport", label: "子ども・子育て支援金" },
  { key: "totalDeductions", label: "控除額合計" },
  { key: "socialInsuranceTotal", label: "社会保険合計" },
  { key: "taxableAmount", label: "課税対象額" },
  { key: "netPay", label: "差引支給額" },
  { key: "bankTransferAmount", label: "振込支給額" },
];

export default async function PayrollSummaryPage({
  searchParams,
}: PayrollSummaryPageProps) {
  const params = await searchParams;
  const requestedMonth = Array.isArray(params?.month)
    ? params?.month[0]
    : params?.month;
  const supabase = await createClient();

  const { data: monthRows, error: monthError } = await supabase
    .from("payroll_records")
    .select("payroll_month")
    .order("payroll_month", { ascending: false });

  const monthOptions = buildMonthOptions(
    ((monthRows ?? []) as Pick<PayrollRecord, "payroll_month">[]).map(
      (row) => row.payroll_month,
    ),
  );
  const selectedMonth = chooseSelectedMonth(monthOptions, requestedMonth);
  const recordsResult = selectedMonth
    ? await fetchPayrollRecords(supabase, selectedMonth)
    : { data: [], error: null };
  const records = (recordsResult.data ?? []) as PayrollRecord[];
  const employeesResult =
    records.length > 0
      ? await fetchEmployees(
          supabase,
          records.map((record) => record.employee_id),
        )
      : { data: [], error: null };
  const employeeMap = new Map(
    ((employeesResult.data ?? []) as Employee[]).map((employee) => [
      employee.id,
      employee,
    ]),
  );
  const summaryRows = buildSummaryRows(records, employeeMap);
  const totals = buildTotals(summaryRows);
  const hasError = Boolean(monthError || recordsResult.error || employeesResult.error);

  return (
    <AppShell expectedRole="admin">
      <div className="page-header">
        <div>
          <p className="eyebrow">Admin / Payroll Summary</p>
          <h1>給与集計表</h1>
          <p className="lead">
            対象年月ごとに全従業員の給与データを一覧・集計します。
          </p>
        </div>
        <a className="button secondary" href="/admin">
          管理者トップへ
        </a>
      </div>

      {hasError ? (
        <div className="error">
          給与集計データを取得できませんでした。Supabase の設定を確認してください。
        </div>
      ) : (
        <PayrollSummaryClient
          monthOptions={monthOptions}
          selectedMonth={selectedMonth}
          columns={summaryColumns}
          rows={summaryRows}
          totals={totals}
        />
      )}
    </AppShell>
  );
}

async function fetchPayrollRecords(
  supabase: Awaited<ReturnType<typeof createClient>>,
  selectedMonth: string,
) {
  return supabase
    .from("payroll_records")
    .select(
      "id, employee_id, payroll_month, attendance_days, holiday_attendance_days, paid_leave_days, absence_days, late_early_count, scheduled_work_hours, overtime_work_hours, holiday_work_hours, late_night_hours, late_early_hours, base_salary, overtime_pay, allowances, holiday_pay, late_night_pay, taxable_transportation_allowance, non_taxable_transportation_allowance, payment_total, transportation_expense, health_insurance, pension_insurance, employment_insurance, nursing_care_insurance, income_tax, resident_tax, child_care_support, other_deductions, total_deductions, social_insurance_total, taxable_amount, bank_transfer_amount, net_pay, created_at, updated_at",
    )
    .eq("payroll_month", `${selectedMonth}-01`)
    .returns<PayrollRecord[]>();
}

async function fetchEmployees(
  supabase: Awaited<ReturnType<typeof createClient>>,
  employeeIds: string[],
) {
  return supabase
    .from("employees")
    .select(
      "id, employee_code, name, email, hire_date, resignation_date, status, role, auth_user_id, created_at, updated_at",
    )
    .in("id", [...new Set(employeeIds)])
    .returns<Employee[]>();
}

function buildSummaryRows(
  records: PayrollRecord[],
  employeeMap: Map<Employee["id"], Employee>,
): PayrollSummaryRow[] {
  return records
    .map((record) => {
      const employee = employeeMap.get(record.employee_id);

      return {
        id: record.id,
        employeeCode: employee?.employee_code ?? "",
        employeeName: employee?.name ?? "",
        values: {
          baseSalary: record.base_salary,
          overtimePay: record.overtime_pay,
          holidayPay: record.holiday_pay,
          lateNightPay: record.late_night_pay,
          taxableTransportationAllowance: record.taxable_transportation_allowance,
          nonTaxableTransportationAllowance:
            record.non_taxable_transportation_allowance ??
            record.transportation_expense,
          paymentTotal: record.payment_total,
          healthInsurance: record.health_insurance,
          pensionInsurance: record.pension_insurance,
          employmentInsurance: record.employment_insurance,
          nursingCareInsurance: record.nursing_care_insurance,
          otherDeductions: record.other_deductions,
          incomeTax: record.income_tax,
          residentTax: record.resident_tax,
          childCareSupport: record.child_care_support,
          totalDeductions: record.total_deductions,
          socialInsuranceTotal: record.social_insurance_total,
          taxableAmount: record.taxable_amount,
          netPay: record.net_pay,
          bankTransferAmount: record.bank_transfer_amount,
        },
      };
    })
    .sort((a, b) =>
      a.employeeCode.localeCompare(b.employeeCode, "ja-JP", { numeric: true }),
    );
}

function buildTotals(
  rows: PayrollSummaryRow[],
): Record<PayrollSummaryColumnKey, number> {
  return summaryColumns.reduce(
    (totals, column) => {
      totals[column.key] = rows.reduce(
        (total, row) => total + (row.values[column.key] ?? 0),
        0,
      );

      return totals;
    },
    {} as Record<PayrollSummaryColumnKey, number>,
  );
}

function buildMonthOptions(months: string[]) {
  const monthMap = new Map<string, string>();

  for (const month of months) {
    const value = formatPayrollMonth(month);
    monthMap.set(value, formatPayrollMonthLabel(month));
  }

  return [...monthMap.entries()].map(([value, label]) => ({
    value,
    label,
  }));
}

function chooseSelectedMonth(
  options: Array<{ value: string; label: string }>,
  requestedMonth: string | undefined,
): string {
  const normalizedMonth = requestedMonth?.slice(0, 7);
  const requestedOption = options.find((option) => option.value === normalizedMonth);

  return requestedOption?.value ?? options[0]?.value ?? "";
}

function formatPayrollMonth(value: string): string {
  return value.slice(0, 7);
}

function formatPayrollMonthLabel(value: string): string {
  const [year, month] = formatPayrollMonth(value).split("-");
  return `${year}年${month}月`;
}
