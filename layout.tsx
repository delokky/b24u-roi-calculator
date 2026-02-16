import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'B24U ROI Calculator - AI Chat Solutions',
  description: 'Рассчитайте экономический эффект от внедрения AI-чата на ваш сайт',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}
