import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

interface DetalhesProps {
  params: Promise<{ id: string }>;
}

export default async function DetalhesColaborador({ params }: DetalhesProps) {
  const { id } = await params;
  const idNumero = Number(id);

  if (isNaN(idNumero)) return notFound();

  const colaborador = await prisma.colaborador.findUnique({
    where: { id: idNumero },
    include: {
      pontos: {
        orderBy: { dataHora: 'asc' },
      },
    },
  });

  if (!colaborador) return notFound();

  // ===================================================
  // CONFIGURAÇÃO DA JORNADA (8h 30m por dia útil)
  // ===================================================
  const MINUTOS_ESPERADOS_POR_DIA = 8 * 60 + 30; // 510 minutos

  const diasUnicos = new Set<string>();
  const pontosPorDia: { [data: string]: Date[] } = {};

  colaborador.pontos.forEach((ponto) => {
    const dataStr = ponto.dataHora.toISOString().split('T')[0];
    diasUnicos.add(dataStr);

    if (!pontosPorDia[dataStr]) {
      pontosPorDia[dataStr] = [];
    }
    pontosPorDia[dataStr].push(ponto.dataHora);
  });

  const totalDiasTrabalhados = diasUnicos.size;
  let totalMilissegundosTrabalhados = 0;
  let totalMinutosEsperados = 0;

  // 1. Calcular Horas Trabalhadas Realizadas
  Object.values(pontosPorDia).forEach((horarios) => {
    horarios.sort((a, b) => a.getTime() - b.getTime());

    for (let i = 0; i < horarios.length; i += 2) {
      if (horarios[i + 1]) {
        const entrada = horarios[i].getTime();
        const saida = horarios[i + 1].getTime();
        totalMilissegundosTrabalhados += (saida - entrada);
      }
    }
  });

  // 2. Calcular Horas Esperadas baseadas APENAS nos dias úteis trabalhados
  diasUnicos.forEach((dataStr) => {
    const data = new Date(`${dataStr}T12:00:00`); // Evita problemas de fuso horário
    const diaDaSemana = data.getDay(); // 0 = Domingo, 6 = Sábado

    // Se o dia trabalhado for de Segunda (1) a Sexta (5), adiciona a jornada esperada
    if (diaDaSemana >= 1 && diaDaSemana <= 5) {
      totalMinutosEsperados += MINUTOS_ESPERADOS_POR_DIA;
    }
    // Obs: Se ele trabalhou no Sábado ou Domingo, não adiciona minutos esperados (tudo vira hora extra/crédito)
  });

  // Conversão das horas realizadas
  const totalMinutosTrabalhados = Math.floor(totalMilissegundosTrabalhados / 1000 / 60);
  const horasTrabalhadas = Math.floor(totalMinutosTrabalhados / 60);
  const minutosTrabalhados = totalMinutosTrabalhados % 60;
  const totalHorasFormatado = `${horasTrabalhadas}h ${minutosTrabalhados.toString().padStart(2, '0')}m`;

  // 3. CÁLCULO DO BANCO DE HORAS (Diferença entre Realizado e Esperado)
  const saldoMinutosCompleto = totalMinutosTrabalhados - totalMinutosEsperados;
  const isPositivo = saldoMinutosCompleto >= 0;
  
  // Transforma em valor absoluto para fazer a formatação de exibição textual
  const minutosSaldoAbsoluto = Math.abs(saldoMinutosCompleto);
  const horasSaldo = Math.floor(minutosSaldoAbsoluto / 60);
  const minutosSaldo = minutosSaldoAbsoluto % 60;
  const saldoFormatado = `${horasSaldo}h ${minutosSaldo.toString().padStart(2, '0')}m`;

  return (
    <main className="p-8 max-w-5xl m-auto text-gray-700">
      <h1 className="text-3xl font-bold mb-6 text-center lg:text-left">
        Ficha do Colaborador
      </h1>

      {/* Grid de Informações */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        
        {/* Card de Dados Pessoais */}
        <div className="bg-white p-6 rounded-xl shadow-sm border md:col-span-1">
          <h2 className="text-lg font-bold mb-3 border-b pb-2 text-gray-500 uppercase tracking-wider">Dados do Perfil</h2>
          <p className="mb-2"><strong>Nome:</strong> {colaborador.nome}</p>
          <p className="mb-2"><strong>Cargo:</strong> {colaborador.cargo}</p>
          <p className="mb-2"><strong>CPF:</strong> {colaborador.cpf}</p>
          <p><strong>Salário:</strong> {colaborador.salario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
        </div>

        {/* Card de Métricas Calculadas e Banco de Horas */}
        <div className="bg-white p-6 rounded-xl shadow-sm border md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          <div className="bg-gray-50 p-4 rounded-lg flex flex-col justify-center items-center border border-gray-200">
            <span className="text-xs font-semibold uppercase text-gray-500 tracking-wider">Dias Trabalhados</span>
            <span className="text-3xl font-extrabold text-gray-700 mt-2">{totalDiasTrabalhados}</span>
            <span className="text-xs text-gray-400 mt-1">com registro</span>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg flex flex-col justify-center items-center border border-blue-100">
            <span className="text-xs font-semibold uppercase text-blue-700 tracking-wider">Horas Realizadas</span>
            <span className="text-3xl font-extrabold text-blue-600 mt-2">{totalHorasFormatado}</span>
            <span className="text-xs text-blue-400 mt-1">tempo trabalhado</span>
          </div>

          {/* CARD DO BANCO DE HORAS DINÂMICO */}
          <div className={`p-4 rounded-lg flex flex-col justify-center items-center border transition-colors ${
            isPositivo 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <span className="text-xs font-semibold uppercase tracking-wider">Banco de Horas</span>
            <span className="text-3xl font-extrabold mt-2">
              {isPositivo ? `+ ${saldoFormatado}` : `- ${saldoFormatado}`}
            </span>
            <span className="text-xs font-medium mt-1">
              {isPositivo ? 'Horas de Crédito' : 'Horas em Falta'}
            </span>
          </div>

        </div>
      </div>

      {/* Tabela do histórico de batidas dele */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <h2 className="text-lg font-bold p-4 bg-gray-50 border-b">Histórico Completo de Pontos</h2>
        <table className="w-full text-center border-collapse">
          <thead>
            <tr className="bg-gray-100 text-gray-600 text-sm">
              <th className="p-3 border-b">Data</th>
              <th className="p-3 border-b">Hora</th>
              <th className="p-3 border-b">Tipo de Registro</th>
            </tr>
          </thead>
          <tbody>
            {colaborador.pontos.length > 0 ? (
              colaborador.pontos.map((ponto) => (
                <tr key={ponto.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">{new Date(ponto.dataHora).toLocaleDateString('pt-BR')}</td>
                  <td className="p-3 font-semibold">
                    {new Date(ponto.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="p-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      ponto.tipo === 'Entrada' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                    }`}>
                      {ponto.tipo}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="p-4 text-gray-400">Este funcionário ainda não possui pontos registrados.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}