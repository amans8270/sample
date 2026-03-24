import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TripAI - AI-Powered Travel Pages",
  description: "Generate unique, shareable travel microsites with AI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
