CREATE TABLE "Sessao" (
    "tokenHash" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Sessao_pkey" PRIMARY KEY ("tokenHash")
);
CREATE INDEX "Sessao_userId_idx" ON "Sessao"("userId");
CREATE INDEX "Sessao_expiresAt_idx" ON "Sessao"("expiresAt");
ALTER TABLE "Sessao" ADD CONSTRAINT "Sessao_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
