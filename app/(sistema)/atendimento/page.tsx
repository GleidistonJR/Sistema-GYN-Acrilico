import { exigirUsuario } from '@/lib/autorizacao';
import { prisma } from '@/lib/prisma';
import PainelAtendimento from './PainelAtendimento';
import { apelidoEfetivo } from '@/lib/whatsapp/assinatura.mjs';

export default async function Atendimento({ searchParams }: {
  searchParams: Promise<{ fila?: string; cliente?: string }>;
}) {
  const usuario = await exigirUsuario();
  const params = await searchParams;
  const fila = params.fila === 'todos' || params.fila === 'fila' ? 'todos' : 'meus';
  const etiquetas = await prisma.etiqueta.findMany({ orderBy: { nome: 'asc' } });
  return <PainelAtendimento usuario={{ id: usuario.id, role: usuario.role, apelido: apelidoEfetivo(usuario) }} etiquetas={etiquetas} filaInicial={fila} clienteInicial={params.cliente?.slice(0, 100)} />;
}
