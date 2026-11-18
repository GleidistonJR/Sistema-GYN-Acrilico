-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "versaoEntrada" BIGINT NOT NULL DEFAULT 0,
ADD COLUMN     "versaoMensagens" BIGINT NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "LeituraConversa" (
    "userId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "versao" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "LeituraConversa_pkey" PRIMARY KEY ("userId","clienteId")
);

-- CreateIndex
CREATE INDEX "LeituraConversa_clienteId_idx" ON "LeituraConversa"("clienteId");

-- AddForeignKey
ALTER TABLE "LeituraConversa" ADD CONSTRAINT "LeituraConversa_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeituraConversa" ADD CONSTRAINT "LeituraConversa_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
-- Counters avoid loading message bodies for the customer list. Reads are per user.
-- PostgreSQL delivers notifications only after the transaction commits.

UPDATE "Cliente" c SET "versaoMensagens" = (SELECT count(*) FROM "MensagemWhatsApp" m WHERE m."clienteId" = c.id),
  "versaoEntrada" = (SELECT count(*) FROM "MensagemWhatsApp" m WHERE m."clienteId" = c.id AND m.direcao = 'ENTRADA');

CREATE FUNCTION atualizar_versao_conversa() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE "Cliente" SET "versaoMensagens" = "versaoMensagens" + 1,
      "versaoEntrada" = "versaoEntrada" + CASE WHEN NEW.direcao = 'ENTRADA' THEN 1 ELSE 0 END
      WHERE id = NEW."clienteId";
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE "Cliente" SET "versaoMensagens" = "versaoMensagens" + 1 WHERE id = OLD."clienteId";
  ELSIF ROW(NEW.status, NEW.ack, NEW.texto, NEW.erro) IS DISTINCT FROM ROW(OLD.status, OLD.ack, OLD.texto, OLD.erro) THEN
    UPDATE "Cliente" SET "versaoMensagens" = "versaoMensagens" + 1 WHERE id = NEW."clienteId";
  END IF;
  RETURN NULL;
END;
$$;
CREATE TRIGGER mensagem_versao AFTER INSERT OR UPDATE OR DELETE ON "MensagemWhatsApp"
  FOR EACH ROW EXECUTE FUNCTION atualizar_versao_conversa();

CREATE FUNCTION notificar_atendimento() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME = 'Cliente' AND TG_OP = 'UPDATE' THEN
    IF ROW(NEW.nome, NEW.telefone, NEW."responsavelId", NEW."ultimaMensagemEm", NEW."versaoMensagens")
      IS NOT DISTINCT FROM ROW(OLD.nome, OLD.telefone, OLD."responsavelId", OLD."ultimaMensagemEm", OLD."versaoMensagens") THEN
      RETURN NULL;
    END IF;
  END IF;
  PERFORM pg_notify('atendimento_alterado', '');
  RETURN NULL;
END;
$$;
CREATE TRIGGER cliente_evento AFTER INSERT OR UPDATE OR DELETE ON "Cliente" FOR EACH ROW EXECUTE FUNCTION notificar_atendimento();
CREATE TRIGGER leitura_evento AFTER INSERT OR UPDATE ON "LeituraConversa" FOR EACH ROW EXECUTE FUNCTION notificar_atendimento();
CREATE TRIGGER etiqueta_evento AFTER INSERT OR UPDATE OR DELETE ON "ClienteEtiqueta" FOR EACH ROW EXECUTE FUNCTION notificar_atendimento();
CREATE TRIGGER nova_etiqueta_evento AFTER INSERT OR UPDATE OR DELETE ON "Etiqueta" FOR EACH ROW EXECUTE FUNCTION notificar_atendimento();
