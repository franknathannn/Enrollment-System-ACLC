// app/layout.tsx
// NOTE: No "use client" here — metadata/viewport exports require a server component

import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/shared/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { ThemeApplier } from "@/components/shared/ThemeApplier"
import Script from "next/script"

const inter = Inter({ subsets: ["latin"] })

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
}

export const metadata: Metadata = {
  title: "AMA ACLC Northbay | Enrollment System",
  description: "Official Enrollment Portal for AMA ACLC Northbay",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <Script
          src="https://cdnjs.cloudflare.com/ajax/libs/xlsx-populate/1.21.0/xlsx-populate.min.js"
          strategy="beforeInteractive"
        />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {/* ThemeApplier is a tiny client component that writes data-theme to <html> */}
          <ThemeApplier />
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}