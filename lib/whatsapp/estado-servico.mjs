export async function lerEstadoServico(prisma) {
  const [estado] = await prisma.$queryRaw`
    SELECT status, numero, "atualizadoEm",
      CASE WHEN "qrExpiraEm" > CURRENT_TIMESTAMP THEN qr END AS qr, mensagem
    FROM "EstadoServicoWhatsApp"
    WHERE id = 'empresa' AND "atualizadoEm" > CURRENT_TIMESTAMP - INTERVAL '90 seconds'`;
  if (!estado) throw new Error('O serviço WhatsApp está offline. Mantenha o computador de conexão ligado.');
  return { ...estado, atualizadoEm: estado.atualizadoEm.toISOString() };
}

export async function publicarEstadoServico(prisma, estado) {
  const qrExpiraEm = estado.qr ? new Date(Date.parse(estado.atualizadoEm) + 65000) : null;
  await prisma.$executeRaw`
    INSERT INTO "EstadoServicoWhatsApp" (id, status, numero, qr, "qrExpiraEm", mensagem, "atualizadoEm")
    VALUES ('empresa', ${estado.status}, ${estado.numero}, ${estado.qr}, ${qrExpiraEm}, ${estado.mensagem}, CURRENT_TIMESTAMP)
    ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, numero = EXCLUDED.numero,
      qr = EXCLUDED.qr, "qrExpiraEm" = EXCLUDED."qrExpiraEm", mensagem = EXCLUDED.mensagem, "atualizadoEm" = CURRENT_TIMESTAMP`;
}

export async function solicitarComandoServico(prisma, comando) {
  const resultado = await prisma.$executeRaw`
    UPDATE "EstadoServicoWhatsApp" SET comando = ${comando}, "comandoEm" = CURRENT_TIMESTAMP
    WHERE id = 'empresa' AND "atualizadoEm" > CURRENT_TIMESTAMP - INTERVAL '90 seconds'`;
  if (!resultado) throw new Error('O serviço WhatsApp está offline.');
}

export async function consumirComandoServico(prisma) {
  const [pedido] = await prisma.$queryRaw`
    WITH pedido AS (
      SELECT id, comando FROM "EstadoServicoWhatsApp"
      WHERE id = 'empresa' AND comando IS NOT NULL AND "comandoEm" > CURRENT_TIMESTAMP - INTERVAL '30 seconds'
      FOR UPDATE
    )
    UPDATE "EstadoServicoWhatsApp" e SET comando = NULL, "comandoEm" = NULL
    FROM pedido WHERE e.id = pedido.id RETURNING pedido.comando`;
  return pedido?.comando;
}
