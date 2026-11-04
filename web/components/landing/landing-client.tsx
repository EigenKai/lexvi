"use client";

import dynamic from "next/dynamic";

/**
 * Client-rendered like the app screens (DESIGN.md §9.3): the story reads the viewport, scroll and
 * reduced-motion settings, so rendering it only in the browser avoids hydration mismatches.
 */
export const LandingClient = dynamic(() => import("./landing-page").then((m) => m.LandingPage), {
  ssr: false,
  loading: () => <div className="min-h-dvh bg-[#F4EADA]" aria-busy="true" />,
});
