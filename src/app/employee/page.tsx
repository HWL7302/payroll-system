import { AppShell } from "@/components/AppShell";

export default function EmployeePage() {
  return (
    <AppShell expectedRole="employee">
      <div className="page-header">
        <div>
          <p className="eyebrow">Employee</p>
          <h1>従業員トップページ</h1>
          <p className="lead">
            自分の給与明細を確認するための画面です。Phase 1 では閲覧導線のみ配置しています。
          </p>
        </div>
        <span className="status-pill">Phase 1</span>
      </div>
      <div className="grid">
        <section className="panel">
          <h2>最新の給与明細</h2>
          <p>給与明細PDFのダウンロード機能は、次フェーズ以降で実装します。</p>
          <button className="button" type="button" disabled>
            PDFダウンロード
          </button>
        </section>
        <section className="panel">
          <h2>お知らせ</h2>
          <p>現在表示できるお知らせはありません。</p>
        </section>
      </div>
    </AppShell>
  );
}
