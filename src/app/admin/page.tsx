import { AppShell } from "@/components/AppShell";

export default function AdminPage() {
  return (
    <AppShell expectedRole="admin">
      <div className="page-header">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>管理者トップページ</h1>
          <p className="lead">
            管理者向けのトップページです。給与計算、PDFアップロード、源泉徴収票はまだ実装していません。
          </p>
        </div>
        <span className="status-pill">Phase 4</span>
      </div>
      <div className="grid">
        <section className="panel">
          <h2>従業員管理</h2>
          <p>従業員マスタの基本情報を登録・確認できます。</p>
          <a className="button" href="/admin/employees">
            従業員一覧へ
          </a>
        </section>
        <section className="panel">
          <h2>給与Excel取込</h2>
          <p>専用テンプレートの .xlsx から確定済みの給与数値を取り込みます。</p>
          <a className="button" href="/admin/payroll-import">
            給与Excel取込へ
          </a>
        </section>
        <section className="panel">
          <h2>源泉徴収票PDF</h2>
          <p>従業員ごとの源泉徴収票PDFを年度別にアップロード・確認できます。</p>
          <a className="button" href="/admin/tax-documents">
            源泉徴収票PDF管理へ
          </a>
        </section>
      </div>
    </AppShell>
  );
}
