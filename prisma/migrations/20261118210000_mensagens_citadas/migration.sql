ALTER TABLE "MensagemWhatsApp" ADD COLUMN citacao JSONB;

CREATE OR REPLACE FUNCTION atualizar_versao_conversa() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE "Cliente" SET "versaoMensagens" = "versaoMensagens" + 1,
      "versaoEntrada" = "versaoEntrada" + CASE WHEN NEW.direcao = 'ENTRADA' THEN 1 ELSE 0 END
      WHERE id = NEW."clienteId";
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE "Cliente" SET "versaoMensagens" = "versaoMensagens" + 1 WHERE id = OLD."clienteId";
  ELSIF ROW(NEW.status, NEW.ack, NEW.texto, NEW.erro, NEW.citacao)
    IS DISTINCT FROM ROW(OLD.status, OLD.ack, OLD.texto, OLD.erro, OLD.citacao) THEN
    UPDATE "Cliente" SET "versaoMensagens" = "versaoMensagens" + 1 WHERE id = NEW."clienteId";
  END IF;
  RETURN NULL;
END;
$$;
