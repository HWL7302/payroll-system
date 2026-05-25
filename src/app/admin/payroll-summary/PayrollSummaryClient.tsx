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

export type PayrollSummaryColumn = {
  key: PayrollSummaryColumnKey;
  label: string;
};

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
  monthOptions: Array<{
    value: string;
    label: string;
  }>;
  selectedMonth: string;
  columns: PayrollSummaryColumn[];
  rows: PayrollSummaryRow[];
  totals: PayrollSummaryTotals;
};

const attendanceItems: Array<{
  key: PayrollSummaryAttendanceKey;
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

export function PayrollSummaryClient({
  monthOptions,
  selectedMonth,
  columns,
  rows,
  totals,
}: PayrollSummaryClientProps) {
  const router = useRouter();
  const columnMap = new Map(columns.map((column) => [column.key, column.label]));
  const sections = buildSections(columnMap);

  function handleMonthChange(month: string) {
    router.push(`/admin/payroll-summary?month=${encodeURIComponent(month)}`);
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
          <div className="summary-row" style={{ justifyContent: "flex-end", margin: 0 }}>
            <button
              className="button"
              type="button"
              onClick={handleDownloadCsv}
              disabled={rows.length === 0}
            >
              CSVダウンロード
            </button>
          </div>
        </div>
      </section>

      <section className="panel">
        <h2>集計表プレビュー</h2>
        {monthOptions.length === 0 ? (
          <p>集計できる給与データはまだありません。</p>
        ) : rows.length === 0 ? (
          <p>選択した対象年月の給与データはありません。</p>
        ) : (
          <div className="stack">
            {rows.map((row) => (
              <article key={row.id} style={summaryCardStyle}>
                <div style={summaryCardHeaderStyle}>
                  <strong>{row.employeeCode}</strong>
                  <span>{row.employeeName}</span>
                </div>
                <ReportTable
                  sections={sections}
                  getValue={(item) =>
                    item.kind === "attendance"
                      ? row.attendance[item.key]
                      : row.values[item.key]
                  }
                />
              </article>
            ))}
            <article style={summaryCardStyle}>
              <div style={summaryCardHeaderStyle}>
                <strong>会社合計</strong>
                <span>{rows.length}名</span>
              </div>
              <ReportTable
                sections={sections}
                getValue={(item) =>
                  item.kind === "attendance"
                    ? totals.attendance[item.key]
                    : totals.values[item.key]
                }
              />
            </article>
          </div>
        )}
      </section>
    </div>
  );
}

type ReportItem =
  | {
      kind: "attendance";
      key: PayrollSummaryAttendanceKey;
      label: string;
    }
  | {
      kind: "amount";
      key: PayrollSummaryColumnKey;
      label: string;
    };

type ReportSection = {
  title: string;
  items: ReportItem[];
};

function ReportTable({
  sections,
  getValue,
}: {
  sections: ReportSection[];
  getValue: (item: ReportItem) => number | null | undefined;
}) {
  return (
    <div style={{ maxWidth: "100%", overflowX: "auto" }}>
      <table style={reportTableStyle}>
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
                <td style={valueCellStyle}>{formatAmount(getValue(item))}</td>
              </tr>
            )),
          )}
        </tbody>
      </table>
    </div>
  );
}

function buildSections(columnMap: Map<PayrollSummaryColumnKey, string>): ReportSection[] {
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

const summaryCardStyle = {
  overflow: "hidden",
  border: "1px solid var(--line)",
  borderRadius: 8,
  background: "rgba(255, 255, 255, 0.52)",
} satisfies CSSProperties;

const summaryCardHeaderStyle = {
  display: "flex",
  gap: 16,
  alignItems: "center",
  padding: "12px 16px",
  borderBottom: "1px solid var(--line)",
  background: "var(--table-head-gradient)",
  fontWeight: 800,
} satisfies CSSProperties;

const reportTableStyle = {
  width: "100%",
  minWidth: 560,
  borderCollapse: "collapse",
  background: "rgba(255, 255, 255, 0.62)",
} satisfies CSSProperties;

const sectionCellStyle = {
  width: 96,
  borderRight: "1px solid var(--line)",
  borderBottom: "1px solid var(--line)",
  background: "var(--section-bg)",
  textAlign: "center",
  verticalAlign: "middle",
  fontWeight: 800,
} satisfies CSSProperties;

const itemCellStyle = {
  width: "48%",
  borderRight: "1px solid var(--line)",
  borderBottom: "1px solid var(--line)",
  background: "rgba(255, 255, 255, 0.54)",
  fontWeight: 800,
} satisfies CSSProperties;

const valueCellStyle = {
  borderBottom: "1px solid var(--line)",
  textAlign: "right",
  whiteSpace: "nowrap",
  fontWeight: 700,
} satisfies CSSProperties;

function buildCsv({
  columns,
  rows,
  totals,
}: Pick<PayrollSummaryClientProps, "columns" | "rows" | "totals">): string {
  const header = ["社員番号", "氏名", ...columns.map((column) => column.label)];
  const body = rows.map((row) => [
    row.employeeCode,
    row.employeeName,
    ...columns.map((column) => formatCsvNumber(row.values[column.key])),
  ]);
  const totalRow = [
    "合計",
    `${rows.length}名`,
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
