// app/colaboradores/[id]/page.tsx
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";


interface DetalhesProps {
  params: Promise<{ id: string }>;
}

export default async function DetalhesColaborador({ params }: DetalhesProps) {
  const { id } = await params;
  const idNumero = Number(id);

  if (isNaN(idNumero)) return notFound();

  // 1. Busca o colaborador trazendo TODO o histórico de pontos dele
  const colaborador = await prisma.colaborador.findUnique({
    where: { id: idNumero },
    include: {
      pontos: {
        orderBy: { dataHora: 'asc' }, // Ordenar do mais antigo ao mais recente ajuda no cálculo
      },
    },
  });

  if (!colaborador) return notFound();

  // 2. CÁLCULO DE DIAS E HORAS TRABALHADAS
  
  // Set para armazenar as datas únicas (ex: "2026-05-15")
  const diasUnicos = new Set<string>();
  
  // Objeto para agrupar as datas/horas por dia real
  const pontosPorDia: { [data: string]: Date[] } = {};

  colaborador.pontos.forEach((ponto) => {
    const dataStr = ponto.dataHora.toISOString().split('T')[0]; // Pega apenas 'AAAA-MM-DD'
    
    // Adiciona ao Set de dias trabalhados
    diasUnicos.add(dataStr);

    // Agrupa os horários do mesmo dia
    if (!pontosPorDia[dataStr]) {
      pontosPorDia[dataStr] = [];
    }
    pontosPorDia[dataStr].push(ponto.dataHora);
  });

  const totalDiasTrabalhados = diasUnicos.size;
  let totalMilissegundos = 0;

  // Calcular as horas baseadas nos pares (Entrada -> Saída)
  Object.values(pontosPorDia).forEach((horarios) => {
    // Garante que estão em ordem cronológica no dia
    horarios.sort((a, b) => a.getTime() - b.getTime());

    // Percorre de 2 em 2 (i = Entrada, i+1 = Saída)
    for (let i = 0; i < horarios.length; i += 2) {
      if (horarios[i + 1]) {
        const entrada = horarios[i].getTime();
        const saida = horarios[i + 1].getTime();
        totalMilissegundos += (saida - entrada);
      }
    }
  });

  // Converte milissegundos para Horas e Minutos formatados
  const totalMinutos = Math.floor(totalMilissegundos / 1000 / 60);
  const horas = Math.floor(totalMinutos / 60);
  const minutos = totalMinutos % 60;
  const totalHorasFormatado = `${horas}h ${minutos.toString().padStart(2, '0')}m`;

  return (
    <main className="p-8 max-w-5xl m-auto text-gray-700">
      <h1 className="text-3xl font-bold mb-6 text-center lg:text-left">
        Ficha do Colaborador
      </h1>

      {/* Grid de Informações */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        
        {/* Card de Dados Pessoais */}
        <div className="bg-white p-6 rounded-xl shadow-sm border md:col-span-1">
          <h2 className="text-lg font-bold mb-3 border-b pb-2 text-gray-500 uppercase text-xs tracking-wider">Dados do Perfil</h2>
          <p className="mb-2"><strong>Nome:</strong> {colaborador.nome}</p>
          <p className="mb-2"><strong>Cargo:</strong> {colaborador.cargo}</p>
          <p className="mb-2"><strong>CPF:</strong> {colaborador.cpf}</p>
          <p><strong>Salário:</strong> {colaborador.salario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
        </div>

        {/* Card de Métricas Calculadas (Dias e Horas) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border md:col-span-2 grid grid-cols-2 gap-4">
          <div className="bg-green-50 p-4 rounded-lg flex flex-col justify-center items-center border border-green-100">
            <span className="text-md font-semibold uppercase text-green-700 tracking-wider">Dias Trabalhados</span>
            <span className="text-5xl font-extrabold text-green-600 mt-2">{totalDiasTrabalhados}</span>
            <span className="text-sm text-green-600 mt-1">dias com registro</span>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg flex flex-col justify-center items-center border border-blue-100">
            <span className="text-md font-semibold uppercase text-blue-700 tracking-wider">Total de Horas</span>
            <span className="text-5xl font-extrabold text-blue-600 mt-2">{totalHorasFormatado}</span>
            <span className="text-sm text-blue-600 mt-1">Trabalhadas</span>
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