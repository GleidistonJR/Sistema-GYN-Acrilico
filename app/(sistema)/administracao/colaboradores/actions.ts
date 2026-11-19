"use server";
import { exigirUsuario } from "@/lib/autorizacao";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache"; // Importante para atualizar a tela
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';

interface Pontos {
  id: number;
  cpf?: string;
  dataHora: Date | string;
  tipo: string;
  colaborador: { nome: string };
}


export type FiltroColaboradores = 'ativos' | 'inativos' | 'todos';
export type DadosColaborador = {
  id?: number;
  nome: string;
  cargo: string;
  cpf: string;
  email?: string;
  senha?: string;
  role?: string;
};

const caminhoColaboradores = '/administracao/colaboradores';
const camposColaborador = { id: true, nome: true, cargo: true, cpf: true, inativadoEm: true } as const;
const perfis = ['ADMIN', 'USER', 'OUTRO'];

async function bloquearAlteracoes(tx: Prisma.TransactionClient, adminId: string) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(20261119, 5)::text AS bloqueio`;
  const admin = await tx.user.findFirst({
    where: { id: adminId, role: 'ADMIN', colaborador: { is: { inativadoEm: null } } }, select: { id: true },
  });
  if (!admin) throw new Error('Acesso não autorizado.');
}

async function protegerUltimoAdmin(tx: Prisma.TransactionClient, id: string) {
  const outroAdmin = await tx.user.findFirst({
    where: { id: { not: id }, role: 'ADMIN', colaborador: { is: { inativadoEm: null } } },
    select: { id: true },
  });
  if (!outroAdmin) throw new Error('Mantenha pelo menos um administrador ativo com acesso ao sistema.');
}

function erroColaborador(erro: unknown, fallback: string) {
  if (erro instanceof Prisma.PrismaClientKnownRequestError) {
    return erro.code === 'P2002' ? 'Já existe um cadastro com esse CPF ou e-mail.' : fallback;
  }
  return erro instanceof Error && !erro.name.startsWith('Prisma') ? erro.message : fallback;
}

export async function salvarColaborador(dados: DadosColaborador) {
  const admin = await exigirUsuario(['ADMIN']);
  try {
    const nome = dados.nome.trim();
    const cargo = dados.cargo.trim();
    const cpf = dados.cpf.replace(/\D/g, '');
    const email = dados.email?.trim() || '';
    const senha = dados.senha || '';
    const role = dados.role ?? 'USER';
    if (!nome || !cargo || !/^\d{11}$/.test(cpf)) return { sucesso: false, erro: 'Informe nome, cargo e CPF com 11 dígitos.' };
    if (!perfis.includes(role) || (email && !/^[^@\s]+@[^@\s]+$/.test(email)) || Buffer.byteLength(senha) > 72) {
      return { sucesso: false, erro: 'Confira o e-mail, o perfil de acesso e o limite de 72 bytes da senha.' };
    }
    const password = senha ? await bcrypt.hash(senha, 10) : undefined;
    const cadastro = { nome, cargo, cpf };
    await prisma.$transaction(async tx => {
      await bloquearAlteracoes(tx, admin.id);
      const existente = dados.id ? await tx.colaborador.findUnique({
        where: { id: dados.id }, select: { inativadoEm: true, user: { select: { id: true, role: true } } },
      }) : null;
      if (dados.id && !existente) throw new Error('Colaborador não encontrado.');
      if (existente?.inativadoEm && (email || password)) throw new Error('Colaboradores inativos não podem receber acesso.');
      if ((email || password || existente?.user) && (!email || (!existente?.user && !password))) {
        throw new Error('Informe e-mail e senha para criar o acesso.');
      }
      if (existente?.user?.role === 'ADMIN' && role !== 'ADMIN') await protegerUltimoAdmin(tx, existente.user.id);
      if (dados.id) {
        await tx.colaborador.update({
          where: { id: dados.id },
          data: {
            ...cadastro,
            ...(existente?.user ? { user: { update: { email, role, ...(password ? { password } : {}) } } }
              : email && password ? { user: { create: { email, password, role } } } : {}),
          },
        });
      } else {
        await tx.colaborador.create({ data: {
          ...cadastro, ...(email && password ? { user: { create: { email, password, role } } } : {}),
        } });
      }
    }, { timeout: 15000 });
    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, erro: erroColaborador(erro, 'Não foi possível salvar o colaborador.') };
  }
}

export async function buscarColaboradores(busca = '', filtro: FiltroColaboradores = 'ativos') {
  await exigirUsuario(['ADMIN']);
  const termo = busca.trim().slice(0, 120);
  const cpf = termo.replace(/\D/g, '');
  return prisma.colaborador.findMany({
    where: {
      ...(filtro === 'todos' ? {} : { inativadoEm: filtro === 'inativos' ? { not: null } : null }),
      ...(termo ? { OR: [
        { nome: { contains: termo, mode: 'insensitive' } },
        ...(cpf && /^[\d.\s-]+$/.test(termo) ? [{ cpf: { contains: cpf } }] : []),
      ] } : {}),
    },
    orderBy: [{ nome: 'asc' }, { id: 'asc' }],
    select: { ...camposColaborador, userId: true },
  });
}

export async function buscarColaboradorPorId(id: number) {
  await exigirUsuario(['ADMIN']);
  return prisma.colaborador.findUnique({
    where: { id },
    select: { ...camposColaborador, user: { select: { email: true, role: true } } },
  });
}

export async function inativarColaborador(id: number) {
  const admin = await exigirUsuario(['ADMIN']);
  try {
    await prisma.$transaction(async tx => {
      await bloquearAlteracoes(tx, admin.id);
      const colaborador = await tx.colaborador.findUnique({
        where: { id }, select: { inativadoEm: true, user: { select: { id: true, role: true } } },
      });
      if (!colaborador || colaborador.inativadoEm) throw new Error('Colaborador ativo não encontrado.');
      if (colaborador.user?.role === 'ADMIN') await protegerUltimoAdmin(tx, colaborador.user.id);
      await tx.colaborador.update({ where: { id }, data: { inativadoEm: new Date() } });
    }, { timeout: 15000 });
    revalidatePath(`${caminhoColaboradores}/${id}`);
    return { sucesso: true };
  } catch (erro) {
    return { sucesso: false, erro: erroColaborador(erro, 'Não foi possível inativar o colaborador.') };
  }
}

export async function atualizarPonto(dados: Pontos, motivo: string) {
  await exigirUsuario(['ADMIN']);
  try {
    if (dados.id) {
      // Se tem ID, é um UPDATE (prisma.colaborador.update...)
      const pontoAtualizado = await prisma.ponto.update({
        where: {
          id: dados.id, // Critério de busca (obrigatório ser um campo @unique)
        },
        data: {
          cpf: dados.cpf,
          dataHora: dados.dataHora,
          tipo: dados.tipo
        },
      });

      revalidatePath("/relatorioPontosAdmin");
      return { sucesso: true, colaborador: pontoAtualizado };
    }
  } catch (error) {
    console.error("Erro ao salvar colaborador:", error);
    return { sucesso: false, erro: "Não foi possível salvar o colaborador." };
  }
}


export async function deletarPonto(id: number) {
  await exigirUsuario(['ADMIN']);
  try {

    await prisma.ponto.delete({
      where: {
        id: id,
      },
    });

    // Isso avisa ao Next.js para limpar o cache e mostrar a lista atualizada
    revalidatePath("/relatorioPontosAdmin");

    return { sucesso: true };
  } catch (error) {
    console.error("Erro ao deletar:", error);
    return { sucesso: false, erro: "Não foi possível excluir o colaborador." };
  }
}

export async function adicionarPontoManual(formData: FormData) {
  await exigirUsuario(['ADMIN']);
  const colaboradorId = Number(formData.get("colaboradorId"));
  const dataHoraRaw = formData.get("dataHora") as string;
  const tipo = formData.get("tipo") as string;

  if (!colaboradorId || !dataHoraRaw || !tipo) {
    throw new Error("Preencha todos os campos obrigatórios.");
  }

  await prisma.ponto.create({
    data: {
      dataHora: new Date(dataHoraRaw),
      tipo: tipo,
      colaborador: {
        connect: {
          id: colaboradorId,
        },
      },
    },
  });
}


export async function adicionarAtestado(formData: FormData) {
  await exigirUsuario(['ADMIN']);
  const colaboradorId = Number(formData.get("colaboradorId"));
  const dataAtestadoRaw = formData.get("data") as string;
  const horas = Number(formData.get("horas"));
  const minutos = Number(formData.get("minutos"));

  if (!colaboradorId || !dataAtestadoRaw || isNaN(horas) || isNaN(minutos)) {
    throw new Error("Dados obrigatórios ausentes ou inválidos.");
  }

  const [ano, mes, dia] = dataAtestadoRaw.split("-").map(Number);
  const dataHora = new Date(ano, mes - 1, dia, 12, 0, 0, 0);

  if (isNaN(dataHora.getTime())) {
    throw new Error("A data fornecida é inválida.");
  }

  // Calculamos os minutos totais desse atestado
  const minutosAbonados = (horas * 60) + minutos;

  await prisma.ponto.create({
    data: {
      dataHora,
      // SALVAMOS OS MINUTOS NO TIPO: Ex: "Atestado: 240" (para 4 horas)
      tipo: `Atestado: ${minutosAbonados}`,
      colaborador: {
        connect: {
          id: colaboradorId,
        },
      },
    },
  });

  revalidatePath(`/administracao/colaboradores/${colaboradorId}`);
}

export async function criarFeriado(colaboradorId: number | string, dataStr: string) {
  await exigirUsuario(['ADMIN']);
  try {
    // 1. Converte e garante que o ID é um número válido
    const idValido = Number(colaboradorId);

    if (!idValido || isNaN(idValido)) {
      throw new Error("ID do colaborador inválido ou não fornecido.");
    }

    const dataHoraFeriado = new Date(`${dataStr}T12:00:00`);

    // 2. Cria o ponto usando o connect para evitar o erro do Prisma
    await prisma.ponto.create({
      data: {
        dataHora: dataHoraFeriado,
        tipo: "Feriado",
        colaborador: {
          connect: { id: idValido } // Altera de colaboradorId para connect
        }
      },
    });

    revalidatePath(`/administracao/colaboradores/${idValido}`);

    return { success: true };
  } catch (error) {
    console.error("Erro ao criar feriado:", error);
    throw new Error("Não foi possível registrar o feriado.");
  }
}
