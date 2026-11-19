import { permite, PERFIS_COMERCIAIS } from '@/lib/permissoes';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { obterUsuarioSessao } from '@/lib/sessao';
import { mesmaOrigem, privado } from '@/lib/whatsapp/acesso';

const selecao = { id: true, label: true, texto: true };
const json = (dados: unknown, status = 200) => Response.json(dados, { status, headers: privado });

export async function GET() {
  const usuario = await obterUsuarioSessao();
  if (!usuario || !permite(PERFIS_COMERCIAIS, usuario.role)) return json({ erro: 'Acesso não autorizado.' }, 403);
  const textos = await prisma.textoRapido.findMany({ orderBy: [{ ordem: 'asc' }, { id: 'asc' }], select: selecao });
  return json({ textos, podeGerenciar: usuario.role === 'ADMIN' });
}

export async function POST(request: Request) {
  if (!mesmaOrigem(request) || (await obterUsuarioSessao())?.role !== 'ADMIN') {
    return json({ erro: 'Somente administradores podem gerenciar textos rápidos.' }, 403);
  }
  const dados = await request.json().catch(() => null);
  const { acao, id } = dados ?? {};
  if (!['criar', 'editar', 'excluir'].includes(acao) || (acao !== 'criar' && (typeof id !== 'string' || !/^[a-z0-9-]{1,36}$/.test(id)))) {
    return json({ erro: 'Operação ou modelo inválido.' }, 400);
  }
  try {
    if (acao === 'excluir') {
      await prisma.textoRapido.delete({ where: { id } });
      return json({ id });
    }
    const label = typeof dados.label === 'string' ? dados.label.trim() : '';
    const texto = typeof dados.texto === 'string' ? dados.texto.trim() : '';
    if (!label || label.length > 80 || !texto || texto.length > 6000) {
      return json({ erro: 'Informe um título de até 80 caracteres e uma mensagem de até 6.000 caracteres.' }, 400);
    }
    const modelo = acao === 'criar'
      ? await prisma.textoRapido.create({ data: { label, texto }, select: selecao })
      : await prisma.textoRapido.update({ where: { id }, data: { label, texto }, select: selecao });
    return json({ modelo }, acao === 'criar' ? 201 : 200);
  } catch (erro) {
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2025') {
      return json({ erro: 'Este modelo já foi removido. Feche e abra a lista para atualizá-la.' }, 404);
    }
    return json({ erro: 'Não foi possível salvar a alteração. Tente novamente.' }, 503);
  }
}
