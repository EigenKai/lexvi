"use client";

import dynamic from "next/dynamic";

/**
 * The app is client-rendered (DESIGN.md §9.3). Rendering the Ask screen only in the browser keeps
 * "today", the URL film parameters and media queries free of hydration mismatches.
 */
export const AskScreenClient = dynamic(() => import("./ask-screen").then((m) => m.AskScreen), {
  ssr: false,
  loading: () => (
    <div className="mx-auto w-full max-w-[720px] px-6 pt-10 max-sm:px-4" aria-busy="true">
      <div className="h-10 w-2/3 rounded-md bg-surface-sunk" />
      <div className="mt-6 h-36 rounded-lg border border-line bg-surface" />
    </div>
  ),
});
