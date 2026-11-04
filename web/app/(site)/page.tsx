import type { Metadata } from "next";
import { LandingClient } from "@/components/landing/landing-client";

export const metadata: Metadata = {
  // Absolute URLs for the social preview once deployed (set NEXT_PUBLIC_SITE_URL to the public origin).
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL
    ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
    : undefined,
  title: "LexVi — The right law, on the right day",
  description:
    "Tax lookup with citations for Vietnamese household businesses: answers only from the rules in force on the date you ask, with the article and its amendment chain. Built on Muse Spark through Meta's Model API.",
  openGraph: {
    title: "LexVi — The right law, on the right day",
    description:
      "Tax lookup with citations for Vietnamese household businesses. Built on Muse Spark.",
    images: [{ url: "/demo/lexvi-film-poster.jpg", width: 1280, height: 720 }],
  },
};

export default function LandingRoute() {
  return <LandingClient />;
}
