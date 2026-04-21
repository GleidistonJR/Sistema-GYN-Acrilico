import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
    const caminho = path.join(process.cwd(), 'pontos.json');

    // Se o arquivo não existir, retorna uma lista vazia
    if (!fs.existsSync(caminho)) {
        return NextResponse.json([]);
    }

    const conteudo = fs.readFileSync(caminho, 'utf-8');
    const registros = JSON.parse(conteudo);

    return NextResponse.json(registros);
}