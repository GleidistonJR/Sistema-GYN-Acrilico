import { createHash, randomBytes } from 'node:crypto';

export const hashToken = token => createHash('sha256').update(token).digest('hex');
export async function emitirTransferencia(db, payload) {
  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await db.$executeRaw`INSERT INTO "TransferenciaWhatsApp" ("tokenHash", payload, "expiresAt")
    VALUES (${hashToken(token)}, ${JSON.stringify(payload)}::jsonb, ${expiresAt})`;
  return token;
}
export async function lerTransferencia(db, token) {
  if (!/^[a-f0-9]{64}$/.test(token || '')) return null;
  const [ticket] = await db.$queryRaw`SELECT payload FROM "TransferenciaWhatsApp"
    WHERE "tokenHash" = ${hashToken(token)} AND "expiresAt" > NOW()`;
  if (!ticket) return null;
  const p = ticket.payload;
  // Recheck session revocation and operator role, including for previously issued links.
  const [allowed] = await db.$queryRaw`SELECT u.id FROM "Sessao" s JOIN "User" u ON u.id = s."userId"
    LEFT JOIN "Colaborador" operador ON operador."userId" = u.id
    JOIN "Cliente" c ON c.id = ${p.clienteId}
    WHERE s."tokenHash" = ${p.sessionHash} AND s."expiresAt" > NOW() AND u.id = ${p.userId}
    AND ((u.role = 'RECEPCAO' AND operador.id IS NULL)
      OR (u.role IN ('ADMIN', 'USER') AND operador.id IS NOT NULL AND operador."inativadoEm" IS NULL))`;
  return allowed ? p : null;
}
export async function urlPonte(db) {
  const [row] = await db.$queryRaw`SELECT url FROM "PonteMidiaWhatsApp" WHERE id = 'empresa' AND "atualizadoEm" > NOW() - INTERVAL '90 seconds'`;
  if (!row || !/^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/.test(row.url)) throw new Error('A conexão de arquivos está indisponível. Confira se o computador da empresa está ligado e conectado.');
  return row.url;
}
