import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/app-shell";

/** The app screens (Ask, Alerts, Profile, Benchmark) share the rail, top bar and disclaimer footer. */
export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
