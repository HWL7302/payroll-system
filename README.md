# 給与閲覧システム Phase 1

Next.js + TypeScript + Supabase で作成した、給与閲覧システムの最小構成です。

## 実装済み

- Next.js App Router
- TypeScript
- Supabase クライアント設定
- ログイン画面
- ログイン後の権限分岐
  - `role: "admin"` は管理者トップページ
  - それ以外は従業員トップページ
- 基本レイアウト
- 将来用の給与明細PDFダウンロードボタン

## 未実装

- Excel 取込
- 給与計算ロジック
- PDFアップロード
- PDFダウンロード本処理
- メール通知

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
