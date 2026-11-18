export async function lerEstadoServico(prisma) {
  const [estado] = await prisma.$queryRaw`
    SELECT status, numero, "atualizadoEm" FROM "EstadoServicoWhatsApp"
    WHERE id = 'empresa' AND "atualizadoEm" > CURRENT_TIMESTAMP - INTERVAL '45 seconds'`;
  if (!estado) throw new Error('O serviço WhatsApp está offline. Mantenha o computador de conexão ligado.');
  return { ...estado, atualizadoEm: estado.atualizadoEm.toISOString(), qr: null, mensagem: null };
}

export async function publicarEstadoServico(prisma, estado) {
  await prisma.$executeRaw`
    INSERT INTO "EstadoServicoWhatsApp" (id, status, numero, "atualizadoEm")
    VALUES ('empresa', ${estado.status}, ${estado.numero}, CURRENT_TIMESTAMP)
    ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, numero = EXCLUDED.numero, "atualizadoEm" = CURRENT_TIMESTAMP`;
}
