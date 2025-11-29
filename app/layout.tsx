import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SkillSync - Personalized Learning Platform",
  description: "Master any skill with adaptive learning paths, AI assistance, and curated content.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="fixed inset-0 bg-gradient-radial pointer-events-none" />
        {children}
      </body>
    </html>
  );
}

