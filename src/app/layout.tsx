import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "YKS OMR Reader",
  description: "Optik cevap kâğıdı okuma + skorlama",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
            <a href="/" className="text-lg font-semibold tracking-tight">
              YKS OMR Reader
            </a>
            <nav className="flex gap-4 text-sm text-slate-600">
              <a href="/" className="hover:text-indigo-600">Tek tarama</a>
              <a href="/batch" className="hover:text-indigo-600">Toplu tarama</a>
              <a href="/keys" className="hover:text-indigo-600">Cevap anahtarları</a>
            </nav>
          </div>
        </header>
        <main className="flex-1 mx-auto max-w-5xl w-full px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
