import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

export const dynamic = "force-dynamic";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://barbearia-premium.vercel.app",
  ),
  title: {
    default: "Corte Nobre Barbearia",
    template: "%s | Corte Nobre",
  },
  description:
    "Barbearia premium com agendamento simples, atendimento preciso e experiência elevada do corte ao acabamento.",
  openGraph: {
    title: "Corte Nobre Barbearia",
    description:
      "Agende seu corte, barba ou pacote premium em poucos cliques.",
    type: "website",
    locale: "pt_BR",
    siteName: "Corte Nobre Barbearia",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
