BEGIN;

DROP TRIGGER nova_etiqueta_evento ON "Etiqueta";
CREATE TRIGGER etiqueta_catalogo_evento
AFTER INSERT OR UPDATE OR DELETE ON "Etiqueta"
FOR EACH STATEMENT EXECUTE FUNCTION notificar_atendimento();

COMMIT;
