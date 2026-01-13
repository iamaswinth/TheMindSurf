import type { Metadata } from "next";
import { Space_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/lib/context";
import { QueryProvider } from "@/lib/providers";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "TheMindSurf",
  description:
    "Chat with your documents using AI-powered RAG - Neo-Brutalist Edition",
  keywords: ["RAG", "AI", "Chat", "Documents", "Machine Learning", "Q&A"],
  authors: [{ name: "TheMindSurf" }],
  openGraph: {
    title: "TheMindSurf - AI-Powered Document Chat",
    description:
      "Chat with your documents using AI-powered RAG - Neo-Brutalist Edition",
    url: "https://the-mind-surf-69.vercel.app",
    siteName: "TheMindSurf",
    images: [
      {
        url: "https://the-mind-surf-69.vercel.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "TheMindSurf - AI-Powered Document Chat",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TheMindSurf - AI-Powered Document Chat",
    description:
      "Chat with your documents using AI-powered RAG - Neo-Brutalist Edition",
    images: ["https://the-mind-surf-69.vercel.app/og-image.png"],
  },
  metadataBase: new URL("https://the-mind-surf-69.vercel.app"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${spaceGrotesk.variable} ${spaceMono.variable} antialiased font-sans`}
        style={{
          fontFamily: "var(--font-space-grotesk), system-ui, sans-serif",
        }}
      >
        <QueryProvider>
          <AppProvider>{children}</AppProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
