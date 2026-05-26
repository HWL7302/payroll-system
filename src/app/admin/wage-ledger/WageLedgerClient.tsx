"use client";

import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";

export type WageLedgerAttendanceKey =
  | "attendanceDays"
  | "holidayAttendanceDays"
  | "paidLeaveDays"
  | "absenceDays"
  | "lateEarlyCount"
  | "scheduledWorkHours"
  | "overtimeWorkHours"
  | "holidayWorkHours"
  | "lateNightHours"
  | "lateEarlyHours";

export type WageLedgerColumnKey =
  | "baseSalary"
  | "overtimePay"
  | "holidayPay"
  | "lateNightPay"
  | "taxableTransportationAllowance"
  | "nonTaxableTransportationAllowance"
  | "paymentTotal"
  | "healthInsurance"
  | "pensionInsurance"
  | "employmentInsurance"
  | "nursingCareInsurance"
  | "otherDeductions"
  | "incomeTax"
  | "residentTax"
  | "childCareSupport"
  | "totalDeductions"
  | "socialInsuranceTotal"
  | "taxableAmount"
  | "netPay"
  | "bankTransferAmount";

export type WageLedgerColumn = { key: WageLedgerColumnKey; label: string };
export type WageLedgerEmployeeOption = {
  id: string;
  employeeCode: string;
  name: string;
};
export type WageLedgerRow = {
  id: string;
  payrollMonth: string;
  attendance: Record<WageLedgerAttendanceKey, number | null>;
  values: Record<WageLedgerColumnKey, number | null>;
};

type WageLedgerTotals = {
  attendance: Record<WageLedgerAttendanceKey, number>;
  values: Record<WageLedgerColumnKey, number>;
};

type WageLedgerClientProps = {
  employees: WageLedgerEmployeeOption[];
  yearOptions: string[];
  selectedEmployeeId: string;
  selectedYear: string;
  columns: WageLedgerColumn[];
  rows: WageLedgerRow[];
  totals: WageLedgerTotals;
};

type LedgerItem =
  | { kind: "attendance"; key: WageLedgerAttendanceKey; label: string }
  | { kind: "amount"; key: WageLedgerColumnKey; label: string };

const months = Array.from({ length: 12 }, (_, index) => index + 1);
const attendanceItems: LedgerItem[] = [
  ["attendanceDays", "出勤日数"],
  ["holidayAttendanceDays", "休日出勤日数"],
  ["paidLeaveDays", "有給日数"],
  ["absenceDays", "欠勤日数"],
  ["lateEarlyCount", "遅刻・早退回数"],
  ["scheduledWorkHours", "所定労働時間"],
  ["overtimeWorkHours", "時間外労働時間"],
  ["holidayWorkHours", "休日労働時間"],
  ["lateNightHours", "深夜時間"],
  ["lateEarlyHours", "遅刻・早退時間"],
].map(([key, label]) => ({ kind: "attendance", key, label }) as LedgerItem);
const paymentKeys: WageLedgerColumnKey[] = [
  "baseSalary",
  "overtimePay",
  "holidayPay",
  "lateNightPay",
  "taxableTransportationAllowance",
  "nonTaxableTransportationAllowance",
  "paymentTotal",
];
const deductionKeys: WageLedgerColumnKey[] = [
  "healthInsurance",
  "pensionInsurance",
  "employmentInsurance",
  "nursingCareInsurance",
  "otherDeductions",
  "incomeTax",
  "residentTax",
  "childCareSupport",
  "totalDeductions",
];
const totalKeys: WageLedgerColumnKey[] = [
  "socialInsuranceTotal",
  "taxableAmount",
  "netPay",
  "bankTransferAmount",
];

