import BracketPicker from "@/components/BracketPicker";
import type { Metadata } from "next";

interface Params {
  code: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { code } = await params;
  const ogUrl = `/api/og?code=${encodeURIComponent(code)}`;
  return {
    title: "NBA 26 Pick'Em — Shared Bracket",
    description: "Check out my 2026 NBA playoff picks.",
    openGraph: {
      title: "NBA 26 Pick'Em",
      description: "Check out my 2026 NBA playoff picks.",
      images: [{ url: ogUrl, width: 1200, height: 1260 }],
    },
    twitter: {
      card: "summary_large_image",
      title: "NBA 26 Pick'Em",
      description: "Check out my 2026 NBA playoff picks.",
      images: [ogUrl],
    },
  };
}

export default async function SharedBracketPage({
  params,
}: {
  params: Promise<Params>;
}) {
  // Next.js already URL-decodes path params — pass as-is, no double decode.
  const { code } = await params;
  return <BracketPicker initialCode={code} />;
}
