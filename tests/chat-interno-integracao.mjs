import assert from 'node:assert/strict';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { vinculoColaboradorTeste } from './fixtures/colaborador.mjs';

if (process.env.RUN_DATABASE_INTEGRATION !== '1') throw new Error('Requer RUN_DATABASE_INTEGRATION=1');
const base = process.env.CHAT_TEST_URL || 'http://localhost:3000';
const prisma = new PrismaClient();
const usuarios = [];

async function criarConta(role, nome, pessoal = true) {
  const id = randomUUID();
  const token = randomBytes(32).toString('hex');
  const colaborador = vinculoColaboradorTeste(id);
  colaborador.create.nome = nome;
  const conta = await prisma.user.create({
    data: {
      id, role, email: id + '@example.invalid', password: '!temporario',
      ...(pessoal ? { colaborador } : {}),
      sessoes: { create: { tokenHash: createHash('sha256').update(token).digest('hex'), expiresAt: new Date(Date.now() + 600000) } },
    },
    select: { colaborador: { select: { id: true } } },
  });
  usuarios.push({ id, colaboradorId: conta.colaborador?.id });
  return {
    id,
    colaboradorId: conta.colaborador?.id,
    chave: conta.colaborador ? String(conta.colaborador.id) : 'avulso-' + id,
    acessar(path, method = 'GET', body) {
      const multipart = body instanceof FormData;
      return fetch(base + path, {
        method, redirect: 'manual',
        headers: { Cookie: 'sessao_segura=' + token, Origin: base, ...(multipart ? {} : { 'Content-Type': 'application/json' }) },
        body: multipart || body === undefined ? body : JSON.stringify(body),
      });
    },
  };
}

