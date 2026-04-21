"use client";
import { useState } from 'react';
import { salvarPontoNoBanco } from './actions'; // Importe a ação que criamos

export default function RegistroPonto() {
  const [cpf, setCpf] = useState('');
  const [tipo, setTipo] = useState('entrada');
  const [mensagem, setMensagem] = useState('');


  async function registrarPonto() {
    if (!cpf) return setMensagem("Você não digitiou seu CPF!");

    setMensagem("Registrando...");
    
    // Chamando a Server Action
    const resultado = await salvarPontoNoBanco(cpf, tipo);

    if (resultado.sucesso) {
      setMensagem(`Ponto de ${tipo || 'entrada'} registrado!`)
      setCpf('');
    } else {
      setMensagem("Erro ao registrar ponto no banco de dados.");
    }
  }


  return (
    <main style={{ padding: '20px' }}>
      <h1 className='text-3xl my-10 text-center text-gray-700 font-bold'>Registros de Ponto</h1>

      <div className='text-center text-xl'>

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
            className=""
            value={tipo} // 3. Conecta o valor ao estado
            onChange={(e) => setTipo(e.target.value)} // 4. Atualiza o estado ao mudar
          >
            <option value="entrada">Entrada</option>
            <option value="almoço">Saída (Almoço)</option>
            <option value="retorno">Retorno (Almoço)</option>
            <option value="saida">Saída</option>
          </select>
        </label>

        <br />

        <button
          className='bg-blue-500 text-white rounded px-8 py-2 hover:bg-blue-600 text-xl'
          onClick={registrarPonto}
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