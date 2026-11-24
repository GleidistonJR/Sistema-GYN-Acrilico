import { avisosChatInterno, identidadeChat, listarColegas } from '@/lib/chat-interno';
import { obterUsuarioSessao } from '@/lib/sessao';
import { privado } from '@/lib/whatsapp/acesso';

export async function GET() {
  const usuario = await obterUsuarioSessao();
  const eu = usuario && identidadeChat(usuario);
  if (!eu) {
    return new Response(null, { status: 401, headers: privado });
  }

  const [colegas, avisos] = await Promise.all([listarColegas(eu), avisosChatInterno(eu)]);
  return Response.json({ eu, colegas, pendentes: avisos.map(aviso => aviso.colegaId) }, { headers: privado });
}
