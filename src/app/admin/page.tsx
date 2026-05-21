import { AppShell } from "@/components/AppShell";

export default function AdminPage() {
  return (
    <AppShell expectedRole="admin">
      <div className="page-header">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>管理者トップページ</h1>
          <p className="lead">
            給与明細の配布状況を管理するための画面です。Phase 1 では基本導線のみ配置しています。
          </p>
        </div>
        <span className="status-pill">Phase 1</span>
      </div>
      <div className="grid">
        <section className="panel">
          <h2>給与明細PDF</h2>
          <p>PDFアップロード、Excel取込、メール通知はまだ実装していません。</p>
          <button className="button" type="button" disabled>
            PDFダウンロード
          </button>
        </section>
        <section className="panel">
          <h2>管理メニュー</h2>
          <p>従業員管理や配信履歴は次フェーズ以降で追加します。</p>
        </section>
      </div>
    </AppShell>
  );
}
