import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hectic — Know what you actually know",
  description:
    "Audits the validity of a founder's customer-discovery evidence and blocks the evidence statement until every claim is resolved.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
