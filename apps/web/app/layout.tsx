import { Geist, Geist_Mono, Ubuntu } from "next/font/google";

import "@workspace/ui/globals.css";
import { Providers } from "@/modules/providers";
import { Metadata } from "next";
import './global.css'

const ubuntu = Ubuntu({ variable: "--font-sans", weight: ["300", "400"] });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Infra Bro",
  description: "Project by subhash",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={ubuntu.variable} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#1f1f1f]`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
