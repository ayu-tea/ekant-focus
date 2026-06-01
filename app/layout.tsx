import type React from "react"
import type { Metadata } from "next"
import {
  Inter,
  Manrope,
  DM_Sans,
  Plus_Jakarta_Sans,
  IBM_Plex_Sans,
} from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" })
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" })
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" })
const ibmPlex = IBM_Plex_Sans({ subsets: ["latin"], variable: "--font-ibm-plex" })

export const metadata: Metadata = {
  title: "Ekant",
  description: "An ultra-minimal focus timer for deep work",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={[
          inter.variable,
          manrope.variable,
          dmSans.variable,
          jakarta.variable,
          ibmPlex.variable,
          "antialiased",
        ].join(" ")}
      >
        {children}
      </body>
    </html>
  )
}
