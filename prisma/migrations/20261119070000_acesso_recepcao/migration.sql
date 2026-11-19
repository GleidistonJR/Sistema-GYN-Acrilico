BEGIN;

CREATE OR REPLACE FUNCTION exigir_vinculo_usuario() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  perfil TEXT;
BEGIN
  SELECT role INTO perfil FROM "User" WHERE id = NEW.id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF perfil IN ('PONTO', 'COMERCIAL', 'RECEPCAO') THEN
    IF EXISTS (SELECT 1 FROM "Colaborador" WHERE "userId" = NEW.id) THEN
      RAISE EXCEPTION 'Uma conta avulsa não pode ser vinculada a um colaborador.';
    END IF;
  ELSIF NOT EXISTS (SELECT 1 FROM "Colaborador" WHERE "userId" = NEW.id AND "inativadoEm" IS NULL) THEN
    RAISE EXCEPTION 'O usuário precisa estar vinculado a um colaborador ativo.';
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION validar_login_colaborador() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."userId" IS NOT NULL AND EXISTS (
    SELECT 1 FROM "User" WHERE id = NEW."userId" AND role IN ('PONTO', 'COMERCIAL', 'RECEPCAO')
  ) THEN
    RAISE EXCEPTION 'Uma conta avulsa não pode ser vinculada a um colaborador.';
  END IF;
  RETURN NEW;
END;
$$;

COMMIT;
