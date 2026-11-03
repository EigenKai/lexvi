import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/providers";
import { AppShell } from "@/components/shell/app-shell";
import { display, mono, sans, serif } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "LexVi — Tax lookup with citations",
  description:
    "Reference information with citations on Vietnamese tax rules for household businesses, from the rules in force on the date asked.",
};

export const viewport: Viewport = {
  themeColor: "#FAF8F3",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable} ${serif.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-paper text-ink">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
