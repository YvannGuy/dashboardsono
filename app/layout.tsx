
import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Pacifico } from "next/font/google";
import "./globals.css";
import AuthProvider from './components/AuthProvider';

const pacifico = Pacifico({
  weight: '400',
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-pacifico',
})

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SoundRent - Back Office",
  description: "Back-office sécurisé SoundRent",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning={true}>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} ${pacifico.variable} antialiased`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
