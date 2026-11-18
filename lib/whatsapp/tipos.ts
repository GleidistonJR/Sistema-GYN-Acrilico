export type StatusWhatsApp = {
  status: 'desconectado' | 'iniciando' | 'qr' | 'autenticando' | 'conectado' | 'encerrando' | 'erro' | 'indisponivel';
  qr: string | null;
  numero: string | null;
  mensagem: string | null;
  atualizadoEm: string;
};