try {
  const vendedor = await criarConta('USER', 'Vendedor de teste');
  const admin = await criarConta('ADMIN', 'Administradora de teste');
  const outro = await criarConta('ADMIN', 'Outro administrador');
  const recepcao = await criarConta('RECEPCAO', '', false);
  const producao = await criarConta('PONTO', '', false);
  const paraAdmin = '/api/chat-interno/' + admin.colaboradorId;
  const paraVendedor = '/api/chat-interno/' + vendedor.colaboradorId;
  const envio = { texto: 'Mensagem privada de validação', pedidoId: randomUUID() };

  assert.equal((await vendedor.acessar('/chat-interno')).status, 200);
  assert.equal((await recepcao.acessar('/chat-interno')).status, 200);
  assert.equal((await producao.acessar('/chat-interno')).status, 200);
  assert.equal((await producao.acessar('/atendimento')).status, 307);
  const primeira = await vendedor.acessar(paraAdmin, 'POST', envio);
  assert.equal(primeira.status, 201, await primeira.clone().text());
  const mensagem = await primeira.json();
  assert.equal((await (await vendedor.acessar(paraAdmin, 'POST', envio)).json()).id, mensagem.id);
  assert.equal((await (await admin.acessar(paraVendedor)).json()).mensagens.length, 1);
  assert.deepEqual((await (await outro.acessar(paraAdmin)).json()).mensagens, []);
  assert.deepEqual((await (await outro.acessar('/api/atendimento/nao-lidas')).json()).internas, []);

  const segunda = await vendedor.acessar(paraAdmin, 'POST', { texto: 'Chegou depois', pedidoId: randomUUID() });
  assert.equal(segunda.status, 201);
  assert.equal((await admin.acessar(paraVendedor, 'PATCH', { ate: mensagem.id })).status, 204);
  const avisos = (await (await admin.acessar('/api/atendimento/nao-lidas')).json()).internas;
  assert.equal(avisos.length, 1);
  assert.equal(avisos[0].nome, 'Vendedor de teste');
  assert.equal(avisos[0].previa, 'Chegou depois');
  assert.equal((await admin.acessar(paraVendedor, 'PATCH', { ate: avisos[0].mensagemId })).status, 204);
  assert.deepEqual((await (await admin.acessar('/api/atendimento/nao-lidas')).json()).internas, []);

  const { colegas } = await (await vendedor.acessar('/api/chat-interno/colegas')).json();
  assert.ok(colegas.some(c => c.id === recepcao.chave && c.perfil === 'RECEPCAO' && c.disponivel));
  assert.ok(colegas.some(c => c.id === producao.chave && c.perfil === 'PONTO' && c.disponivel));
  const paraRecepcao = '/api/chat-interno/' + recepcao.chave;
  const paraProducao = '/api/chat-interno/' + producao.chave;
  assert.equal((await vendedor.acessar(paraRecepcao, 'POST', { texto: 'Pedido na recepção', pedidoId: randomUUID() })).status, 201);
  assert.equal((await vendedor.acessar(paraProducao, 'POST', { texto: 'Pedido para produção', pedidoId: randomUUID() })).status, 201);
  assert.deepEqual((await (await outro.acessar(paraRecepcao)).json()).mensagens, []);
  assert.equal((await (await recepcao.acessar(paraVendedor)).json()).mensagens[0].texto, 'Pedido na recepção');
  const avisosProducao = await (await producao.acessar('/api/atendimento/nao-lidas')).json();
  assert.deepEqual(avisosProducao.conversas, []);
  assert.equal(avisosProducao.internas[0].previa, 'Pedido para produção');
  assert.equal((await producao.acessar(paraVendedor, 'PATCH', { ate: avisosProducao.internas[0].mensagemId })).status, 204);
  assert.equal((await recepcao.acessar(paraVendedor, 'POST', { texto: 'Recebido na recepção', pedidoId: randomUUID() })).status, 201);
  assert.equal((await (await vendedor.acessar(paraRecepcao)).json()).mensagens.length, 2);
  await prisma.user.delete({ where: { id: recepcao.id } });
  assert.equal((await vendedor.acessar(paraRecepcao, 'POST', { texto: 'Recepção revogada', pedidoId: randomUUID() })).status, 404);
  assert.equal((await (await vendedor.acessar(paraRecepcao)).json()).mensagens.length, 2);

  await prisma.colaborador.update({ where: { id: admin.colaboradorId }, data: { inativadoEm: new Date() } });
  assert.equal((await vendedor.acessar(paraAdmin, 'POST', { ...envio, pedidoId: randomUUID() })).status, 404);
  assert.equal((await (await vendedor.acessar(paraAdmin)).json()).mensagens.length, 2);

  const pdf = new FormData();
  const bytes = Buffer.from('%PDF-1.7\n% Arquivo de validação\n%%EOF');
  pdf.set('arquivo', new Blob([bytes], { type: 'application/pdf' }), 'Validação.pdf');
  pdf.set('pedidoId', randomUUID());
  pdf.set('citacaoId', String(mensagem.id));
  const envioPdf = await vendedor.acessar(paraProducao, 'POST', pdf);
  assert.equal(envioPdf.status, 404, 'Citação de outra conversa deve ser rejeitada');
  pdf.delete('citacaoId');
  const respostaPdf = await vendedor.acessar(paraProducao, 'POST', pdf);
  assert.equal(respostaPdf.status, 201, await respostaPdf.clone().text());
  const mensagemPdf = await respostaPdf.json();
  assert.equal(mensagemPdf.anexo.nome, 'Validação.pdf');
  assert.equal(mensagemPdf.anexo.tamanho, bytes.length);
  assert.equal((await (await vendedor.acessar(paraProducao, 'POST', pdf)).json()).id, mensagemPdf.id);
  const arquivo = await producao.acessar(paraVendedor + '?arquivo=' + mensagemPdf.id);
  assert.equal(arquivo.status, 200);
  assert.deepEqual(Buffer.from(await arquivo.arrayBuffer()), bytes);
  assert.equal((await outro.acessar(paraVendedor + '?arquivo=' + mensagemPdf.id)).status, 404);
  assert.equal((await outro.acessar(paraVendedor + '?alvo=' + mensagemPdf.id)).status, 404);
  const respostaComCitacao = await producao.acessar(paraVendedor, 'POST',
    { texto: 'Recebi o PDF', citacaoId: mensagemPdf.id, pedidoId: randomUUID() });
  assert.equal(respostaComCitacao.status, 201);
  assert.equal((await respostaComCitacao.json()).citacao.id, mensagemPdf.id);
  const contexto = await producao.acessar(paraVendedor + '?alvo=' + mensagemPdf.id);
  assert.ok((await contexto.json()).mensagens.some(item => item.id === mensagemPdf.id));

  const envioEncaminhado = { encaminharId: mensagemPdf.id, colegaOrigem: vendedor.chave, pedidoId: randomUUID() };
  assert.equal((await outro.acessar(paraProducao, 'POST', envioEncaminhado)).status, 404);
  const encaminhadoResponse = await producao.acessar('/api/chat-interno/' + outro.chave, 'POST', envioEncaminhado);
  assert.equal(encaminhadoResponse.status, 201, await encaminhadoResponse.clone().text());
  const encaminhado = await encaminhadoResponse.json();
  assert.equal(encaminhado.encaminhada, true);
  const copia = await outro.acessar(paraProducao + '?arquivo=' + encaminhado.id + '&baixar=1');
  assert.equal(copia.status, 200);
  assert.deepEqual(Buffer.from(await copia.arrayBuffer()), bytes);
  assert.equal((await producao.acessar(paraVendedor + '?mensagem=' + mensagemPdf.id, 'DELETE')).status, 404);
  assert.equal((await vendedor.acessar(paraProducao + '?mensagem=' + mensagemPdf.id, 'DELETE')).status, 204);
  const depois = await (await producao.acessar(paraVendedor)).json();
  assert.ok(depois.apagadas.includes(mensagemPdf.id));
  assert.equal(depois.mensagens.find(item => item.id === mensagemPdf.id).anexo, null);
  assert.equal(depois.mensagens.find(item => item.citacao?.id === mensagemPdf.id).citacao.texto, 'Mensagem apagada');
  assert.equal((await producao.acessar(paraVendedor + '?arquivo=' + mensagemPdf.id)).status, 404);
  assert.equal((await producao.acessar('/api/chat-interno/' + outro.chave, 'POST', { ...envioEncaminhado, pedidoId: randomUUID() })).status, 404);

  console.log('Chat interno validado: acesso, privacidade, reenvio, avisos, leitura e histórico.');
} finally {
  await prisma.colaborador.deleteMany({ where: { id: { in: usuarios.flatMap(u => u.colaboradorId ?? []) } } });
  await prisma.user.deleteMany({ where: { id: { in: usuarios.map(u => u.id) } } });
  await prisma.$disconnect();
}
