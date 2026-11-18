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
  // One parameterized round trip instead of separate session/user/profile queries.
  const [user] = await prisma.$queryRaw<Array<{ id: string; role: string; email: string; apelido: string | null; colaboradorId: number | null; nome: string | null }>>`
    SELECT u.id, u.role, u.email, u.apelido, c.id AS "colaboradorId", c.nome
    FROM "Sessao" s JOIN "User" u ON u.id = s."userId"
    LEFT JOIN "Colaborador" c ON c."userId" = u.id
    WHERE s."tokenHash" = ${hash(token)} AND s."expiresAt" > CURRENT_TIMESTAMP LIMIT 1`;
  return user ? { id: user.id, role: user.role, email: user.email, apelido: user.apelido,
    colaborador: user.colaboradorId === null ? null : { id: user.colaboradorId, nome: user.nome! },
  } : null;
}

export async function removerSessao() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  if (token) await prisma.sessao.deleteMany({ where: { tokenHash: hash(token) } });
  cookieStore.delete(COOKIE);
  cookieStore.delete('sessao_admin');
}
