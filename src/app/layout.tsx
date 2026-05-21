import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "給与閲覧システム",
  description: "給与明細を安全に閲覧するための社内システム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
