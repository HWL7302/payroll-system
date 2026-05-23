import { AppShell } from "@/components/AppShell";

const yearOptions = ["2026", "2025", "2024"];

export default function TaxDocumentsPage() {
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
        <section className="statement-filter" aria-label="年度選択">
          <div>
            <p className="eyebrow">対象年度</p>
            <h2>表示する源泉徴収票を選択</h2>
          </div>
          <label className="statement-month-field">
            <span>年度</span>
            <select aria-label="年度" defaultValue={yearOptions[0]}>
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}年
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="panel">
          <div>
            <p className="eyebrow">Tax Documents</p>
            <h2>源泉徴収票ダウンロード</h2>
            <p>
              源泉徴収票のデータ連携とPDF生成は今後追加予定です。現在はページ導線と表示エリアのみ用意しています。
            </p>
          </div>
          <button className="button" type="button">
            源泉徴収票ダウンロード
          </button>
        </section>

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
                {yearOptions.map((year) => (
                  <tr key={year}>
                    <td>{year}年</td>
                    <td>源泉徴収票</td>
                    <td>準備中</td>
                    <td>
                      <button className="button secondary" type="button" disabled>
                        未対応
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
