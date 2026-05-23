import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import type { Employee, TaxDocument } from "@/lib/types";

type TaxDocumentsPageProps = {
  searchParams?: Promise<{
    year?: string | string[];
  }>;
};

type TaxDocumentWithDownload = TaxDocument & {
  downloadUrl: string | null;
};

const TAX_DOCUMENT_BUCKET = "tax-documents";

export default async function TaxDocumentsPage({
  searchParams,
}: TaxDocumentsPageProps) {
  const params = await searchParams;
  const requestedYear = Array.isArray(params?.year)
    ? params?.year[0]
    : params?.year;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const authEmail = user.email?.toLowerCase() ?? "";
  const { data: employee, error: employeeError } = await supabase
    .from("employees")
    .select(
      "id, employee_code, name, email, hire_date, resignation_date, status, role, auth_user_id, created_at, updated_at",
    )
    .ilike("email", authEmail)
    .maybeSingle();

  const documentsResult = employee
    ? await fetchTaxDocuments(supabase, employee.id)
    : { data: [], error: null };
  const documents = (documentsResult.data ?? []) as TaxDocument[];
  const yearOptions = buildYearOptions(documents);
  const selectedYear = chooseSelectedYear(yearOptions, requestedYear);
  const selectedDocument = documents.find(
    (document) => String(document.tax_year) === selectedYear,
  );
  const documentsWithDownload = await buildDocumentsWithDownloadUrls(
    supabase,
    documents,
  );
  const selectedDocumentWithDownload =
    documentsWithDownload.find((document) => document.id === selectedDocument?.id) ??
    null;

  return (
    <AppShell expectedRole="employee">
      <div className="page-header">
        <div>
          <p className="eyebrow">株式会社HWL</p>
          <h1>源泉徴収票</h1>
        </div>
        <a className="button secondary" href="/employee">
          給与明細へ
        </a>
      </div>

      <div className="stack">
        {employeeError ? (
          <div className="error">
            従業員情報を取得できませんでした。管理者に確認してください。
          </div>
        ) : !employee ? (
          <div className="error">
            ログイン中のメールアドレスに一致する従業員情報がありません。
          </div>
        ) : documentsResult.error ? (
          <div className="error">
            源泉徴収票データを取得できませんでした。管理者に確認してください。
          </div>
        ) : (
          <>
            <form className="statement-filter" aria-label="年度選択">
              <div>
                <p className="eyebrow">対象年度</p>
                <h2>表示する源泉徴収票を選択</h2>
              </div>
              <label className="statement-month-field">
                <span>年度</span>
                <select aria-label="年度" name="year" defaultValue={selectedYear}>
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}年
                    </option>
                  ))}
                </select>
              </label>
              <button className="button secondary" type="submit">
                表示
              </button>
            </form>

            <section className="panel">
              <div>
                <p className="eyebrow">Tax Documents</p>
                <h2>源泉徴収票ダウンロード</h2>
                <p>
                  {selectedDocumentWithDownload?.downloadUrl
                    ? `${selectedYear}年の源泉徴収票PDFをダウンロードできます。`
                    : `${selectedYear}年の源泉徴収票PDFはまだ登録されていません。`}
                </p>
              </div>
              {selectedDocumentWithDownload?.downloadUrl ? (
                <a
                  className="button"
                  href={selectedDocumentWithDownload.downloadUrl}
                  download
                >
                  源泉徴収票ダウンロード
                </a>
              ) : (
                <button className="button secondary" type="button" disabled>
                  準備中
                </button>
              )}
            </section>

            <section className="panel">
              <h2>源泉徴収票一覧</h2>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>年度</th>
                      <th>書類名</th>
                      <th>状態</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {yearOptions.map((year) => {
                      const document = documentsWithDownload.find(
                        (item) => String(item.tax_year) === year,
                      );

                      return (
                        <tr key={year}>
                          <td>{year}年</td>
                          <td>源泉徴収票</td>
                          <td>{document?.downloadUrl ? "登録済み" : "準備中"}</td>
                          <td>
                            {document?.downloadUrl ? (
                              <a className="button secondary" href={document.downloadUrl} download>
                                ダウンロード
                              </a>
                            ) : (
                              <button className="button secondary" type="button" disabled>
                                未対応
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}

async function fetchTaxDocuments(
  supabase: Awaited<ReturnType<typeof createClient>>,
  employeeId: Employee["id"],
) {
  return supabase
    .from("tax_documents")
    .select("id, employee_id, tax_year, file_path, uploaded_at, created_at, updated_at")
    .eq("employee_id", employeeId)
    .not("tax_year", "is", null)
    .not("file_path", "is", null)
    .order("tax_year", { ascending: false })
    .returns<TaxDocument[]>();
}

async function buildDocumentsWithDownloadUrls(
  supabase: Awaited<ReturnType<typeof createClient>>,
  documents: TaxDocument[],
): Promise<TaxDocumentWithDownload[]> {
  const documentsWithUrls: TaxDocumentWithDownload[] = [];

  for (const document of documents) {
    const { data } = await supabase.storage
      .from(TAX_DOCUMENT_BUCKET)
      .createSignedUrl(document.file_path, 300, {
        download: `源泉徴収票_${document.tax_year}.pdf`,
      });

    documentsWithUrls.push({
      ...document,
      downloadUrl: data?.signedUrl ?? null,
    });
  }

  return documentsWithUrls;
}

function buildYearOptions(documents: TaxDocument[]): string[] {
  const currentYear = new Date().getFullYear();
  const years = new Set<string>([
    String(currentYear),
    String(currentYear - 1),
    String(currentYear - 2),
  ]);

  for (const document of documents) {
    years.add(String(document.tax_year));
  }

  return [...years].sort((left, right) => Number(right) - Number(left));
}

function chooseSelectedYear(
  options: string[],
  requestedYear: string | undefined,
): string {
  const normalizedYear = requestedYear?.slice(0, 4);
  const requestedOption = options.find((option) => option === normalizedYear);

  return requestedOption ?? options[0] ?? String(new Date().getFullYear());
}
