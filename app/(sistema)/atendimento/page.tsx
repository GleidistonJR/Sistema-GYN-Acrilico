import type { Metadata } from 'next';
import { exigirUsuario } from '@/lib/autorizacao';
import { PERFIS_ATENDIMENTO } from '@/lib/permissoes';
import { prisma } from '@/lib/prisma';
import PainelAtendimento from './PainelAtendimento';
import { apelidoEfetivo } from '@/lib/whatsapp/assinatura.mjs';

export const metadata: Metadata = { title: 'Atendimento' };

export default async function Atendimento({ searchParams }: {
  searchParams: Promise<{ fila?: string; cliente?: string; etiqueta?: string }>;
}) {
  const usuario = await exigirUsuario(PERFIS_ATENDIMENTO);
  const params = await searchParams;
  const fila = params.fila === 'todos' || params.fila === 'fila' || (!params.fila && usuario.role === 'RECEPCAO')
    ? 'todos' : 'meus';
  const etiquetas = await prisma.etiqueta.findMany({ orderBy: { nome: 'asc' } });
  const etiquetaInicial = etiquetas.find(e => e.id === params.etiqueta)?.id;
  return <PainelAtendimento usuario={{ id: usuario.id, role: usuario.role, apelido: apelidoEfetivo(usuario) }} etiquetas={etiquetas} filaInicial={fila} clienteInicial={params.cliente?.slice(0, 100)} etiquetaInicial={etiquetaInicial} />;
}
