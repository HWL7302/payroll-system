"use client";

import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";

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
  values: Record<PayrollSummaryColumnKey, number | null>;
};

type PayrollSummaryClientProps = {
  monthOptions: Array<{
    value: string;
    label: string;
  }>;
  selectedMonth: string;
  columns: PayrollSummaryColumn[];
  rows: PayrollSummaryRow[];
  totals: Record<PayrollSummaryColumnKey, number>;
};

export function PayrollSummaryClient({
  monthOptions,
  selectedMonth,
  columns,
  rows,
  totals,
}: PayrollSummaryClientProps) {
  const router = useRouter();

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
          <div
            className="table-wrap"
            style={{
              maxWidth: "100%",
              overflowX: "auto",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <table style={{ minWidth: "2600px", width: "max-content" }}>
              <thead>
                <tr>
                  <th>社員番号</th>
                  <th>氏名</th>
                  {columns.map((column) => (
                    <th key={column.key} style={numericCellStyle}>
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.employeeCode}</td>
                    <td>{row.employeeName}</td>
                    {columns.map((column) => (
                      <td key={column.key} style={numericCellStyle}>
                        {formatAmount(row.values[column.key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td style={totalCellStyle}>合計</td>
                  <td style={totalCellStyle}>{rows.length}名</td>
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      style={{ ...numericCellStyle, ...totalCellStyle }}
                    >
                      {formatAmount(totals[column.key])}
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

const numericCellStyle = {
  textAlign: "right",
  whiteSpace: "nowrap",
} satisfies CSSProperties;

const totalCellStyle = {
  background: "#f8fafc",
  fontWeight: 800,
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
    ...columns.map((column) => formatCsvNumber(totals[column.key])),
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
  if (value === null || value === undefined) {
    return "";
  }

  return new Intl.NumberFormat("ja-JP", {
    maximumFractionDigits: 0,
  }).format(value);
}
