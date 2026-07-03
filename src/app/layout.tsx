import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Playbeat Digital Store — Games, Gift Cards, AI Tools & Subscriptions",
  description:
    "Playbeat Digital Store — buy digital products worldwide. Game keys, gift cards, AI tools, streaming and software subscriptions. Secure checkout powered by UBL Payment Gateway.",
  keywords: [
    "Playbeat",
    "digital store",
    "game keys",
    "gift cards",
    "AI tools",
    "subscriptions",
    "UBL payment gateway",
    "Pakistan e-commerce",
  ],
  authors: [{ name: "Playbeat" }],
  openGraph: {
    title: "Playbeat Digital Store",
    description: "Digital products marketplace — Games, Gift Cards, AI Tools & Subscriptions.",
    siteName: "Playbeat Digital Store",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Playbeat Digital Store",
    description: "Digital products marketplace — Games, Gift Cards, AI Tools & Subscriptions.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
