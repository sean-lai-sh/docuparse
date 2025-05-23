
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ResearchLens - Contextual Knowledge for Researchers',
  description: 'ResearchLens is a browser extension that provides contextual knowledge to help researchers catch important information and make connections.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} w-screen p-0` }>
        <Navbar/>
        {children}
        <Footer />
      </body>
    </html>
  )
}