import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import type { Employee, PayrollRecord } from "@/lib/types";
import {
  WageLedgerClient,
  type WageLedgerAttendanceKey,
  type WageLedgerColumn,
  type WageLedgerColumnKey,
  type WageLedgerEmployeeOption,
  type WageLedgerRow,
} from "./WageLedgerClient";

type WageLedgerPageProps = {
  searchParams?: Promise<{
    employeeId?: string | string[];
    year?: string | string[];
  }>;
};

const ledgerColumns: WageLedgerColumn[] = [
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

export default async function WageLedgerPage({
  searchParams,
}: WageLedgerPageProps) {
  const params = await searchParams;
  const requestedEmployeeId = Array.isArray(params?.employeeId)
    ? params?.employeeId[0]
    : params?.employeeId;
  const requestedYear = Array.isArray(params?.year) ? params?.year[0] : params?.year;
  const supabase = await createClient();

  const { data: employeesData, error: employeesError } = await supabase
    .from("employees")
    .select(
      "id, employee_code, name, email, hire_date, resignation_date, status, role, auth_user_id, created_at, updated_at",
    )
    .order("employee_code", { ascending: true })
    .returns<Employee[]>();

  const employees = buildEmployeeOptions(employeesData ?? []);
  const selectedEmployeeId = chooseSelectedEmployeeId(
    employees,
    requestedEmployeeId,
  );
  const yearRowsResult = selectedEmployeeId
    ? await fetchPayrollYears(supabase, selectedEmployeeId)
    : { data: [], error: null };
  const yearOptions = buildYearOptions(
    ((yearRowsResult.data ?? []) as Pick<PayrollRecord, "payroll_month">[]).map(
      (row) => row.payroll_month,
    ),
  );
  const selectedYear = chooseSelectedYear(yearOptions, requestedYear);
  const recordsResult =
    selectedEmployeeId && selectedYear
      ? await fetchPayrollRecords(supabase, selectedEmployeeId, selectedYear)
      : { data: [], error: null };
  const rows = buildLedgerRows((recordsResult.data ?? []) as PayrollRecord[]);
  const totals = buildTotals(rows);
  const hasError = Boolean(
    employeesError || yearRowsResult.error || recordsResult.error,
  );

  return (
    <AppShell expectedRole="admin">
      <div className="page-header">
        <div>
          <h1>賃金台帳</h1>
        </div>
        <a className="button secondary" href="/admin">
          管理者トップへ
        </a>
      </div>

      {hasError ? (
        <div className="error">
          賃金台帳データを取得できませんでした。Supabase の設定を確認してください。
        </div>
      ) : (
        <WageLedgerClient
          employees={employees}
          yearOptions={yearOptions}
          selectedEmployeeId={selectedEmployeeId}
          selectedYear={selectedYear}
          columns={ledgerColumns}
          rows={rows}
          totals={totals}
        />
      )}
    </AppShell>
  );
}

async function fetchPayrollYears(
  supabase: Awaited<ReturnType<typeof createClient>>,
  employeeId: string,
) {
  return supabase
    .from("payroll_records")
    .select("payroll_month")
    .eq("employee_id", employeeId)
    .order("payroll_month", { ascending: false });
}

async function fetchPayrollRecords(
  supabase: Awaited<ReturnType<typeof createClient>>,
  employeeId: string,
  year: string,
) {
  const nextYear = String(Number(year) + 1);

  return supabase
    .from("payroll_records")
    .select(
      "id, employee_id, payroll_month, attendance_days, holiday_attendance_days, paid_leave_days, absence_days, late_early_count, scheduled_work_hours, overtime_work_hours, holiday_work_hours, late_night_hours, late_early_hours, base_salary, overtime_pay, allowances, holiday_pay, late_night_pay, taxable_transportation_allowance, non_taxable_transportation_allowance, payment_total, transportation_expense, health_insurance, pension_insurance, employment_insurance, nursing_care_insurance, income_tax, resident_tax, child_care_support, other_deductions, total_deductions, social_insurance_total, taxable_amount, bank_transfer_amount, net_pay, created_at, updated_at",
    )
    .eq("employee_id", employeeId)
    .gte("payroll_month", `${year}-01-01`)
    .lt("payroll_month", `${nextYear}-01-01`)
    .order("payroll_month", { ascending: true })
    .returns<PayrollRecord[]>();
}

function buildEmployeeOptions(employees: Employee[]): WageLedgerEmployeeOption[] {
  return employees.map((employee) => ({
    id: employee.id,
    employeeCode: employee.employee_code,
    name: employee.name,
  }));
}

function chooseSelectedEmployeeId(
  employees: WageLedgerEmployeeOption[],
  requestedEmployeeId: string | undefined,
): string {
  return employees.some((employee) => employee.id === requestedEmployeeId)
    ? requestedEmployeeId ?? ""
    : employees[0]?.id ?? "";
}

function buildYearOptions(months: string[]): string[] {
  const years = new Set(months.map((month) => month.slice(0, 4)));

  return [...years].sort((a, b) => b.localeCompare(a));
}

function chooseSelectedYear(
  options: string[],
  requestedYear: string | undefined,
): string {
  return requestedYear && options.includes(requestedYear)
    ? requestedYear
    : options[0] ?? String(new Date().getFullYear());
}

function buildLedgerRows(records: PayrollRecord[]): WageLedgerRow[] {
  return records.map((record) => ({
    id: record.id,
    payrollMonth: record.payroll_month,
    attendance: {
      attendanceDays: record.attendance_days,
      holidayAttendanceDays: record.holiday_attendance_days,
      paidLeaveDays: record.paid_leave_days,
      absenceDays: record.absence_days,
      lateEarlyCount: record.late_early_count,
      scheduledWorkHours: record.scheduled_work_hours,
      overtimeWorkHours: record.overtime_work_hours,
      holidayWorkHours: record.holiday_work_hours,
      lateNightHours: record.late_night_hours,
      lateEarlyHours: record.late_early_hours,
    },
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
  }));
}

function buildTotals(rows: WageLedgerRow[]): {
  attendance: Record<WageLedgerAttendanceKey, number>;
  values: Record<WageLedgerColumnKey, number>;
} {
  const attendanceKeys: WageLedgerAttendanceKey[] = [
    "attendanceDays",
    "holidayAttendanceDays",
    "paidLeaveDays",
    "absenceDays",
    "lateEarlyCount",
    "scheduledWorkHours",
    "overtimeWorkHours",
    "holidayWorkHours",
    "lateNightHours",
    "lateEarlyHours",
  ];

  return {
    attendance: attendanceKeys.reduce(
      (totals, key) => {
        totals[key] = rows.reduce(
          (total, row) => total + (row.attendance[key] ?? 0),
          0,
        );

        return totals;
      },
      {} as Record<WageLedgerAttendanceKey, number>,
    ),
    values: ledgerColumns.reduce(
      (totals, column) => {
        totals[column.key] = rows.reduce(
          (total, row) => total + (row.values[column.key] ?? 0),
          0,
        );

        return totals;
      },
      {} as Record<WageLedgerColumnKey, number>,
    ),
  };
}
