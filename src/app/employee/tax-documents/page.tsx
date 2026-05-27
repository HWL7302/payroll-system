import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";
import type { Employee, TaxDocument } from "@/lib/types";
import { TaxDocumentDownloadButton } from "./TaxDocumentDownloadButton";

type TaxDocumentsPageProps = {
  searchParams?: Promise<{
    year?: string | string[];
    preview?: string | string[];
  }>;
};

type TaxDocumentWithUrls = TaxDocument & {
  previewUrl: string | null;
};

const TAX_DOCUMENT_BUCKET = "tax-documents";

const badgeBaseStyle = {
  display: "inline-flex",
  minHeight: 28,
  alignItems: "center",
  borderRadius: 999,
  padding: "0 12px",
  fontSize: 13,
  fontWeight: 700,
} as const;

export default async function TaxDocumentsPage({
  searchParams,
}: TaxDocumentsPageProps) {
  const params = await searchParams;
  const requestedYear = Array.isArray(params?.year)
    ? params?.year[0]
    : params?.year;
  const previewValue = Array.isArray(params?.preview)
    ? params?.preview[0]
    : params?.preview;
  const shouldPreview = previewValue === "1";
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
    .maybeSingle<Employee>();

  const documentsResult = employee
    ? await fetchTaxDocuments(supabase, employee.id)
    : { data: [], error: null };
  const documents = documentsResult.data ?? [];
  const yearOptions = buildYearOptions(documents);
  const selectedYear = chooseSelectedYear(yearOptions, requestedYear);
  const documentsWithUrls = await buildDocumentsWithPreviewUrls(
    supabase,
    documents,
  );
  const selectedDocument =
    documentsWithUrls.find(
      (document) => String(document.tax_year) === selectedYear,
    ) ?? null;

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
              <input type="hidden" name="preview" value="1" />
              <button className="button secondary" type="submit">
                表示
              </button>
            </form>

            <section className="panel">
              <div>
                <p className="eyebrow">Tax Documents</p>
                <h2>源泉徴収票ダウンロード</h2>
                <p>
                  {selectedDocument?.previewUrl
                    ? shouldPreview
                      ? `${selectedYear}年の源泉徴収票PDFを表示中です。`
                      : `${selectedYear}年の源泉徴収票PDFは登録済みです。表示ボタンで内容を確認できます。`
                    : `${selectedYear}年の源泉徴収票PDFはまだ登録されていません。`}
                </p>
              </div>
              <TaxDocumentDownloadButton
                documentId={selectedDocument?.id ?? null}
                disabled={!shouldPreview || !selectedDocument?.previewUrl}
              />
            </section>

            {shouldPreview && selectedDocument?.previewUrl ? (
              <section className="panel">
                <h2>PDFプレビュー</h2>
                <iframe
                  src={selectedDocument.previewUrl}
                  title={`${selectedYear}年 源泉徴収票PDFプレビュー`}
                  style={{
                    width: "100%",
                    minHeight: 720,
                    border: "1px solid var(--line)",
                    borderRadius: 8,
                    background: "#ffffff",
                  }}
                />
              </section>
            ) : null}

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
                      const document = documentsWithUrls.find(
                        (item) => String(item.tax_year) === year,
                      );
                      const isUploaded = Boolean(document?.previewUrl);
                      const isDownloaded = Boolean(document?.downloaded_at);

                      return (
                        <tr key={year}>
                          <td>{year}年</td>
                          <td>源泉徴収票</td>
                          <td>
                            <StatusBadge uploaded={isUploaded} />
                          </td>
                          <td>
                            <DownloadStatusBadge
                              uploaded={isUploaded}
                              downloaded={isDownloaded}
                            />
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

function StatusBadge({ uploaded }: { uploaded: boolean }) {
  return (
    <span
      style={{
        ...badgeBaseStyle,
        color: uploaded ? "#027a48" : "#b54708",
        background: uploaded ? "var(--success-bg)" : "#fff7e6",
      }}
    >
      {uploaded ? "登録済み" : "準備中"}
    </span>
  );
}

function DownloadStatusBadge({
  uploaded,
  downloaded,
}: {
  uploaded: boolean;
  downloaded: boolean;
}) {
  const label = !uploaded
    ? "未対応"
    : downloaded
      ? "ダウンロード済み"
      : "未ダウンロード";

  return (
    <span
      style={{
        ...badgeBaseStyle,
        color: !uploaded ? "#667085" : downloaded ? "#027a48" : "#b54708",
        background: !uploaded
          ? "#eef2f8"
          : downloaded
            ? "var(--success-bg)"
            : "#fff7e6",
      }}
    >
      {label}
    </span>
  );
}

async function fetchTaxDocuments(
  supabase: Awaited<ReturnType<typeof createClient>>,
  employeeId: Employee["id"],
) {
  return supabase
    .from("tax_documents")
    .select(
      "id, employee_id, tax_year, file_path, uploaded_at, downloaded_at, created_at, updated_at",
    )
    .eq("employee_id", employeeId)
    .not("tax_year", "is", null)
    .not("file_path", "is", null)
    .order("tax_year", { ascending: false })
    .returns<TaxDocument[]>();
}

async function buildDocumentsWithPreviewUrls(
  supabase: Awaited<ReturnType<typeof createClient>>,
  documents: TaxDocument[],
): Promise<TaxDocumentWithUrls[]> {
  const documentsWithUrls: TaxDocumentWithUrls[] = [];

  for (const document of documents) {
    const { data } = await supabase.storage
      .from(TAX_DOCUMENT_BUCKET)
      .createSignedUrl(document.file_path, 300);

    documentsWithUrls.push({
      ...document,
      previewUrl: data?.signedUrl ?? null,
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
