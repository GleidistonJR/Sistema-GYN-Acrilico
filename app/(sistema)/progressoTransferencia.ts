export function acompanharTransferencia(acao: string, inicial: string, publicar: (texto: string) => void) {
  let bytes = 0, total = 0, velocidade = 0;
  let ultimoAvanco = performance.now();
  const formatar = (valor: number) => valor >= 1024 ** 2
    ? `${(valor / 1024 ** 2).toFixed(1)} MB`
    : `${Math.ceil(valor / 1024)} KB`;
  const exibir = () => {
    const situacao = total && bytes >= total
      ? `${acao}: 100% · Finalizando…`
      : bytes
        ? `${acao}: ${total ? Math.floor(bytes / total * 100) + '%' : formatar(bytes)}`
        : inicial;
    const parado = performance.now() - ultimoAvanco >= 10000;
    publicar(situacao + (parado ? ' · Sem avanço há 10 s ou mais' : velocidade > 0 && (!total || bytes < total) ? ` · ${formatar(velocidade)}/s` : ''));
  };
  exibir();
  const timer = window.setInterval(exibir, 1000);
  return {
    atualizar(event: ProgressEvent) {
      if (event.loaded > bytes) {
        const agora = performance.now();
        velocidade = (event.loaded - bytes) * 1000 / Math.max(agora - ultimoAvanco, 100);
        ultimoAvanco = agora;
        bytes = event.loaded;
      }
      if (event.lengthComputable) total = event.total;
      exibir();
    },
    encerrar() { window.clearInterval(timer); },
  };
}
