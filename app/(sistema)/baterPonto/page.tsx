"use client";
import { useState } from 'react';
import { salvarPontoNoBanco } from './actions'; // Importe a ação que criamos
import { PatternFormat } from 'react-number-format';
import { useRouter } from 'next/navigation';

export default function RegistroPonto() {
  const [cpf, setCpf] = useState('');
  const [mensagem, setMensagem] = useState('');

  const router = useRouter();

  async function registrarPonto() {
    if (!cpf) return setMensagem("Você não digitiou seu CPF!");

    setMensagem("Registrando...");

    // Chamando a Server Action
    const resultado = await salvarPontoNoBanco(cpf);
    if (resultado.sucesso) {
      setMensagem(`Ponto registrado!`)
      setCpf('');
      router.push('/relatorioPontos');

    } else {
      setMensagem("Erro ao registrar ponto no banco de dados." + resultado.mensagem);
    }
  }


  return (
    <main className='py-0'>
      <h1 className='text-6xl my-5 text-center text-gray-700 font-bold'>Registrar Ponto</h1>

      <div className='text-center text-3xl w-100 mx-auto'>

        <PatternFormat
          format="###.###.###-##"
          mask="_"
          placeholder="000.000.000-00"
          className='border rounded mb-5 text-black p-2 w-full'
          value={cpf}
          // values é um objeto que contém 'value' (apenas números) e 'formattedValue' (com máscara)
          onValueChange={(values) => {
            setCpf(values.value); // Salva apenas "12345678901" no seu estado
          }}
        />

        <br />

        <button
          className='bg-blue-500 text-white rounded w-full py-2 hover:bg-blue-600 text-3xl'
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