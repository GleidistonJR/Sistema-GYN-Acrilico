CREATE OR REPLACE FUNCTION notificar_fila_whatsapp() RETURNS trigger AS $$
BEGIN
  IF NEW.direcao = 'SAIDA' AND NEW.status = 'PENDENTE' THEN
    PERFORM pg_notify('whatsapp_envio', NEW.conta);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mensagem_whatsapp_envio
AFTER INSERT ON "MensagemWhatsApp"
FOR EACH ROW EXECUTE FUNCTION notificar_fila_whatsapp();

CREATE INDEX "MensagemWhatsApp_fila_pendente_idx"
ON "MensagemWhatsApp" (conta, "createdAt")
WHERE status = 'PENDENTE' AND direcao = 'SAIDA';
