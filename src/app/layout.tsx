// app/layout.tsx
// NOTE: No "use client" here — metadata/viewport exports require a server component

import type { Metadata, Viewport } from "next"
import "./globals.css"
import { ThemeProvider } from "@/components/shared/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { ThemeApplier } from "@/components/shared/ThemeApplier"
import { DemoTools } from "@/components/DemoTools"
import Script from "next/script"


export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
}

export const metadata: Metadata = {
  title: "ACLC NORTHBAY | Enrollment System",
  description: "Official Enrollment Portal for ACLC NORTHBAY",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Blocking theme bootstrap — runs synchronously before first paint.
            Reads the Zustand-persisted value from localStorage so the correct
            data-theme is on <html> before React hydrates, eliminating the
            flash-of-wrong-theme AND the re-render lag on initial load. */}
        <script dangerouslySetInnerHTML={{
          __html: `
          try{
            var _t=JSON.parse(localStorage.getItem('aclc-theme')||'{}');
            var _d=_t.state&&_t.state.isDark!==undefined?_t.state.isDark:true;
            document.documentElement.setAttribute('data-theme',_d?'dark':'light');
          }catch(e){}
        `}} />
      </head>
      <body className="font-sans" suppressHydrationWarning>
        <Script
          src="https://cdnjs.cloudflare.com/ajax/libs/xlsx-populate/1.21.0/xlsx-populate.min.js"
          strategy="beforeInteractive"
        />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {/* ThemeApplier is a tiny client component that writes data-theme to <html> */}
          <ThemeApplier />
          {children}
          <DemoTools />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}