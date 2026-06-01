"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache"; // Importante para atualizar a tela

interface Colaboradortype {
  id?: number; // Opcional, pois no 'Novo' ele ainda não existe
  nome: string;
  cargo: string;
  cpf: string;
  salario: number;
}

interface Pontos {
  id: number;
  cpf: string;
  dataHora: Date | string;
  tipo: string;
  colaborador: { nome: string };
}


// FUNÇÃO 1: CRIAR
export async function salvarColaborador(dados: Colaboradortype) {
  try {
    if (dados.id) {
      // Se tem ID, é um UPDATE (prisma.colaborador.update...)
      const colaboradorAtualizado = await prisma.colaborador.update({
        where: {
          id: dados.id, // Critério de busca (obrigatório ser um campo @unique)
        },
        data: {
          nome: dados.nome, // Novos dados
          cargo: dados.cargo,
          cpf: dados.cpf,
          salario: dados.salario,
        },
      });

      revalidatePath("/colaboradores");
      return { sucesso: true, colaborador: colaboradorAtualizado };
    } else {
      // Se não tem ID, é um CREATE (prisma.colaborador.create...)
      const novoColaborador = await prisma.colaborador.create({
        data: {
          nome: dados.nome,
          cargo: dados.cargo,
          cpf: dados.cpf,
          salario: dados.salario,
        },
      });

      revalidatePath("/colaboradores");
      return { sucesso: true, colaborador: novoColaborador };
    }
  } catch (error) {
    console.error("Erro ao salvar colaborador:", error);
    return { sucesso: false, erro: "Não foi possível salvar o colaborador." };
  }
}

// FUNÇÃO 2: BUSCAR
export async function buscarColaboradores(filtroCpf?: string) {
  try {
    const colaboradores = await prisma.colaborador.findMany({
      where: filtroCpf ? { cpf: { contains: filtroCpf } } : {},
      orderBy: {
        nome: 'asc', // Organiza por ordem alfabética
      },
    });

    revalidatePath("/colaboradores");
    return colaboradores;
  } catch (error) {
    console.error("Erro ao buscar colaboradores:", error);
    return [];
  }
}

// Para a edição
export async function buscarColaboradorPorId(id: number) {
  return await prisma.colaborador.findUnique({
    where: { id }
  });
}

// FUNÇÃO 3: DELETAR
export async function deletarColaborador(id: number) {
  try {

    await prisma.colaborador.delete({
      where: {
        id: id,
      },
    });

    // Isso avisa ao Next.js para limpar o cache e mostrar a lista atualizada
    revalidatePath("/colaboradores");

    return { sucesso: true };
  } catch (error) {
    console.error("Erro ao deletar:", error);
    return { sucesso: false, erro: "Não foi possível excluir o colaborador." };
  }
}

export async function atualizarPonto(dados: Pontos, motivo: string) {
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

