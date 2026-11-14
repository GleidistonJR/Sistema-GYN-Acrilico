import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { prisma } from './prisma';

const COOKIE = 'sessao_segura';
const DURACAO = 12 * 60 * 60;
const hash = (token: string) => createHash('sha256').update(token).digest('hex');

export async function criarSessao(userId: string) {
  const cookieStore = await cookies();
  const anterior = cookieStore.get(COOKIE)?.value;
  const token = randomBytes(32).toString('hex');
  await prisma.$transaction(async tx => {
    await tx.sessao.deleteMany({ where: {
      OR: [
        { userId, expiresAt: { lte: new Date() } },
        ...(anterior ? [{ tokenHash: hash(anterior) }] : []),
      ],
    } });
    await tx.sessao.create({ data: {
      tokenHash: hash(token), userId, expiresAt: new Date(Date.now() + DURACAO * 1000),
    } });
  });
  cookieStore.set(COOKIE, token, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: DURACAO,
  });
}

export async function obterUsuarioSessao() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const sessao = await prisma.sessao.findUnique({
    where: { tokenHash: hash(token) },
    select: { expiresAt: true, user: { select: { id: true, role: true } } },
  });
  return sessao && sessao.expiresAt > new Date() ? sessao.user : null;
}

export async function removerSessao() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  if (token) await prisma.sessao.deleteMany({ where: { tokenHash: hash(token) } });
  cookieStore.delete(COOKIE);
  cookieStore.delete('sessao_admin');
}
