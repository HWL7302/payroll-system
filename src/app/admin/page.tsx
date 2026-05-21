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
        <span className="status-pill">Phase 2</span>
      </div>
      <div className="grid">
        <section className="panel">
          <h2>給与明細PDF</h2>
          <p>PDFアップロードとダウンロード処理は次フェーズ以降で実装します。</p>
          <button className="button" type="button" disabled>
            PDFダウンロード
          </button>
        </section>
        <section className="panel">
          <h2>管理メニュー</h2>
          <p>従業員管理、給与データ取込、配信履歴は次フェーズ以降で追加します。</p>
        </section>
      </div>
    </AppShell>
  );
}
