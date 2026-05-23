import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sua Figurinha Panini da Copa do Mundo 2026 | Crie agora",
  description:
    "Crie sua figurinha Panini personalizada da Copa do Mundo 2026! Sua foto com o estilo dos campeões. Arquivo digital por apenas R$12,90.",
  robots: "index, follow",
  openGraph: {
    title: "Sua Figurinha Panini da Copa do Mundo 2026",
    description: "Crie sua figurinha Panini personalizada da Copa do Mundo 2026!",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://cdn.utmify.com.br" />
        <link href="https://fonts.googleapis.com/css2?family=Anton&family=Oswald:wght@400;500;600;700&display=swap" rel="stylesheet" />
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: `window.pixelId = "6a0b5813ba65d432c68aed1b"; var a = document.createElement("script"); a.setAttribute("async", ""); a.setAttribute("defer", ""); a.setAttribute("src", "https://cdn.utmify.com.br/scripts/pixel/pixel.js"); document.head.appendChild(a);` }} />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
