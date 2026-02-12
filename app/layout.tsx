import type { Metadata } from "next";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Seizuki",
  description: "Community-first self-published manga/comics platform with live overlays.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className="font-ui antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
