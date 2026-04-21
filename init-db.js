const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

(async () => {
    // Abre o arquivo do banco (se não existir, ele cria na hora)
    const db = await open({
        filename: './database.db',
        driver: sqlite3.Database
    });

    // Cria a tabela de registros
    await db.exec(`
        CREATE TABLE IF NOT EXISTS registros_ponto (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cpf TEXT NOT NULL,
            tipo TEXT NOT NULL,
            data_hora TEXT NOT NULL
        )
    `);

    console.log("Banco de dados e tabela criados com sucesso!");
})();