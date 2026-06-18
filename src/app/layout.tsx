import type { Metadata } from "next";
import "./globals.css";
import "./print.css";

export const metadata: Metadata = {
  title: "給与閲覧システム",
  description: "給与明細を安全に閲覧するための社内システム",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "192x192" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180" }],
  },
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
