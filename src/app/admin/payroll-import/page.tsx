import { AppShell } from "@/components/AppShell";
import { PayrollDataManagement } from "./PayrollDataManagement";
import { PayrollImportForm } from "./PayrollImportForm";

type PayrollImportPageProps = {
  searchParams?: Promise<{
    month?: string | string[];
  }>;
};

export default async function PayrollImportPage({
  searchParams,
}: PayrollImportPageProps) {
  const params = await searchParams;
  const requestedMonth = Array.isArray(params?.month)
    ? params?.month[0]
    : params?.month;

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
      <div className="stack">
        <PayrollImportForm />
        <PayrollDataManagement selectedMonth={requestedMonth?.slice(0, 7)} />
      </div>
    </AppShell>
  );
}
