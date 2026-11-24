import "./globals.css";
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { ProvedorTema } from './tema';

export const metadata: Metadata = {
  title: {
    default: 'Goiânia Acrílico',
    template: '%s | Goiânia Acrílico',
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const tema = (await cookies()).get('gyn-tema')?.value === 'escuro' ? 'escuro' : 'claro';
  return (
    <html lang="pt-br" data-tema={tema}>
      <body>
        <ProvedorTema inicial={tema}>{children}</ProvedorTema>
      </body>
    </html>
  );
}