export function WageLedgerClient(props: WageLedgerClientProps) {
  const {
    employees,
    yearOptions,
    selectedEmployeeId,
    selectedYear,
    columns,
    rows,
    totals,
  } = props;
  const router = useRouter();
  const selectedEmployee = employees.find((employee) => employee.id === selectedEmployeeId);
  const labels = new Map(columns.map((column) => [column.key, column.label]));
  const rowByMonth = new Map(rows.map((row) => [Number(row.payrollMonth.slice(5, 7)), row]));
  const sections = [
    section("支給項目", paymentKeys, labels),
    section("控除項目", deductionKeys, labels),
    section("合計", totalKeys, labels),
    { title: "勤怠項目", items: attendanceItems },
  ];

  function move(next: { employeeId?: string; year?: string }) {
    const params = new URLSearchParams({
      employeeId: next.employeeId ?? selectedEmployeeId,
      year: next.year ?? selectedYear,
    });
    router.push(`/admin/wage-ledger?${params.toString()}`);
  }

  function downloadCsv() {
    const csv = buildCsv(props);
    const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `wage_ledger_${selectedEmployee?.employeeCode || "employee"}_${selectedYear}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="stack wage-ledger-page">
      <style>{`
        .main:has(.wage-ledger-page) {
          width: min(1500px, calc(100% - 24px));
          margin: 24px auto;
        }
        @media (max-width: 720px) {
          .main:has(.wage-ledger-page) {
            width: min(100% - 16px, 1500px);
            margin: 16px auto;
          }
        }
      `}</style>
      <section className="panel">
        <div className="summary-row" style={toolbarStyle}>
          <div className="summary-row" style={{ margin: 0 }}>
            <label className="statement-month-field">
              <span>従業員</span>
              <select
                value={selectedEmployeeId}
                onChange={(event) => move({ employeeId: event.target.value })}
                disabled={employees.length === 0}
              >
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.employeeCode} {employee.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="statement-month-field">
              <span>年度</span>
              <select
                value={selectedYear}
                onChange={(event) => move({ year: event.target.value })}
                disabled={yearOptions.length === 0}
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}年
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button
            className="button"
            type="button"
            onClick={downloadCsv}
            disabled={rows.length === 0 || !selectedEmployee}
          >
            CSVダウンロード
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>賃金台帳プレビュー</h2>
        {employees.length === 0 ? (
          <p>従業員が登録されていません。</p>
        ) : rows.length === 0 ? (
          <p>選択した条件の給与データはありません。</p>
        ) : (
          <div className="table-wrap" style={scrollStyle}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={sectionHeadStyle}>区分</th>
                  <th style={itemHeadStyle}>項目</th>
                  {months.map((month) => (
                    <th key={month} style={monthHeadStyle}>
                      {month}月分
                    </th>
                  ))}
                  <th style={monthHeadStyle}>合計</th>
                </tr>
              </thead>
              <tbody>
                {sections.map((group) =>
                  group.items.map((item, index) => (
                    <tr key={`${group.title}-${item.label}`}>
                      {index === 0 ? (
                        <th rowSpan={group.items.length} style={sectionCellStyle}>
                          {group.title}
                        </th>
                      ) : null}
                      <th style={itemCellStyle}>{item.label}</th>
                      {months.map((month) => (
                        <td key={month} style={valueCellStyle}>
                          {formatAmount(valueFor(rowByMonth.get(month), item))}
                        </td>
                      ))}
                      <td style={totalCellStyle}>{formatAmount(totalFor(totals, item))}</td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function section(
  title: string,
  keys: WageLedgerColumnKey[],
  labels: Map<WageLedgerColumnKey, string>,
) {
  return {
    title,
    items: keys.map((key) => ({
      kind: "amount" as const,
      key,
      label: labels.get(key) ?? key,
    })),
  };
}

function valueFor(row: WageLedgerRow | undefined, item: LedgerItem) {
  if (!row) return null;
  return item.kind === "attendance" ? row.attendance[item.key] : row.values[item.key];
}

function totalFor(totals: WageLedgerTotals, item: LedgerItem) {
  return item.kind === "attendance" ? totals.attendance[item.key] : totals.values[item.key];
}

const toolbarStyle = {
  alignItems: "flex-end",
  justifyContent: "space-between",
  maxWidth: 1120,
  margin: "0 auto",
} satisfies CSSProperties;
const scrollStyle = {
  maxWidth: "100%",
  overflowX: "auto",
  WebkitOverflowScrolling: "touch",
} satisfies CSSProperties;
const tableStyle = {
  minWidth: 1480,
  width: "max-content",
  borderCollapse: "collapse",
  background: "rgba(255, 255, 255, 0.62)",
} satisfies CSSProperties;
const sectionHeadStyle = { width: 92, textAlign: "center" } satisfies CSSProperties;
const itemHeadStyle = { width: 180, textAlign: "center" } satisfies CSSProperties;
const monthHeadStyle = {
  minWidth: 88,
  textAlign: "center",
  whiteSpace: "nowrap",
} satisfies CSSProperties;
const sectionCellStyle = {
  borderRight: "1px solid var(--line)",
  background: "var(--section-bg)",
  textAlign: "center",
  verticalAlign: "middle",
  fontWeight: 800,
} satisfies CSSProperties;
const itemCellStyle = {
  borderRight: "1px solid var(--line)",
  background: "rgba(255, 255, 255, 0.54)",
  fontWeight: 800,
  whiteSpace: "nowrap",
} satisfies CSSProperties;
const valueCellStyle = {
  minWidth: 88,
  textAlign: "right",
  whiteSpace: "nowrap",
} satisfies CSSProperties;
const totalCellStyle = {
  ...valueCellStyle,
  background: "#f8fafc",
  fontWeight: 800,
} satisfies CSSProperties;

function buildCsv({ columns, rows, totals }: WageLedgerClientProps): string {
  const header = ["対象年月", ...columns.map((column) => column.label)];
  const body = rows.map((row) => [
    formatMonth(row.payrollMonth),
    ...columns.map((column) => formatCsvNumber(row.values[column.key])),
  ]);
  const totalRow = [
    "合計",
    ...columns.map((column) => formatCsvNumber(totals.values[column.key])),
  ];

  return [header, ...body, totalRow]
    .map((line) => line.map(escapeCsvValue).join(","))
    .join("\r\n");
}

function escapeCsvValue(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function formatCsvNumber(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}

function formatAmount(value: number | null | undefined): string {
  if (value === null || value === undefined || value === 0) return "";
  return new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 0 }).format(value);
}

function formatMonth(value: string): string {
  const [year, month] = value.slice(0, 7).split("-");
  return `${year}年${month}月`;
}
