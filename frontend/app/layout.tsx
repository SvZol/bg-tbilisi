import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/context/AuthContext'
import Navbar from '@/components/Navbar'

const inter = Inter({ subsets: ['latin', 'cyrillic'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://tbi-ssector.run'),
  title: 'ТБИссектриса',
  description: 'Городская семейная игра с элементами ориентирования и математики',
  openGraph: {
    title: 'ТБИссектриса',
    description: 'Городская семейная игра с элементами ориентирования и математики',
    images: ['/logo-icon.png.jpg'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body className={inter.className} style={{ background: '#FFFBF5' }}>
        <AuthProvider>
          <Navbar />
          <main className="max-w-5xl mx-auto px-4 py-8">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  )
}
