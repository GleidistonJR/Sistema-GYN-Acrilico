# Sistema de Ponto - Next.js

## Fotos de materiais e produtos

Cada item aceita uma foto opcional pelo seletor de arquivos ou pela câmera do celular, quando suportada pelo navegador. A imagem é reduzida no dispositivo antes do envio e novamente validada no servidor: JPEG, até 640 px e 160 KB, sem metadados EXIF.

As fotos ficam na tabela `FotoItem` do PostgreSQL, separadas dos cadastros. A listagem consulta apenas ID e data de atualização; o arquivo é entregue por `/api/fotos/[id]` com sessão autenticada e cache privado. Aplicar as migrações com `npx prisma migrate deploy` e gerar o cliente com `npx prisma generate` antes de publicar. Não é necessário configurar armazenamento externo ou gravar arquivos no disco do servidor.

ADMIN pode gerenciar fotos de materiais e produtos. USER pode incluir foto ao criar um produto, mantendo a restrição de alterar somente descrição e estoque de produtos existentes.

Este é um projeto [Next.js](https://nextjs.org) inicializado com [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Começando

Primeiro, execute o servidor de desenvolvimento:

```bash
npm run dev
# ou
yarn dev
# ou
pnpm dev
# ou
bun dev
```

Abra [http://localhost:3000](http://localhost:3000) no seu navegador para ver o resultado.

Você pode começar a editar a página modificando o arquivo app/page.tsx. A página será atualizada automaticamente conforme você edita o arquivo.

Este projeto utiliza next/font para otimizar e carregar automaticamente a Geist, uma nova família de fontes da Vercel.

## Saiba Mais
Para saber mais sobre o Next.js, consulte os seguintes recursos:

* [Documentação do Next.js](https://nextjs.org/docs) - aprenda sobre as funcionalidades e a API do Next.js.

* [Aprenda Next.js](https://nextjs.org/learn) - um tutorial interativo de Next.js.

Pode também consultar o repositório do Next.js no GitHub - o seu feedback e contribuições são bem-vindos!

## Deploy na Vercel
A forma mais fácil de fazer o deploy da sua aplicação Next.js é utilizando a [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) dos criadores do Next.js.

Consulte a nossa [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) para mais detalhes.


# Atualização do Banco de Dados (Prisma)
Sempre que houver alterações no arquivo schema.prisma, utilize os comandos abaixo:

## Desenvolvimento (com histórico):

```bash
npx prisma migrate dev --name <descricao_da_mudança>
```
Cria a migração, aplica ao banco e gera o Prisma Client.

## Sincronização Rápida (sem histórico):

```bash
npx prisma db push
```
Ideal para testes rápidos ou prototipagem direta.

## Atualizar IntelliSense:

```bash
npx prisma generate
```
Rode se o editor não reconhecer os novos campos.


## pm2 status
## pm2 stop 'nome'
## pm2 start 'nome'
