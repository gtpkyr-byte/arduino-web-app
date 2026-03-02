import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Arduino Lab - Clase Interactiva',
  description: 'Aprende Arduino paso a paso con simulacion visual, misiones guiadas y retroalimentacion en tiempo real.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" style={{ backgroundColor: 'hsl(222, 25%, 9%)', color: 'hsl(210, 15%, 90%)' }}>
      <body className={`${inter.className} antialiased`} style={{ backgroundColor: 'hsl(222, 25%, 9%)', color: 'hsl(210, 15%, 90%)', minHeight: '100vh' }}>
        {children}
      </body>
    </html>
  )
}
