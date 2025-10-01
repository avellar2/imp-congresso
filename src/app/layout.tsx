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
  title: "Congresso de Mulheres - Essência",
  description: "Congresso de Mulheres - Essência. Um evento transformador para fortalecer, inspirar e capacitar mulheres. 15 de novembro de 2025.",
  icons: {
    icon: [
      { url: '/logometodista.png', sizes: 'any', type: 'image/png' },
      { url: '/favicon.ico', sizes: '16x16', type: 'image/x-icon' }
    ],
    shortcut: '/logometodista.png',
    apple: '/logometodista.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="icon" href="/logometodista.png" type="image/png" />
        <link rel="shortcut icon" href="/logometodista.png" />
        <link rel="apple-touch-icon" href="/logometodista.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
