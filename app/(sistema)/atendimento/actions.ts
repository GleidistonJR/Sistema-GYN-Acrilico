'use server';

import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { exigirUsuario } from '@/lib/autorizacao';
import { prisma } from '@/lib/prisma';
import { validarApelido } from '@/lib/whatsapp/assinatura.mjs';
import { normalizarTelefone, podeEditarCliente, validarTexto } from '@/lib/atendimento/regras';

type Resultado = { sucesso: boolean; mensagem: string };

export async function alterarAtendimento(_anterior: Resultado, form: FormData): Promise<Resultado> {
  // Every mutation validates the server session, including direct action requests.
  const usuario = await exigirUsuario();
  try {
    const acao = form.get('acao');
    if (acao === 'meuApelido') {
      const apelido = validarApelido(form.get('apelido'));
      // Only the authenticated account can change its signature, never a posted user ID.
      await prisma.$executeRaw`UPDATE "User" SET apelido = ${apelido} WHERE id = ${usuario.id}`;
    } else if (acao === 'criarCliente') {
      await prisma.cliente.create({ data: {
        nome: validarTexto(form.get('nome'), 120),
        telefone: normalizarTelefone(form.get('telefone')),
      } });
    } else if (acao === 'criarEtiqueta') {
      if (usuario.role !== 'ADMIN') throw new Error('Somente administradores podem criar etiquetas.');
      await prisma.etiqueta.create({ data: { nome: validarTexto(form.get('nome'), 40).toLocaleLowerCase('pt-BR') } });
    } else if (acao === 'renomear') {
      const id = validarTexto(form.get('clienteId'), 100);
      const nome = validarTexto(form.get('nome'), 120);
      const resultado = await prisma.cliente.updateMany({
        where: { id, ...(usuario.role === 'ADMIN' ? {} : { OR: [{ responsavelId: usuario.id }, { responsavelId: null }] }) },
        data: { nome },
      });
      if (resultado.count !== 1) throw new Error('Cliente não disponível para alteração. Atualize a conversa.');
    } else {
      const id = validarTexto(form.get('clienteId'), 100);
      await prisma.$transaction(async tx => {
        if (acao === 'assumir') {
          // A single conditional UPDATE prevents two sellers from claiming the same customer.
          const resultado = await tx.cliente.updateMany({
            where: { id, responsavelId: null }, data: { responsavelId: usuario.id },
          });
          if (resultado.count !== 1) throw new Error('Este cliente já foi assumido. Atualize a lista.');
          await tx.atribuicaoCliente.create({ data: { clienteId: id, atorId: usuario.id, novoId: usuario.id } });
          return;
        }
        const cliente = await tx.cliente.findUnique({ where: { id }, select: { responsavelId: true } });
        if (!cliente || !podeEditarCliente(usuario, cliente.responsavelId)) throw new Error('Cliente não disponível para alteração.');
        if (acao === 'transferir') {
          if (usuario.role !== 'ADMIN') throw new Error('Somente administradores podem transferir clientes.');
          const novoId = form.get('responsavelId') ? validarTexto(form.get('responsavelId'), 100) : null;
          if (novoId && !await tx.user.findFirst({ where: { id: novoId, role: { in: ['ADMIN', 'USER'] } }, select: { id: true } })) {
            throw new Error('Vendedor indisponível.');
          }
          const alterado = await tx.cliente.updateMany({ where: { id, responsavelId: cliente.responsavelId }, data: { responsavelId: novoId } });
          if (alterado.count !== 1) throw new Error('O responsável mudou. Atualize a lista.');
          await tx.atribuicaoCliente.create({ data: { clienteId: id, atorId: usuario.id, anteriorId: cliente.responsavelId, novoId } });
        } else if (acao === 'etiquetar' || acao === 'removerEtiqueta') {
          // Lock the customer row using a guarded update; ownership cannot change during this transaction.
          const alterado = await tx.cliente.updateMany({ where: { id, responsavelId: cliente.responsavelId }, data: { updatedAt: new Date() } });
          if (alterado.count !== 1) throw new Error('O responsável mudou. Atualize a lista.');
          const etiquetaId = validarTexto(form.get('etiquetaId'), 100);
          if (acao === 'etiquetar') {
            await tx.clienteEtiqueta.upsert({ where: { clienteId_etiquetaId: { clienteId: id, etiquetaId } }, create: { clienteId: id, etiquetaId }, update: {} });
          } else {
            await tx.clienteEtiqueta.deleteMany({ where: { clienteId: id, etiquetaId } });
          }
        } else throw new Error('Operação inválida.');
      });
    }
    revalidatePath('/atendimento');
    return { sucesso: true, mensagem: 'Alteração salva.' };
  } catch (erro) {
    if (erro instanceof Prisma.PrismaClientKnownRequestError) {
      return { sucesso: false, mensagem: erro.code === 'P2002' ? 'Telefone ou etiqueta já cadastrado.' : 'Não foi possível salvar. Atualize a página e tente novamente.' };
    }
    if (erro instanceof Prisma.PrismaClientInitializationError || erro instanceof Prisma.PrismaClientValidationError) {
      return { sucesso: false, mensagem: 'Cadastro indisponível. Tente novamente mais tarde.' };
    }
    return { sucesso: false, mensagem: erro instanceof Error ? erro.message : 'Não foi possível salvar.' };
  }
}
