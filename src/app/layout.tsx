import "./globals.css";

import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";

import { ClerkModalGuard } from "@/components/clerk-modal-guard";

export const metadata: Metadata = {
  title: "RequireX",
  description: "AI intake and brief generation for messy client requirements.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" className="h-full antialiased" style={{ colorScheme: "dark", background: "#141517" }}>
      <head>
        <meta name="theme-color" content="#141517" />
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen text-foreground">
        <ClerkProvider
          appearance={{
            variables: {
              colorBackground: "#1c1e21",
              colorText: "#efeee9",
              colorTextSecondary: "#9a9a9e",
              colorPrimary: "#7a9bb8",
              colorNeutral: "#efeee9",
              colorInputBackground: "#141517",
              colorInputText: "#efeee9",
              colorTextOnPrimaryBackground: "#06121e",
              colorAlphaShade: "#efeee9",
              borderRadius: "8px",
              fontFamily: "Geist, system-ui, sans-serif",
              fontSize: "14px",
            },
            elements: {
              modalBackdrop: "!bg-black/60 !backdrop-blur-md",
            },
          }}
        >
          <ClerkModalGuard />
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
