import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Plum Insurance Adjudicator',
  description: 'Abhishek Anand - Internship assignment for Plum',
  generator: 'Lol Me',
  icons: {
    icon: [
      {
        url: '/images.jpg',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/images.jpg',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/images.jpg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/images.jpg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
