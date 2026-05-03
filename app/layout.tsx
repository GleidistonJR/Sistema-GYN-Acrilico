import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br">
      <body>
        {children} {/* Aqui entra o conteúdo de qualquer página */}
      </body>
    </html>
  );
}