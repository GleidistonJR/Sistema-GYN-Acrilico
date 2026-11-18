import { exigirUsuario } from '@/lib/autorizacao';
import { prisma } from '@/lib/prisma';
import PainelAtendimento from './PainelAtendimento';

export default async function Atendimento({ searchParams }: {
  searchParams: Promise<{ fila?: string; cliente?: string }>;
}) {
  const usuario = await exigirUsuario();
  const params = await searchParams;
  const fila = params.fila === 'fila' ? 'fila' : params.fila === 'todos' && usuario.role === 'ADMIN' ? 'todos' : 'meus';
  const etiquetas = await prisma.etiqueta.findMany({ orderBy: { nome: 'asc' } });
  return <PainelAtendimento usuario={{ id: usuario.id, role: usuario.role }} etiquetas={etiquetas} filaInicial={fila} clienteInicial={params.cliente?.slice(0, 100)} />;
}
