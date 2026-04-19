import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChaosPong",
  description: "A neon arcade productivity ping-pong match for two shippers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
