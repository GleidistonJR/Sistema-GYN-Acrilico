"use client";
import { useState } from 'react';
import { salvarPontoNoBanco } from './actions'; // Importe a ação que criamos
import { PatternFormat } from 'react-number-format';

export default function RegistroPonto() {
  const [cpf, setCpf] = useState('');
  const [mensagem, setMensagem] = useState('');


  async function registrarPonto() {
    if (!cpf) return setMensagem("Você não digitiou seu CPF!");

    setMensagem("Registrando...");

    // Chamando a Server Action
    const resultado = await salvarPontoNoBanco(cpf);

    if (resultado.sucesso) {
      setMensagem(`Ponto registrado!`)
      setCpf('');
    } else {
      setMensagem("Erro ao registrar ponto no banco de dados." + resultado.mensagem);
    }
  }


  return (
    <main className='py-16'>
      <h1 className='text-6xl my-6 text-center text-gray-700 font-bold'>Registrar Ponto</h1>

      <div className='text-center text-3xl'>

        <PatternFormat
          format="###.###.###-##"
          mask="_"
          placeholder="000.000.000-00"
          className='border rounded m-3 text-black p-2'
          value={cpf}
          // values é um objeto que contém 'value' (apenas números) e 'formattedValue' (com máscara)
          onValueChange={(values) => {
            setCpf(values.value); // Salva apenas "12345678901" no seu estado
          }}
        />

        <br />

        <button
          className='bg-blue-500 text-white rounded px-16 py-2 hover:bg-blue-600 text-3xl'
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