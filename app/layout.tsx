import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz"],
});

export const metadata: Metadata = {
  title: "Distress Hub — India's Distressed Real Estate Intelligence Platform",
  description:
    "Live deal flow. AI-scored. Investor-grade. Track 412+ distressed property auctions across India in real time.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider
      afterSignOutUrl="/"
      appearance={{
        theme: dark,
        variables: {
          colorPrimary: "#C9A961",
          colorBackground: "#0A0E1A",
          colorInput: "#121830",
          colorInputForeground: "#FFFFFF",
          colorForeground: "#FFFFFF",
          colorMutedForeground: "#B8B5AE",
          fontFamily: "var(--font-inter)",
          borderRadius: "8px",
        },
        elements: {
          card: "bg-bg-card border border-divider shadow-2xl",
          headerTitle: "font-display",
          formButtonPrimary:
            "bg-gradient-to-br from-gold-light to-gold-dark text-text-dark hover:brightness-110",
          footerActionLink: "text-gold-light hover:text-gold",
        },
      }}
    >
      <html
        lang="en"
        className={`${inter.variable} ${fraunces.variable} h-full antialiased`}
        suppressHydrationWarning
      >
        <body className="min-h-full flex flex-col bg-bg text-text">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
