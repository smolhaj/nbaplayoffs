import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NBA 26 Pick'Em",
  description:
    "Fill out your 2025-26 NBA Playoffs bracket and share with your friends.",
  openGraph: {
    title: "NBA 26 Pick'Em",
    description: "Fill out your 2025-26 NBA Playoffs bracket.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "NBA 26 Pick'Em",
    description: "Fill out your 2025-26 NBA Playoffs bracket.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#f7f5ef",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
