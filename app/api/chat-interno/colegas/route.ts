import { avisosChatInterno, listarColegas } from '@/lib/chat-interno';
import { permite, PERFIS_CHAT_INTERNO } from '@/lib/permissoes';
import { obterUsuarioSessao } from '@/lib/sessao';
import { privado } from '@/lib/whatsapp/acesso';

export async function GET() {
  const usuario = await obterUsuarioSessao();
  if (!usuario?.colaborador || !permite(PERFIS_CHAT_INTERNO, usuario.role)) {
    return new Response(null, { status: 401, headers: privado });
  }

  const eu = usuario.colaborador.id;
  const [colegas, avisos] = await Promise.all([listarColegas(eu), avisosChatInterno(eu)]);
  return Response.json({ eu, colegas, pendentes: avisos.map(aviso => aviso.colegaId) }, { headers: privado });
}
