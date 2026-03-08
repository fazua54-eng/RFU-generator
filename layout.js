import './globals.css'

export const metadata = {
  title: 'Remedex — Générateur de rapport KOA',
  description: 'Analyse automatique du registre arthrose du genou',
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
