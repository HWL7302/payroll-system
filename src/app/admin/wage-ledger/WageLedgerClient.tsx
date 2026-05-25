"use client";

import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";

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
  values: Record<WageLedgerColumnKey, number | null>;
};

export type WageLedgerEmployeeOption = {
  id: string;
  employeeCode: string;
  name: string;
};

type WageLedgerClientProps = {
  employees: WageLedgerEmployeeOption[];
  yearOptions: string[];
  selectedEmployeeId: string;
  selectedYear: string;
  columns: WageLedgerColumn[];
  rows: WageLedgerRow[];
  totals: Record<WageLedgerColumnKey, number>;
};

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
            <table style={{ minWidth: "2600px", width: "max-content" }}>
              <thead>
                <tr>
                  <th>対象年月</th>
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
                    <td>{formatPayrollMonthLabel(row.payrollMonth)}</td>
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
}: Pick<WageLedgerClientProps, "columns" | "rows" | "totals">): string {
  const header = ["対象年月", ...columns.map((column) => column.label)];
  const body = rows.map((row) => [
    formatPayrollMonthLabel(row.payrollMonth),
    ...columns.map((column) => formatCsvNumber(row.values[column.key])),
  ]);
  const totalRow = [
    "合計",
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

function formatPayrollMonthLabel(value: string): string {
  const [year, month] = value.slice(0, 7).split("-");
  return `${year}年${month}月`;
}
