import { AppShell } from "@/components/AppShell";

export default function AdminPage() {
  return (
    <AppShell expectedRole="admin">
      <div className="page-header">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>管理者トップページ</h1>
          <p className="lead">
            管理者向けの仮トップページです。給与データ表示、Excel取込、PDFアップロードはまだ実装していません。
          </p>
        </div>
        <span className="status-pill">Phase 3</span>
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
          <h2>給与明細PDF</h2>
          <p>PDFアップロードとダウンロード処理は次フェーズ以降で実装します。</p>
          <button className="button" type="button" disabled>
            PDFダウンロード
          </button>
        </section>
      </div>
    </AppShell>
  );
}
