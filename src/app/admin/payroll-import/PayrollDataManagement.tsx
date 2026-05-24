import { createClient } from "@/lib/supabase/server";
import { PayrollRecordDeleteButton } from "./PayrollRecordDeleteButton";

type PayrollDataManagementProps = {
  selectedMonth?: string;
};

type PayrollRecordRow = {
  id: string;
  payroll_month: string;
  created_at: string;
  employees:
    | {
        employee_code: string;
        name: string;
      }
    | {
        employee_code: string;
        name: string;
      }[]
    | null;
};

type MonthSummary = {
  month: string;
  count: number;
};

export async function PayrollDataManagement({
  selectedMonth,
}: PayrollDataManagementProps) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payroll_records")
    .select("id, payroll_month, created_at, employees(employee_code, name)")
    .order("payroll_month", { ascending: false })
    .order("created_at", { ascending: false });

  const records = ((data ?? []) as PayrollRecordRow[]).filter(
    (record) => record.payroll_month,
  );
  const summaries = buildMonthSummaries(records);
  const activeMonth =
    selectedMonth && summaries.some((summary) => summary.month === selectedMonth)
      ? selectedMonth
      : summaries[0]?.month;
  const selectedRecords = activeMonth
    ? records.filter((record) => formatPayrollMonth(record.payroll_month) === activeMonth)
    : [];

  return (
    <section className="panel">
      <h2>給与データ管理</h2>
      {error ? (
        <div className="error">
          給与データを取得できませんでした。Supabase の権限設定を確認してください。
        </div>
      ) : records.length === 0 ? (
        <p>登録済みの給与データはまだありません。</p>
      ) : (
        <div className="stack">
          <div>
            <h3 style={{ fontSize: "15px", margin: "0 0 10px" }}>月別登録件数</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {summaries.map((summary) => (
                <a
                  className="status-pill"
                  href={`/admin/payroll-import?month=${summary.month}`}
                  key={summary.month}
                  style={
                    summary.month === activeMonth
                      ? undefined
                      : {
                          background: "rgba(255, 255, 255, 0.52)",
                          color: "var(--muted)",
                        }
                  }
                >
                  {summary.month} → {summary.count}件
                </a>
              ))}
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: "15px", margin: "0 0 10px" }}>月別給与一覧</h3>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>社員番号</th>
                    <th>氏名</th>
                    <th>対象年月</th>
                    <th>登録日時</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRecords.map((record) => {
                    const employee = getEmployee(record);

                    return (
                      <tr key={record.id}>
                        <td>{employee?.employee_code ?? "-"}</td>
                        <td>{employee?.name ?? "-"}</td>
                        <td>{formatPayrollMonth(record.payroll_month)}</td>
                        <td>{formatDateTime(record.created_at)}</td>
                        <td>
                          <PayrollRecordDeleteButton id={record.id} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function buildMonthSummaries(records: PayrollRecordRow[]): MonthSummary[] {
  const counts = new Map<string, number>();

  for (const record of records) {
    const month = formatPayrollMonth(record.payroll_month);
    counts.set(month, (counts.get(month) ?? 0) + 1);
  }

  return [...counts.entries()].map(([month, count]) => ({ month, count }));
}

function getEmployee(record: PayrollRecordRow) {
  return Array.isArray(record.employees)
    ? (record.employees[0] ?? null)
    : record.employees;
}

function formatPayrollMonth(value: string): string {
  return value.slice(0, 7);
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
