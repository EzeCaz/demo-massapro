import type { Metadata } from "next"
import { Montserrat, Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "sonner"
import { Providers } from "@/components/Providers"

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
})

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
})

export const metadata: Metadata = {
  title: "MassaPro - Demo Configuration Dashboard",
  description: "Professional demo configuration dashboard for managing scenarios, KPIs, and client interactions",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "64x64" },
      { url: "/massapro-logo.png", type: "image/png" },
    ],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${montserrat.variable} ${inter.variable} antialiased bg-background text-foreground`}
      >
        <Providers>
          {children}
          <Toaster position="top-right" richColors />
        </Providers>
      </body>
    </html>
  )
}
