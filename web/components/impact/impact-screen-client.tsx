"use client";

import dynamic from "next/dynamic";

/** Client-only, like the Ask screen: reads the URL film parameters and browser APIs. */
export const ImpactScreenClient = dynamic(
  () => import("./impact-screen").then((m) => m.ImpactScreen),
  {
    ssr: false,
    loading: () => (
      <div className="mx-auto w-full max-w-[720px] px-6 pt-10 max-sm:px-4" aria-busy="true">
        <div className="h-10 w-2/3 rounded-md bg-surface-sunk" />
        <div className="mt-6 h-48 rounded-lg border-2 border-dashed border-line bg-surface" />
      </div>
    ),
  },
);
