"use client";

import { useActionState } from "react";
import { importPayrollWorkbook, type PayrollImportState } from "./actions";

const initialState: PayrollImportState = {
  totalRows: 0,
  savedRows: 0,
  duplicateRows: 0,
  errorRows: 0,
  rows: [],
};

export function PayrollImportForm() {
  const [state, formAction, isPending] = useActionState(
    importPayrollWorkbook,
    initialState,
  );

  return (
    <div className="stack">
      <section className="panel">
        <h2>テンプレート</h2>
        <p>
          専用テンプレートに確定済みの給与明細数値を貼り付けてアップロードしてください。
        </p>
        <a className="button secondary" href="/payroll_import_template.xlsx" download>
          テンプレートをダウンロード
        </a>
      </section>

      <section className="panel">
        <h2>Excelアップロード</h2>
        <form className="form" action={formAction}>
          <div className="field">
            <label htmlFor="file">給与インポートテンプレート.xlsx</label>
            <input id="file" name="file" type="file" accept=".xlsx" required />
          </div>
          {state.error ? <div className="error">{state.error}</div> : null}
          <button className="button" type="submit" disabled={isPending}>
            {isPending ? "取込中..." : "アップロードして取込"}
          </button>
        </form>
      </section>

      {state.rows.length > 0 ? (
        <section className="panel">
          <h2>取込プレビュー</h2>
          <div className="summary-row">
            <span className="status-pill">読込 {state.totalRows} 件</span>
            <span className="status-pill">保存 {state.savedRows} 件</span>
            <span className="status-pill warning">既存 {state.duplicateRows} 件</span>
            <span className="status-pill danger">エラー {state.errorRows} 件</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>行</th>
                  <th>状態</th>
                  <th>社員番号</th>
                  <th>氏名</th>
                  <th>対象年月</th>
                  <th>基本給</th>
                  <th>普通残業手当</th>
                  <th>非課税通勤手当</th>
                  <th>健康保険</th>
                  <th>厚生年金</th>
                  <th>雇用保険</th>
                  <th>その他控除</th>
                  <th>所得税</th>
                  <th>住民税</th>
                  <th>控除額合計</th>
                  <th>差引支給額</th>
                  <th>振込支給額</th>
                  <th>メッセージ</th>
                </tr>
              </thead>
              <tbody>
                {state.rows.map((row) => (
                  <tr key={row.rowNumber}>
                    <td>{row.rowNumber}</td>
                    <td>{formatStatus(row.status)}</td>
                    <td>{row.employeeCode}</td>
                    <td>{row.employeeName ?? "-"}</td>
                    <td>{row.payrollMonth}</td>
                    <td>{formatNumber(row.baseSalary)}</td>
                    <td>{formatNumber(row.overtimePay)}</td>
                    <td>{formatNumber(row.nonTaxableTransportationAllowance)}</td>
                    <td>{formatNumber(row.healthInsurance)}</td>
                    <td>{formatNumber(row.pensionInsurance)}</td>
                    <td>{formatNumber(row.employmentInsurance)}</td>
                    <td>{formatNumber(row.otherDeductions)}</td>
                    <td>{formatNumber(row.incomeTax)}</td>
                    <td>{formatNumber(row.residentTax)}</td>
                    <td>{formatNumber(row.totalDeductions)}</td>
                    <td>{formatNumber(row.netPay)}</td>
                    <td>{formatNumber(row.bankTransferAmount)}</td>
                    <td>{row.errors.join(" / ") || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function formatStatus(status: PayrollImportState["rows"][number]["status"]): string {
  const labels = {
    ready: "保存待ち",
    saved: "保存済み",
    duplicate: "既存データあり",
    error: "エラー",
  };

  return labels[status];
}

function formatNumber(value: number | null): string {
  if (value === null || value === 0) {
    return "";
  }

  return new Intl.NumberFormat("ja-JP").format(value);
}
