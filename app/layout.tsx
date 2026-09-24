import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lee Lens 1 - Quản lý bán hàng",
  description: "Tạo đơn, lưu khách hàng, theo dõi lịch sử và doanh thu cho Lee Lens 1.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="antialiased">{children}</body>
    </html>
  );
}
