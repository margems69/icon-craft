import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Icon Craft — Convert logos to Chrome extension & desktop icons",
  description: "Upload your logo and get perfectly sized icons for Chrome extensions, store listings, and desktop apps.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
