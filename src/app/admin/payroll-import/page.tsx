import { AppShell } from "@/components/AppShell";
import { PayrollImportForm } from "./PayrollImportForm";

export default function PayrollImportPage() {
  return (
    <AppShell expectedRole="admin">
      <div className="page-header">
        <div>
          <h1>給与Excel取込</h1>
        </div>
        <a className="button secondary" href="/admin">
          管理者トップへ
        </a>
      </div>
      <PayrollImportForm />
    </AppShell>
  );
}
