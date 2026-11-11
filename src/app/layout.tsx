import type { Metadata } from "next";
import { Instrument_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ErrorBoundary } from "@/components/error-boundary";
import { SmoothScrollProvider } from "@/components/ui/smooth-scroll-provider";

const uiSans = Instrument_Sans({
  variable: "--font-ui",
  subsets: ["latin"],
  display: "swap",
});

const displayMono = JetBrains_Mono({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SynapseBoard — AI Collaborative Whiteboard",
  description: "Real-time collaborative whiteboard powered by AI diagram intelligence",
  openGraph: {
    title: "SynapseBoard — AI Collaborative Whiteboard",
    description: "Production-grade architecture whiteboard with real-time multiplayer, AI diagram suggestions, and a 350ms Mess Cleanup layout engine.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SynapseBoard",
    description: "Real-time collaborative whiteboard powered by AI diagram intelligence",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" className={`${uiSans.variable} ${displayMono.variable} h-full`}>
      <body className="antialiased h-full w-full m-0 p-0 bg-[var(--background)] text-[var(--foreground)] font-sans">
        <ErrorBoundary>
          <SmoothScrollProvider>
            {children}
          </SmoothScrollProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
