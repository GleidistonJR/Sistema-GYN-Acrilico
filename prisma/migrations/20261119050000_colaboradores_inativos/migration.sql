BEGIN;

ALTER TABLE "Colaborador"
ADD COLUMN "inativadoEm" TIMESTAMP(3),
ALTER COLUMN "salario" SET DEFAULT 0;

DELETE FROM "User" u
WHERE NOT EXISTS (SELECT 1 FROM "Colaborador" c WHERE c."userId" = u.id);

CREATE FUNCTION revogar_acesso_colaborador() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."userId" IS NOT NULL THEN
    DELETE FROM "User" WHERE id = OLD."userId";
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER colaborador_inativado_revoga_acesso
AFTER UPDATE OF "inativadoEm" ON "Colaborador"
FOR EACH ROW WHEN (OLD."inativadoEm" IS NULL AND NEW."inativadoEm" IS NOT NULL)
EXECUTE FUNCTION revogar_acesso_colaborador();

CREATE TRIGGER colaborador_excluido_revoga_acesso
AFTER DELETE ON "Colaborador"
FOR EACH ROW EXECUTE FUNCTION revogar_acesso_colaborador();

CREATE TRIGGER colaborador_desvinculado_revoga_acesso
AFTER UPDATE OF "userId" ON "Colaborador"
FOR EACH ROW WHEN (OLD."userId" IS NOT NULL AND OLD."userId" IS DISTINCT FROM NEW."userId")
EXECUTE FUNCTION revogar_acesso_colaborador();

CREATE FUNCTION exigir_vinculo_usuario() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM "User" WHERE id = NEW.id) AND NOT EXISTS (
    SELECT 1 FROM "Colaborador" WHERE "userId" = NEW.id AND "inativadoEm" IS NULL
  ) THEN
    RAISE EXCEPTION 'O usuário precisa estar vinculado a um colaborador ativo.';
  END IF;
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER usuario_exige_colaborador_ativo
AFTER INSERT ON "User"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION exigir_vinculo_usuario();

COMMIT;
