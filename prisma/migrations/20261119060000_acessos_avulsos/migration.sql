BEGIN;

CREATE OR REPLACE FUNCTION exigir_vinculo_usuario() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  perfil TEXT;
BEGIN
  SELECT role INTO perfil FROM "User" WHERE id = NEW.id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF perfil IN ('PONTO', 'COMERCIAL') THEN
    IF EXISTS (SELECT 1 FROM "Colaborador" WHERE "userId" = NEW.id) THEN
      RAISE EXCEPTION 'Uma conta avulsa não pode ser vinculada a um colaborador.';
    END IF;
  ELSIF NOT EXISTS (SELECT 1 FROM "Colaborador" WHERE "userId" = NEW.id AND "inativadoEm" IS NULL) THEN
    RAISE EXCEPTION 'O usuário precisa estar vinculado a um colaborador ativo.';
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER usuario_exige_colaborador_ativo ON "User";
CREATE CONSTRAINT TRIGGER usuario_exige_colaborador_ativo
AFTER INSERT OR UPDATE OF role ON "User"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION exigir_vinculo_usuario();

CREATE FUNCTION validar_login_colaborador() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."userId" IS NOT NULL AND EXISTS (
    SELECT 1 FROM "User" WHERE id = NEW."userId" AND role IN ('PONTO', 'COMERCIAL')
  ) THEN
    RAISE EXCEPTION 'Uma conta avulsa não pode ser vinculada a um colaborador.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER colaborador_exige_login_pessoal
BEFORE INSERT OR UPDATE OF "userId" ON "Colaborador"
FOR EACH ROW EXECUTE FUNCTION validar_login_colaborador();

COMMIT;
