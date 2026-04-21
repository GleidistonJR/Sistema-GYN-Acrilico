// app/api/registrar/route.ts
import { NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

// No App Router, a função DEVE se chamar POST
export async function POST(req) {
  let db;

  try {
    // 1. Extrair os dados do corpo da requisição
    // No App Router, usamos req.json() em vez de req.body
    const { cpf, tipo } = await req.json();

    if (!cpf) {
      return NextResponse.json(
        { mensagem: "O CPF é obrigatório." },
        { status: 400 }
      );
    }

    // 2. Abrir o banco de dados
    db = await open({
      filename: path.join(process.cwd(), 'database.db'),
      driver: sqlite3.Database
    });

    const agora = new Date().toISOString();

    // 3. Inserir no SQLite
    await db.run(
      'INSERT INTO registros_ponto (cpf, tipo, data_hora) VALUES (?, ?, ?)',
      [cpf, tipo || 'Entrada', agora]
    );

    // 4. Retornar resposta de sucesso
    return NextResponse.json(
      { mensagem: `Ponto de ${tipo || 'entrada'} registrado!` },
      { status: 200 }
    );

  } catch (erro) {
    console.error("Erro na API de registro:", erro);
    return NextResponse.json(
      { mensagem: "Erro ao salvar no banco de dados." },
      { status: 500 }
    );
  } finally {
    // 5. Sempre fechar a conexão
    if (db) {
      await db.close();
    }
  }
}