import { AppShell } from "@/components/AppShell";
import { PayrollImportForm } from "./PayrollImportForm";

export default function PayrollImportPage() {
  return (
    <AppShell expectedRole="admin">
      <div className="page-header">
        <div>
          <p className="eyebrow">Admin / Payroll Import</p>
          <h1>給与Excel取込</h1>
          <p className="lead">
            システム専用テンプレートの .xlsx から、確定済みの給与数値を取り込みます。
          </p>
        </div>
        <a className="button secondary" href="/admin">
          管理者トップへ
        </a>
      </div>
      <PayrollImportForm />
    </AppShell>
  );
}
