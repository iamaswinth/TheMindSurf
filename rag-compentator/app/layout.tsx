import type { Metadata } from "next";
import { Space_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/lib/context";
import { QueryProvider } from "@/lib/providers";
// import { generateBaseMetadata } from "@/lib/metadata";

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
  title: "TheMindSurf - Chat with Your Documents Like Never Before",
  description:
    "Upload PDFs, ask questions in plain English, and get instant AI-powered answers with source citations. Smart search, multi-document analysis, and advanced RAG technology.",
  keywords: [
    "RAG",
    "AI",
    "Chat",
    "Documents",
    "PDF Chat",
    "Document Analysis",
    "AI Answers",
    "Source Citations",
    "Smart Search",
    "Multi-Document Search",
    "OCR",
    "Table Extraction",
  ],
  authors: [{ name: "TheMindSurf" }],
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/logo-icon.svg",
  },
  openGraph: {
    title: "TheMindSurf - Chat with Your Documents Like Never Before",
    description:
      "Upload PDFs, ask questions in plain English, and get instant AI-powered answers with source citations. Smart search, multi-document analysis, and advanced RAG technology.",
    url: "https://the-mind-surf-69.vercel.app",
    siteName: "TheMindSurf",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TheMindSurf - AI-Powered Document Chat & Analysis Platform",
    description:
      "Transform how you interact with documents. Chat with PDFs, extract insights, and get AI-powered answers instantly using advanced RAG technology.",
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
