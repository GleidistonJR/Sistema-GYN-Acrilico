import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { prisma } from './prisma';

const COOKIE = 'sessao_segura';
const DURACAO = 365 * 24 * 60 * 60;
const RENOVAR_APOS = 30 * 24 * 60 * 60;
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
  const [user] = await prisma.$queryRaw<Array<{ id: string; role: string; email: string; apelido: string | null; colaboradorId: number; nome: string; sessaoExpiraEm: Date }>>`
    SELECT u.id, u.role, u.email, u.apelido, c.id AS "colaboradorId", c.nome, s."expiresAt" AS "sessaoExpiraEm"
    FROM "Sessao" s JOIN "User" u ON u.id = s."userId"
    JOIN "Colaborador" c ON c."userId" = u.id AND c."inativadoEm" IS NULL
    WHERE s."tokenHash" = ${hash(token)} AND s."expiresAt" > CURRENT_TIMESTAMP LIMIT 1`;
  return user ? { id: user.id, role: user.role, email: user.email, apelido: user.apelido, sessaoExpiraEm: user.sessaoExpiraEm,
    colaborador: { id: user.colaboradorId, nome: user.nome },
  } : null;
}

// Called only by Proxy, where response cookies can be written. Renew monthly,
// not on every message poll; never recreate a revoked or expired session.
export async function renovarSessaoPersistente(expiraEm: Date) {
  const agora = new Date();
  if (expiraEm.getTime() > agora.getTime() + (DURACAO - RENOVAR_APOS) * 1000) return null;
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const expires = new Date(agora.getTime() + DURACAO * 1000);
  const resultado = await prisma.sessao.updateMany({
    where: { tokenHash: hash(token), expiresAt: { gt: agora, lte: expiraEm } },
    data: { expiresAt: expires },
  });
  if (!resultado.count) return null;
  return { name: COOKIE, value: token, httpOnly: true, secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const, path: '/', maxAge: DURACAO, expires };
}

export async function removerSessao() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  if (token) await prisma.sessao.deleteMany({ where: { tokenHash: hash(token) } });
  cookieStore.delete(COOKIE);
  cookieStore.delete('sessao_admin');
}
