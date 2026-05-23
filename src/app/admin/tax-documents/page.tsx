import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import { TaxDocumentUploadForm } from "./TaxDocumentUploadForm";

type TaxDocumentRow = {
  id: string;
  employee_id: string;
  year: number;
  file_path: string;
  uploaded_at: string;
  employees: {
    employee_code: string;
    name: string;
  } | {
    employee_code: string;
    name: string;
  }[] | null;
};

export default async function AdminTaxDocumentsPage() {
  const supabase = await createClient();
  const { data: employeesData, error: employeesError } = await supabase
    .from("employees")
    .select("id, employee_code, name")
    .order("employee_code", { ascending: true });
  const { data: documentsData, error: documentsError } = await supabase
    .from("tax_documents")
    .select("id, employee_id, year, file_path, uploaded_at, employees(employee_code, name)")
    .not("year", "is", null)
    .not("file_path", "is", null)
    .order("year", { ascending: false })
    .order("uploaded_at", { ascending: false });

  const employees = employeesData ?? [];
  const documents = (documentsData ?? []) as TaxDocumentRow[];

  return (
    <AppShell expectedRole="admin">
      <div className="page-header">
        <div>
          <p className="eyebrow">Admin / Tax Documents</p>
          <h1>源泉徴収票PDF管理</h1>
          <p className="lead">
            従業員ごとの源泉徴収票PDFを年度別にアップロード・確認します。
          </p>
        </div>
        <a className="button secondary" href="/admin">
          管理者トップへ
        </a>
      </div>

      <div className="stack">
        <section className="panel">
          <h2>PDFアップロード</h2>
          {employeesError ? (
            <div className="error">従業員一覧を取得できませんでした。</div>
          ) : employees.length === 0 ? (
            <p>先に従業員を登録してください。</p>
          ) : (
            <TaxDocumentUploadForm employees={employees} />
          )}
        </section>

        <section className="panel">
          <h2>アップロード済み一覧</h2>
          {documentsError ? (
            <div className="error">
              源泉徴収票一覧を取得できませんでした。Supabase の setup SQL が最新か確認してください。
            </div>
          ) : documents.length === 0 ? (
            <p>アップロード済みの源泉徴収票PDFはまだありません。</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>年度</th>
                    <th>社員番号</th>
                    <th>氏名</th>
                    <th>Storage path</th>
                    <th>アップロード日時</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((document) => (
                    <tr key={document.id}>
                      <td>{document.year}年</td>
                      <td>{getEmployee(document)?.employee_code ?? "-"}</td>
                      <td>{getEmployee(document)?.name ?? "-"}</td>
                      <td>{document.file_path}</td>
                      <td>{formatDateTime(document.uploaded_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function getEmployee(document: TaxDocumentRow) {
  return Array.isArray(document.employees)
    ? (document.employees[0] ?? null)
    : document.employees;
}

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
