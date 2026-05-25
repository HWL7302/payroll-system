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

export type WageLedgerColumn = {
  key: WageLedgerColumnKey;
  label: string;
};

export type WageLedgerRow = {
  id: string;
  payrollMonth: string;
  attendance: Record<WageLedgerAttendanceKey, number | null>;
  values: Record<WageLedgerColumnKey, number | null>;
};

export type WageLedgerEmployeeOption = {
  id: string;
  employeeCode: string;
  name: string;
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

const monthNumbers = Array.from({ length: 12 }, (_, index) => index + 1);

const attendanceItems: Array<{
  key: WageLedgerAttendanceKey;
  label: string;
}> = [
  { key: "attendanceDays", label: "出勤日数" },
  { key: "holidayAttendanceDays", label: "休日出勤日数" },
  { key: "paidLeaveDays", label: "有給日数" },
  { key: "absenceDays", label: "欠勤日数" },
  { key: "lateEarlyCount", label: "遅刻・早退回数" },
  { key: "scheduledWorkHours", label: "所定労働時間" },
  { key: "overtimeWorkHours", label: "時間外労働時間" },
  { key: "holidayWorkHours", label: "休日労働時間" },
  { key: "lateNightHours", label: "深夜時間" },
  { key: "lateEarlyHours", label: "遅刻・早退時間" },
];

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

export function WageLedgerClient({
  employees,
  yearOptions,
  selectedEmployeeId,
  selectedYear,
  columns,
  rows,
  totals,
}: WageLedgerClientProps) {
  const router = useRouter();
  const selectedEmployee = employees.find(
    (employee) => employee.id === selectedEmployeeId,
  );
  const columnMap = new Map(columns.map((column) => [column.key, column.label]));
  const sections = buildSections(columnMap);
  const rowByMonth = new Map(
    rows.map((row) => [Number(row.payrollMonth.slice(5, 7)), row]),
  );

  function handleConditionChange(next: {
    employeeId?: string;
    year?: string;
  }) {
    const params = new URLSearchParams({
      employeeId: next.employeeId ?? selectedEmployeeId,
      year: next.year ?? selectedYear,
    });

    router.push(`/admin/wage-ledger?${params.toString()}`);
  }

  function handleDownloadCsv() {
    const csv = buildCsv({
      columns,
      rows,
      totals,
    });
    const blob = new Blob([`\ufeff${csv}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const employeeCode = selectedEmployee?.employeeCode || "employee";

    link.href = url;
    link.download = `wage_ledger_${employeeCode}_${selectedYear}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="stack">
      <section className="panel">
        <div
          className="summary-row"
          style={{ alignItems: "flex-end", justifyContent: "space-between" }}
        >
          <div className="summary-row" style={{ margin: 0 }}>
            <label className="statement-month-field">
              <span>従業員</span>
              <select
                value={selectedEmployeeId}
                onChange={(event) =>
                  handleConditionChange({ employeeId: event.target.value })
                }
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
                onChange={(event) =>
                  handleConditionChange({ year: event.target.value })
                }
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
          <div className="summary-row" style={{ justifyContent: "flex-end", margin: 0 }}>
            <button
              className="button"
              type="button"
              onClick={handleDownloadCsv}
              disabled={rows.length === 0 || !selectedEmployee}
            >
              CSVダウンロード
            </button>
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>賃金台帳プレビュー</h2>
        {employees.length === 0 ? (
          <p>従業員が登録されていません。</p>
        ) : rows.length === 0 ? (
          <p>選択した条件の給与データはありません。</p>
        ) : (
          <div
            className="table-wrap"
            style={{
              maxWidth: "100%",
              overflowX: "auto",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <table style={ledgerTableStyle}>
              <thead>
                <tr>
                  <th style={sectionHeadStyle}>区分</th>
                  <th style={itemHeadStyle}>項目</th>
                  {monthNumbers.map((month) => (
                    <th key={month} style={monthHeadStyle}>
                      {month}月分
                    </th>
                  ))}
                  <th style={monthHeadStyle}>合計</th>
                </tr>
              </thead>
              <tbody>
                {sections.map((section) =>
                  section.items.map((item, itemIndex) => (
                    <tr key={`${section.title}-${item.label}`}>
                      {itemIndex === 0 ? (
                        <th rowSpan={section.items.length} style={sectionCellStyle}>
                          {section.title}
                        </th>
                      ) : null}
                      <th style={itemCellStyle}>{item.label}</th>
                      {monthNumbers.map((month) => {
                        const row = rowByMonth.get(month);

                        return (
                          <td key={month} style={valueCellStyle}>
                            {formatAmount(getItemValue(row, item))}
                          </td>
                        );
                      })}
                      <td style={totalCellStyle}>
                        {formatAmount(getTotalValue(totals, item))}
                      </td>
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

type LedgerItem =
  | {
      kind: "attendance";
      key: WageLedgerAttendanceKey;
      label: string;
    }
  | {
      kind: "amount";
      key: WageLedgerColumnKey;
      label: string;
    };

type LedgerSection = {
  title: string;
  items: LedgerItem[];
};

function buildSections(columnMap: Map<WageLedgerColumnKey, string>): LedgerSection[] {
  return [
    {
      title: "勤怠項目",
      items: attendanceItems.map((item) => ({
        kind: "attendance",
        ...item,
      })),
    },
    {
      title: "支給項目",
      items: paymentKeys.map((key) => ({
        kind: "amount",
        key,
        label: columnMap.get(key) ?? key,
      })),
    },
    {
      title: "控除項目",
      items: deductionKeys.map((key) => ({
        kind: "amount",
        key,
        label: columnMap.get(key) ?? key,
      })),
    },
    {
      title: "合計",
      items: totalKeys.map((key) => ({
        kind: "amount",
        key,
        label: columnMap.get(key) ?? key,
      })),
    },
  ];
}

function getItemValue(
  row: WageLedgerRow | undefined,
  item: LedgerItem,
): number | null | undefined {
  if (!row) {
    return null;
  }

  return item.kind === "attendance"
    ? row.attendance[item.key]
    : row.values[item.key];
}

function getTotalValue(totals: WageLedgerTotals, item: LedgerItem): number {
  return item.kind === "attendance"
    ? totals.attendance[item.key]
    : totals.values[item.key];
}

const ledgerTableStyle = {
  minWidth: 1480,
  width: "max-content",
  borderCollapse: "collapse",
  background: "rgba(255, 255, 255, 0.62)",
} satisfies CSSProperties;

const sectionHeadStyle = {
  width: 92,
  textAlign: "center",
} satisfies CSSProperties;

const itemHeadStyle = {
  width: 180,
  textAlign: "center",
} satisfies CSSProperties;

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

function buildCsv({
  columns,
  rows,
  totals,
}: Pick<WageLedgerClientProps, "columns" | "rows" | "totals">): string {
  const header = ["対象年月", ...columns.map((column) => column.label)];
  const body = rows.map((row) => [
    formatPayrollMonthLabel(row.payrollMonth),
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
  if (value === null || value === undefined || value === 0) {
    return "";
  }

  return new Intl.NumberFormat("ja-JP", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPayrollMonthLabel(value: string): string {
  const [year, month] = value.slice(0, 7).split("-");
  return `${year}年${month}月`;
}
