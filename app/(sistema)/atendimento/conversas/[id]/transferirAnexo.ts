export async function transferirAnexo(base: string, arquivo: File, progresso: (mensagem: string) => void) {
  progresso('Preparando anexo…');
  const grant = await fetch(base + '/anexos', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome: arquivo.name, mimeType: arquivo.type, tamanho: arquivo.size }) });
  const ticket = await grant.json();
  if (!grant.ok) throw new Error(ticket.erro || 'Não foi possível preparar o anexo.');
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', ticket.url);
    xhr.timeout = 300000;
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');
    xhr.upload.onprogress = e => progresso(e.lengthComputable ? 'Transferindo anexo: ' + Math.round(e.loaded / e.total * 100) + '%' : 'Transferindo anexo…');
    xhr.onload = () => xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(xhr.responseText || 'Falha ao transferir o anexo. Tente novamente.'));
    xhr.onerror = () => reject(new Error('A conexão de arquivos falhou. Confira a internet e tente novamente.'));
    xhr.ontimeout = () => reject(new Error('A transferência demorou demais. Tente novamente.'));
    xhr.send(arquivo);
  });
  return String(ticket.token);
}
