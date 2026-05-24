import { AppShell } from "@/components/AppShell";

export default function AdminPage() {
  return (
    <AppShell expectedRole="admin">
      <div className="page-header">
        <div>
          <p className="eyebrow">株式会社HWL</p>
          <h1>管理者トップページ</h1>
        </div>
      </div>
      <div className="grid">
        <section className="panel">
          <h2>従業員管理</h2>
          <p>従業員マスタの登録・編集を行います。</p>
          <a className="button" href="/admin/employees">
            従業員管理へ
          </a>
        </section>
        <section className="panel">
          <h2>給与Excel取込</h2>
          <p>確定済みの給与データをExcelから取り込みます。</p>
          <a className="button" href="/admin/payroll-import">
            給与Excel取込へ
          </a>
        </section>
        <section className="panel">
          <h2>源泉徴収票PDF</h2>
          <p>従業員ごとの源泉徴収票PDFを年度別に管理します。</p>
          <a className="button" href="/admin/tax-documents">
            源泉徴収票PDFへ
          </a>
        </section>
      </div>
    </AppShell>
  );
}
