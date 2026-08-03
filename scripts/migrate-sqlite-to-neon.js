const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const sqlite = await open({
    filename: "prisma/dev.db",
    driver: sqlite3.Database,
  });

  console.log("Lendo SQLite...");

  // USER
  const users = await sqlite.all("SELECT * FROM User");
  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {},
      create: user,
    });
  }

  console.log(`✔ Users: ${users.length}`);

  // COLABORADOR
  const colaboradores = await sqlite.all("SELECT * FROM Colaborador");
  for (const colaborador of colaboradores) {
    await prisma.colaborador.upsert({
      where: { id: colaborador.id },
      update: {},
      create: colaborador,
    });
  }

  console.log(`✔ Colaboradores: ${colaboradores.length}`);

  // PONTO
  const pontos = await sqlite.all("SELECT * FROM Ponto");
  for (const ponto of pontos) {
  await prisma.ponto.upsert({
    where: { id: ponto.id },
    update: {},
    create: {
      ...ponto,
      dataHora: new Date(Number(ponto.dataHora)),
    },
  });
}

  console.log(`✔ Pontos: ${pontos.length}`);

  // INSUMO
  const insumos = await sqlite.all("SELECT * FROM Insumo");
  for (const insumo of insumos) {
    await prisma.insumo.upsert({
      where: { id: insumo.id },
      update: {},
      create: insumo,
    });
  }

  console.log(`✔ Insumos: ${insumos.length}`);

  // PRODUTO
  const produtos = await sqlite.all("SELECT * FROM Produto");
  for (const produto of produtos) {
    await prisma.produto.upsert({
      where: { id: produto.id },
      update: {},
      create: produto,
    });
  }

  console.log(`✔ Produtos: ${produtos.length}`);

  // PRODUTOINSUMO
  const produtoInsumos = await sqlite.all("SELECT * FROM ProdutoInsumo");
  for (const pi of produtoInsumos) {
    await prisma.produtoInsumo.upsert({
      where: { id: pi.id },
      update: {},
      create: pi,
    });
  }

  console.log(`✔ ProdutoInsumo: ${produtoInsumos.length}`);

  await sqlite.close();
  await prisma.$disconnect();

  console.log("\nMigração concluída com sucesso!");
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
});