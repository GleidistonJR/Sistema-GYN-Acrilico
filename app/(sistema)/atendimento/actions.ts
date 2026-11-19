'use server';

import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { exigirUsuario } from '@/lib/autorizacao';
import { prisma } from '@/lib/prisma';
import { PERFIS_ATENDIMENTO } from '@/lib/permissoes';
import { validarApelido } from '@/lib/whatsapp/assinatura.mjs';
import { normalizarTelefone, validarTexto } from '@/lib/atendimento/regras';

type Resultado = { sucesso: boolean; mensagem: string; clienteCriadoId?: string };

export async function alterarAtendimento(_anterior: Resultado, form: FormData): Promise<Resultado> {
  // Every mutation validates the server session, including direct action requests.
  const usuario = await exigirUsuario(PERFIS_ATENDIMENTO);
  try {
    const acao = form.get('acao');
    if (acao === 'meuApelido') {
      const apelido = validarApelido(form.get('apelido'));
      // Only the authenticated account can change its signature, never a posted user ID.
      await prisma.$executeRaw`UPDATE "User" SET apelido = ${apelido} WHERE id = ${usuario.id}`;
    } else if (acao === 'criarCliente') {
      const clienteCriado = await prisma.cliente.create({
        data: {
          nome: validarTexto(form.get('nome'), 120),
          telefone: normalizarTelefone(form.get('telefone')),
          responsavelId: usuario.id,
          atribuicoes: { create: { atorId: usuario.id, novoId: usuario.id } },
        },
        select: { id: true },
      });
      return { sucesso: true, mensagem: 'Cliente adicionado.', clienteCriadoId: clienteCriado.id };
    } else if (acao === 'excluirConversa') {
      if (usuario.role !== 'ADMIN') throw new Error('Somente administradores podem excluir conversas.');
      const id = validarTexto(form.get('clienteId'), 100);
      await prisma.$transaction(async tx => {
        const [cliente] = await tx.$queryRaw<Array<{ versaoEntrada: bigint }>>`
          SELECT "versaoEntrada" FROM "Cliente"
          WHERE id = ${id} AND ("conversaExcluidaEm" IS NULL OR "ultimaMensagemEm" IS NOT NULL)
          FOR UPDATE
        `;
        if (!cliente) throw new Error('Conversa indisponível para exclusão.');
        const enviando = await tx.mensagemWhatsApp.findFirst({
          where: { clienteId: id, status: 'ENVIANDO' }, select: { id: true },
        });
        if (enviando) throw new Error('Aguarde o envio em andamento e tente novamente.');
        await tx.cliente.update({
          where: { id },
          data: {
            conversaExcluidaEm: new Date(), ultimaMensagemEm: null, versaoEntradaExcluida: cliente.versaoEntrada,
            versaoMensagens: { increment: 1 },
          },
        });
        await tx.mensagemWhatsApp.deleteMany({ where: { clienteId: id } });
      }, { timeout: 15000 });
      return { sucesso: true, mensagem: 'Conversa excluída.' };
    } else if (acao === 'criarEtiqueta' || acao === 'renomearEtiqueta' || acao === 'excluirEtiqueta') {
      if (usuario.role !== 'ADMIN') throw new Error('Somente administradores podem gerenciar etiquetas.');
      if (acao === 'excluirEtiqueta') {
        const id = validarTexto(form.get('etiquetaId'), 100);
        await prisma.etiqueta.delete({ where: { id } });
        return { sucesso: true, mensagem: 'Etiqueta excluída.' };
      }
      const valor = form.get('nome');
      const nome = validarTexto(typeof valor === 'string' ? valor.normalize('NFC') : valor, 40);
      if (acao === 'criarEtiqueta') {
        await prisma.etiqueta.create({ data: { nome } });
        return { sucesso: true, mensagem: 'Etiqueta criada.' };
      }
      const id = validarTexto(form.get('etiquetaId'), 100);
      await prisma.etiqueta.update({ where: { id }, data: { nome } });
      return { sucesso: true, mensagem: 'Etiqueta renomeada.' };
    } else if (acao === 'renomear') {
      const id = validarTexto(form.get('clienteId'), 100);
      const nome = validarTexto(form.get('nome'), 120);
      const resultado = await prisma.cliente.updateMany({
        where: { id },
        data: { nome },
      });
      if (resultado.count !== 1) throw new Error('Cliente não disponível para alteração. Atualize a conversa.');
    } else if (acao === 'etiquetar' || acao === 'removerEtiqueta') {
      const clienteId = validarTexto(form.get('clienteId'), 100);
      const etiquetaId = validarTexto(form.get('etiquetaId'), 100);
      await prisma.$transaction(async tx => {
        const cliente = await tx.cliente.findFirst({
          where: { id: clienteId, OR: [{ conversaExcluidaEm: null }, { ultimaMensagemEm: { not: null } }] },
          select: { id: true },
        });
        if (!cliente) throw new Error('Conversa indisponível.');
        if (acao === 'etiquetar') {
          await tx.clienteEtiqueta.upsert({
            where: { clienteId_etiquetaId: { clienteId, etiquetaId } },
            create: { clienteId, etiquetaId }, update: {},
          });
        } else {
          await tx.clienteEtiqueta.deleteMany({ where: { clienteId, etiquetaId } });
        }
      }, { timeout: 15000 });
      return { sucesso: true, mensagem: acao === 'etiquetar' ? 'Etiqueta adicionada.' : 'Etiqueta removida.' };
    } else if (acao === 'assumir' || acao === 'desatribuir' || acao === 'transferir') {
      const clienteId = validarTexto(form.get('clienteId'), 100);
      const anterior = form.get('responsavelAtualId');
      const anteriorId = anterior === '' ? null : validarTexto(anterior, 100);
      const destino = form.get('responsavelId');
      const novoId = acao === 'assumir' ? usuario.id
        : acao === 'transferir' && destino !== '' ? validarTexto(destino, 100) : null;

      await prisma.$transaction(async tx => {
        const cliente = await tx.cliente.findFirst({
          where: { id: clienteId, OR: [{ conversaExcluidaEm: null }, { ultimaMensagemEm: { not: null } }] },
          select: { responsavelId: true },
        });
        if (!cliente) throw new Error('Conversa indisponível.');
        if (cliente.responsavelId !== anteriorId) throw new Error('O responsável mudou. Atualize a conversa e tente novamente.');
        if (anteriorId === novoId) return;
        if (acao === 'transferir' && novoId && !await tx.user.findFirst({
          where: { id: novoId, role: { in: [...PERFIS_ATENDIMENTO] } }, select: { id: true },
        })) throw new Error('Operador indisponível.');
        const alterado = await tx.cliente.updateMany({
          where: { id: clienteId, responsavelId: anteriorId, OR: [{ conversaExcluidaEm: null }, { ultimaMensagemEm: { not: null } }] },
          data: { responsavelId: novoId },
        });
        if (alterado.count !== 1) throw new Error('A conversa mudou. Atualize e tente novamente.');
        await tx.atribuicaoCliente.create({ data: { clienteId, atorId: usuario.id, anteriorId, novoId } });
      }, { timeout: 15000 });
      return { sucesso: true, mensagem: 'Responsável atualizado.' };
    } else {
      throw new Error('Operação inválida.');
    }
    revalidatePath('/atendimento');
    return { sucesso: true, mensagem: 'Alteração salva.' };
  } catch (erro) {
    if (erro instanceof Prisma.PrismaClientKnownRequestError) {
      if (erro.code === 'P2025') return { sucesso: false, mensagem: 'Etiqueta indisponível. Atualize a lista e tente novamente.' };
      return { sucesso: false, mensagem: erro.code === 'P2002' ? 'Telefone ou etiqueta já cadastrado.' : 'Não foi possível salvar. Atualize a página e tente novamente.' };
    }
    if (erro instanceof Prisma.PrismaClientInitializationError || erro instanceof Prisma.PrismaClientValidationError) {
      return { sucesso: false, mensagem: 'Cadastro indisponível. Tente novamente mais tarde.' };
    }
    return { sucesso: false, mensagem: erro instanceof Error ? erro.message : 'Não foi possível salvar.' };
  }
}
