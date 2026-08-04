import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient({
    // Adicione esta linha para ver os detalhes no terminal/logs da Vercel
    log: ["query", "info", "warn", "error"], 
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma