import 'server-only';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { prisma } from '@/lib/prisma';

const api = 'https://api.bling.com.br/Api/v3';
type Credenciais = { access_token: string; refresh_token: string; expiraEm: number };

export function configuracaoBling() {
  const { BLING_CLIENT_ID: id, BLING_CLIENT_SECRET: segredo, BLING_REDIRECT_URI: retorno, BLING_CHAVE_LOCAL: chave } = process.env;
  return id && segredo && retorno && chave && chave.length >= 32 ? { id, segredo, retorno, chave } : null;
}

function chaveLocal() {
  const config = configuracaoBling();
  if (!config) throw new Error('O Bling ainda não foi configurado.');
  return createHash('sha256').update(config.chave).digest();
}

export function criptografar(dados: object) {
  const iv = randomBytes(12);
  const cifra = createCipheriv('aes-256-gcm', chaveLocal(), iv);
  const corpo = Buffer.concat([cifra.update(JSON.stringify(dados)), cifra.final()]);
  return Buffer.concat([iv, cifra.getAuthTag(), corpo]).toString('base64');
}

export function descriptografar<T>(valor: string): T {
  const dados = Buffer.from(valor, 'base64');
  const cifra = createDecipheriv('aes-256-gcm', chaveLocal(), dados.subarray(0, 12));
  cifra.setAuthTag(dados.subarray(12, 28));
  return JSON.parse(Buffer.concat([cifra.update(dados.subarray(28)), cifra.final()]).toString());
}

export class ErroPlataforma extends Error {
  constructor(public status: number, plataforma: string, operacao: string, detalhe = '') {
    super(`${plataforma} não confirmou ${operacao} (HTTP ${status}).${detalhe ? ' ' + detalhe : ''}`);
  }
}

async function trocarToken(campos: Record<string, string>): Promise<Credenciais> {
  const config = configuracaoBling();
  if (!config) throw new Error('O Bling ainda não foi configurado.');
  const resposta = await fetch(api + '/oauth/token', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(config.id + ':' + config.segredo).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
      'enable-jwt': '1',
      Accept: 'application/json',
    },
    body: new URLSearchParams(campos),
    signal: AbortSignal.timeout(8000),
    cache: 'no-store',
  });
  if (!resposta.ok) throw new ErroPlataforma(resposta.status, 'Bling', 'a autorização');
  const dados = await resposta.json();
  if (typeof dados.access_token !== 'string' || typeof dados.refresh_token !== 'string' || !(dados.expires_in > 0)) {
    throw new Error('O Bling retornou uma autorização inválida.');
  }
  return { access_token: dados.access_token, refresh_token: dados.refresh_token, expiraEm: Date.now() + dados.expires_in * 1000 };
}

export async function conectarBling(codigo: string) {
  const config = configuracaoBling();
  if (!config) throw new Error('Configure a integração do Bling.');
  await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(70517)`;
    const credenciais = criptografar(await trocarToken({ grant_type: 'authorization_code', code: codigo, redirect_uri: config.retorno }));
    await tx.integracaoBling.upsert({ where: { id: 1 }, create: { id: 1, credenciais }, update: { credenciais } });
  }, { timeout: 15000 });
}

export async function tokenBling() {
  const registro = await prisma.integracaoBling.findUnique({ where: { id: 1 } });
  if (!registro) throw new Error('Peça a um administrador para conectar o Bling.');
  const atual = descriptografar<Credenciais>(registro.credenciais);
  if (atual.expiraEm > Date.now() + 60_000) return atual.access_token;

  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(70517)`;
    const registro = await tx.integracaoBling.findUniqueOrThrow({ where: { id: 1 } });
    const atual = descriptografar<Credenciais>(registro.credenciais);
    if (atual.expiraEm > Date.now() + 60_000) return atual.access_token;
    const novo = await trocarToken({ grant_type: 'refresh_token', refresh_token: atual.refresh_token });
    await tx.integracaoBling.update({ where: { id: 1 }, data: { credenciais: criptografar(novo) } });
    return novo.access_token;
  }, { timeout: 15000 });
}

export async function bling<T>(token: string, caminho: string, corpo?: object): Promise<T> {
  const consultar = () => fetch(api + caminho, {
    method: corpo ? 'POST' : 'GET',
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/json', 'Content-Type': 'application/json', 'enable-jwt': '1' },
    body: corpo ? JSON.stringify(corpo) : undefined,
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  });
  let resposta = await consultar();
  if (resposta.status === 429) {
    await resposta.body?.cancel();
    await new Promise(resolve => setTimeout(resolve, 1100));
    resposta = await consultar();
  }
  if (!resposta.ok) {
    const operacao = caminho === '/contatos' ? 'o cadastro do cliente' : caminho === '/pedidos/vendas' ? 'a criação do pedido'
      : caminho.startsWith('/vendedores?') ? 'a consulta de vendedores' : 'a consulta';
    let detalhe = '';
    if (corpo && [400, 422].includes(resposta.status)) {
      const dados = await resposta.json().catch(() => null);
      const campos = Array.isArray(dados?.error?.fields) ? dados.error.fields : [];
      const mensagens = campos.map((campo: { msg?: unknown; message?: unknown } | null) => campo?.msg ?? campo?.message)
        .filter((msg: unknown): msg is string => typeof msg === 'string' && msg.trim().length > 0);
      detalhe = (mensagens.length ? mensagens.slice(0, 3).join(' ') : String(dados?.error?.description ?? dados?.error?.message ?? ''))
        .replace(/[\x00-\x1f\x7f]/g, ' ').slice(0, 450);
    }
    throw new ErroPlataforma(resposta.status, 'Bling', operacao, detalhe);
  }
  return (await resposta.json()).data as T;
}

export async function formasPagamento(token: string) {
  const formas: { id: number; descricao: string; finalidade: number }[] = [];
  for (let pagina = 1; pagina <= 10; pagina++) {
    const lote = await bling<typeof formas>(token, `/formas-pagamentos?situacao=1&limite=100&pagina=${pagina}`);
    formas.push(...lote.filter(forma => [2, 3].includes(forma.finalidade)));
    if (lote.length < 100) return formas;
  }
  throw new Error('O Bling retornou mais formas de pagamento do que o painel consegue listar.');
}

type Vendedor = { id: number; contato?: { nome?: string; situacao?: string } };

export async function identificarVendedorBling(token: string, nome: string) {
  const palavras = (valor: string) => valor.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR')
    .match(/[\p{L}\p{N}]+/gu)?.filter(p => !['de', 'da', 'do', 'das', 'dos', 'e'].includes(p)) ?? [];
  const partes = palavras(nome);
  const vendedores: { id: number; partes: string[] }[] = [];
  for (let pagina = 1; pagina <= 10; pagina++) {
    const lote = await bling<Vendedor[]>(token, `/vendedores?limite=100&pagina=${pagina}`);
    vendedores.push(...lote.flatMap(v => Number.isSafeInteger(v.id) && v.id > 0 && v.contato?.situacao === 'A' && v.contato.nome
      ? [{ id: v.id, partes: palavras(v.contato.nome) }] : []));
    if (lote.length < 100) break;
    if (pagina === 10) throw new Error('A lista de vendedores do Bling excedeu o limite da consulta.');
  }
  const correspondencias = partes.length ? [
    vendedores.filter(v => v.partes.join(' ') === partes.join(' ')),
    vendedores.filter(v => v.partes.length && (partes.every(p => v.partes.includes(p)) || v.partes.every(p => partes.includes(p)))),
    vendedores.filter(v => v.partes[0] === partes[0]),
  ].find(matches => matches.length > 0) : undefined;
  if (correspondencias?.length === 1) return correspondencias[0].id;
  throw new Error(correspondencias?.length
    ? 'Há mais de um vendedor correspondente no Bling. Peça à Administração para conferir os cadastros.'
    : 'O colaborador da sessão ainda não tem um vendedor ativo correspondente no Bling. Confira o cadastro com a Administração.');
}
