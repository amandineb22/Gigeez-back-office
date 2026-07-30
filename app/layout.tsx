import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { theme } from "@/theme/config";
import "./globals.css";

// next/font self-hosts these at build time — no runtime request to Google Fonts.
// To rebrand fonts: swap these two imports/calls and update theme/config.ts's
// `fonts` metadata to match.
const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: `${theme.name} — Business Dashboard`,
  description: theme.tagline,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
