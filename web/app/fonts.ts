import { Be_Vietnam_Pro, IBM_Plex_Mono, Inter, Source_Serif_4 } from "next/font/google";

// DESIGN.md §3 — every family ships the Vietnamese subset. No Sora, Geist Sans or JetBrains Mono.
export const display = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-be-vietnam-pro",
});
export const sans = Inter({ subsets: ["latin", "vietnamese"], variable: "--font-inter" });
export const mono = IBM_Plex_Mono({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500"],
  variable: "--font-ibm-plex-mono",
});
export const serif = Source_Serif_4({
  subsets: ["latin", "vietnamese"],
  variable: "--font-source-serif",
});
