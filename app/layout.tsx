import "./globals.css";
import { cookies } from 'next/headers';
import { ProvedorTema } from './tema';

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
