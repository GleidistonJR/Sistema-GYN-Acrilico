import type { Metadata } from 'next';
import { exigirUsuario } from '@/lib/autorizacao';
import { PERFIS_CHAT_INTERNO } from '@/lib/permissoes';
import { avisosChatInterno, listarColegas } from '@/lib/chat-interno';
import PainelChatInterno from './PainelChatInterno';

export const metadata: Metadata = { title: 'Chat interno' };

export default async function ChatInterno({ searchParams }: {
  searchParams: Promise<{ colega?: string }>;
}) {
  const usuario = await exigirUsuario(PERFIS_CHAT_INTERNO);
  const eu = usuario.colaborador!.id;
  const [{ colega }, colegas, avisos] = await Promise.all([searchParams, listarColegas(eu), avisosChatInterno(eu)]);
  const selecionado = colegas.find(item => String(item.id) === colega);
  return <PainelChatInterno eu={eu} colegas={colegas} colega={selecionado}
    pendentesIniciais={avisos.map(aviso => aviso.colegaId)} />;
}
