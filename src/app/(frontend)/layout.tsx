import React from 'react'
import './styles.css'
import ClientProviders from '@/components/ClientProviders'

export const metadata = {
  title: 'LectureSync AI',
  description: 'The future of taking notes',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="en">
      <body>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  )
}
