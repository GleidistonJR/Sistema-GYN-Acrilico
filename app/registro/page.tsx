"use client";
import { useState } from 'react';

export default function RegistroPonto() {
  const [cpf, setCpf] = useState('');
  const [tipo, setTipo] = useState('Entrada');
  const [mensagem, setMensagem] = useState('');

  const lidarComRegistro = async () => {
    if (!cpf) return setMensagem("Você não digitiou seu CPF!");

    try {
      const resposta = await fetch('/api/registrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // 2. Agora enviamos o CPF e o TIPO selecionado
        body: JSON.stringify({
          cpf: cpf,
          tipo: tipo
        })
      });

      const resultado = await resposta.json();

      setMensagem(resultado.mensagem);
      setCpf(''); // Limpa o campo apos o sucesso
    } catch (erro) {
      setMensagem("Erro ao conectar com o servidor.");
    }
  };

  return (
    <main style={{ padding: '20px' }}>
      <h1 className='text-3xl m-5 text-center text-gray-700 font-bold'>Registros de Ponto</h1>

      <div className='text-center mt-5 p-5 text-xl'>

        <input
          type="number"
          placeholder="Digite seu CPF"
          className='border rounded m-3 text-black p-2'
          value={cpf}
          onChange={(e) => setCpf(e.target.value)}
        />

        <label htmlFor="tipoPonto"
          className='border rounded m-3 text-black p-2'>Tipo :

          <select
            id="tipoPonto"
            className="ml-2 outline-none"
            value={tipo} // 3. Conecta o valor ao estado
            onChange={(e) => setTipo(e.target.value)} // 4. Atualiza o estado ao mudar
          >
            <option value="entrada">Entrada</option>
            <option value="almoco">Saída (Almoço)</option>
            <option value="retorno">Retorno (Almoço)</option>
            <option value="saida">Saída</option>
          </select>
        </label>

        <br />

        <button
          className='bg-blue-500 text-white rounded px-5 py-2 hover:bg-blue-600 text-2xl'
          onClick={lidarComRegistro}
        >
          Registrar
        </button>

        {mensagem && (
          <p className="mt-4 text-gray-700 font-bold">{mensagem}</p>
        )}
      </div>
    </main>
  );
}