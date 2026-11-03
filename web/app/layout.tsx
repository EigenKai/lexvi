import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/shell/app-shell";
import { display, mono, sans, serif } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "LexVi — Tra cứu thuế có trích dẫn",
  description:
    "Thông tin tham khảo có trích dẫn về thuế cho hộ kinh doanh: theo văn bản đang có hiệu lực tại ngày áp dụng.",
};

export const viewport: Viewport = {
  themeColor: "#FAF8F3",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      className={`${display.variable} ${sans.variable} ${mono.variable} ${serif.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-paper text-ink">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
