import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Daily Workout",
  description: "A clean daily Orangetheory workout viewer"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
