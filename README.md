# 給与閲覧システム

Next.js + TypeScript + Supabase で作成した、給与閲覧システムです。

## 実装済み

- Next.js App Router
- TypeScript
- Supabase クライアント設定
- Supabase Auth のメールアドレス＋パスワードログイン
- ログイン後の role による遷移先分岐
  - `role: "admin"` は管理者トップページ
  - それ以外は従業員トップページ
- ログアウト
- 未ログイン状態での保護ページアクセス制御
- Supabase 用 setup SQL
- 従業員マスタの一覧表示と新規登録
- 給与インポート用 `.xlsx` テンプレート
- 管理者向け給与Excel取込
- 基本レイアウト
- 将来用の給与明細PDFダウンロードボタン

## 未実装

- 給与計算ロジック
- PDFアップロード
- PDFダウンロード本処理
- メール通知

## Supabase DB セットアップ

`supabase/setup.sql` を Supabase SQL Editor で実行してください。

作成されるテーブル:

- `employees`
- `payroll_records`
- `tax_documents`

Phase 4 では `employees` の一覧表示と新規登録、および専用 `.xlsx` テンプレートからの `payroll_records` 登録を画面実装しています。

## 給与Excel取込

管理者でログイン後、`/admin/payroll-import` から操作します。

使用するテンプレート:

- `/payroll_import_template.xlsx`

アップロード対象は `.xlsx` のみです。既存の給与計算Excelを直接読むのではなく、確定済み数値だけを専用テンプレートへ貼り付けて取り込みます。

## 環境変数

`.env.example` を参考に `.env.local` を作成してください。

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## 起動

```bash
npm install
npm run dev
```

ブラウザで `http://127.0.0.1:3000/login` を開きます。

## 権限設定

Supabase Auth のユーザー metadata または app metadata に `role` を設定します。

```json
{
  "role": "admin"
}
```

`admin` 以外、または未設定の場合は従業員として扱います。

## 権限メモ

現在の権限は `admin` / `employee` です。
将来的には `admin` / `staff` / `employee` の3区分を想定していますが、現時点では `staff` は未実装です。
