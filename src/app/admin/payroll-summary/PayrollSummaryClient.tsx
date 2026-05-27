"use client";

import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";

export type PayrollSummaryAttendanceKey =
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

export type PayrollSummaryColumnKey =
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

export type PayrollSummaryColumn = { key: PayrollSummaryColumnKey; label: string };
export type PayrollSummaryRow = {
  id: string;
  employeeCode: string;
  employeeName: string;
  attendance: Record<PayrollSummaryAttendanceKey, number | null>;
  values: Record<PayrollSummaryColumnKey, number | null>;
};

type PayrollSummaryTotals = {
  attendance: Record<PayrollSummaryAttendanceKey, number>;
  values: Record<PayrollSummaryColumnKey, number>;
};

type PayrollSummaryClientProps = {
  monthOptions: Array<{ value: string; label: string }>;
  selectedMonth: string;
  columns: PayrollSummaryColumn[];
  rows: PayrollSummaryRow[];
  totals: PayrollSummaryTotals;
};

type SummaryItem =
  | { kind: "attendance"; key: PayrollSummaryAttendanceKey; label: string }
  | { kind: "amount"; key: PayrollSummaryColumnKey; label: string };

const attendanceItems: SummaryItem[] = [
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
].map(([key, label]) => ({ kind: "attendance", key, label }) as SummaryItem);
const paymentKeys: PayrollSummaryColumnKey[] = [
  "baseSalary",
  "overtimePay",
  "holidayPay",
  "lateNightPay",
  "taxableTransportationAllowance",
  "nonTaxableTransportationAllowance",
  "paymentTotal",
];
const deductionKeys: PayrollSummaryColumnKey[] = [
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
const totalKeys: PayrollSummaryColumnKey[] = [
  "socialInsuranceTotal",
  "taxableAmount",
  "netPay",
  "bankTransferAmount",
];

export function PayrollSummaryClient(props: PayrollSummaryClientProps) {
  const { monthOptions, selectedMonth, columns, rows, totals } = props;
  const router = useRouter();
  const labels = new Map(columns.map((column) => [column.key, column.label]));
  const sections = [
    section("支給項目", paymentKeys, labels),
    section("控除項目", deductionKeys, labels),
    section("合計", totalKeys, labels),
    { title: "勤怠項目", items: attendanceItems },
  ];

  function handleMonthChange(month: string) {
    router.push(`/admin/payroll-summary?month=${encodeURIComponent(month)}`);
  }

  function handleDownloadCsv() {
    const csv = buildCsv({ rows, totals, sections });
    const blob = new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `payroll_summary_${selectedMonth}.csv`;
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
          <label className="statement-month-field">
            <span>対象年月</span>
            <select
              value={selectedMonth}
              onChange={(event) => handleMonthChange(event.target.value)}
              disabled={monthOptions.length === 0}
            >
              {monthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button
            className="button"
            type="button"
            onClick={handleDownloadCsv}
            disabled={rows.length === 0}
          >
            CSVダウンロード
          </button>
        </div>
      </section>

      <section className="panel">
        <h2>集計表プレビュー</h2>
        {monthOptions.length === 0 ? (
          <p>集計できる給与データはまだありません。</p>
        ) : rows.length === 0 ? (
          <p>選択した対象年月の給与データはありません。</p>
        ) : (
          <div className="table-wrap" style={scrollStyle}>
            <table style={getTableStyle(rows.length)}>
              <colgroup>
                <col style={sectionColStyle} />
                <col style={itemColStyle} />
                {rows.map((row) => (
                  <col key={row.id} style={getEmployeeColStyle(rows.length)} />
                ))}
                <col style={totalColStyle} />
              </colgroup>
              <thead>
                <tr>
                  <th style={sectionHeadStyle}>区分</th>
                  <th style={itemHeadStyle}>項目</th>
                  {rows.map((row) => (
                    <th key={row.id} style={employeeHeadStyle}>
                      {row.employeeName || row.employeeCode}
                    </th>
                  ))}
                  <th style={totalHeadStyle}>合計</th>
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
                      {rows.map((row) => (
                        <td key={row.id} style={valueCellStyle}>
                          {formatAmount(valueFor(row, item))}
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
  keys: PayrollSummaryColumnKey[],
  labels: Map<PayrollSummaryColumnKey, string>,
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

function valueFor(row: PayrollSummaryRow, item: SummaryItem) {
  return item.kind === "attendance" ? row.attendance[item.key] : row.values[item.key];
}

function totalFor(totals: PayrollSummaryTotals, item: SummaryItem) {
  return item.kind === "attendance" ? totals.attendance[item.key] : totals.values[item.key];
}

const scrollStyle = {
  maxWidth: "100%",
  overflowX: "auto",
  WebkitOverflowScrolling: "touch",
} satisfies CSSProperties;
const tableStyle = {
  minWidth: 760,
  width: "100%",
  borderCollapse: "collapse",
  background: "rgba(255, 255, 255, 0.62)",
} satisfies CSSProperties;
const sectionColStyle = { width: 92 } satisfies CSSProperties;
const itemColStyle = { width: 180 } satisfies CSSProperties;
const totalColStyle = { width: 120 } satisfies CSSProperties;
const sectionHeadStyle = { width: 92, textAlign: "center" } satisfies CSSProperties;
const itemHeadStyle = { width: 180, textAlign: "center" } satisfies CSSProperties;
const employeeHeadStyle = {
  minWidth: 120,
  borderLeft: "1px solid var(--line)",
  textAlign: "center",
  whiteSpace: "nowrap",
} satisfies CSSProperties;
const totalHeadStyle = {
  ...employeeHeadStyle,
  borderLeft: "1px solid var(--line)",
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
  minWidth: 120,
  borderLeft: "1px solid var(--line)",
  textAlign: "right",
  whiteSpace: "nowrap",
} satisfies CSSProperties;
const totalCellStyle = {
  ...valueCellStyle,
  background: "rgba(248, 250, 252, 0.95)",
  borderLeft: "1px solid var(--line)",
  fontWeight: 800,
} satisfies CSSProperties;

function getTableStyle(employeeCount: number): CSSProperties {
  if (employeeCount >= 6) {
    return {
      ...tableStyle,
      minWidth: 92 + 180 + employeeCount * 120 + 120,
      width: "max-content",
    };
  }

  return tableStyle;
}

function getEmployeeColStyle(employeeCount: number): CSSProperties {
  if (employeeCount >= 6) {
    return { width: 120 };
  }

  return { width: `${100 / Math.max(employeeCount, 1)}%` };
}

function buildCsv({
  rows,
  totals,
  sections,
}: {
  rows: PayrollSummaryRow[];
  totals: PayrollSummaryTotals;
  sections: Array<{ title: string; items: SummaryItem[] }>;
}): string {
  const header = ["項目名", ...rows.map((row) => row.employeeName || row.employeeCode), "合計"];
  const body = sections.flatMap((group) =>
    group.items.map((item) => [
      item.label,
      ...rows.map((row) => formatCsvNumber(valueFor(row, item))),
      formatCsvNumber(totalFor(totals, item)),
    ]),
  );

  return [header, ...body]
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
