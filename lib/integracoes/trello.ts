import 'server-only';
import { ErroPlataforma } from './bling';

export function configuracaoTrello() {
  const { TRELLO_API_KEY: chave, TRELLO_TOKEN: token, TRELLO_LISTA_PEDIDOS: lista } = process.env;
  return chave && token && lista && /^[a-f0-9]{24}$/i.test(lista) ? { chave, token, lista } : null;
}

type Cartao = { name: string; desc: string; shortUrl: string };
type TrelloConfig = NonNullable<ReturnType<typeof configuracaoTrello>>;

async function trello<T>(config: TrelloConfig, caminho: string, corpo?: object): Promise<T> {
  const resposta = await fetch('https://api.trello.com/1' + caminho, {
    method: corpo ? 'POST' : 'GET',
    headers: {
      Authorization: `OAuth oauth_consumer_key="${config.chave}", oauth_token="${config.token}"`,
      'Content-Type': 'application/json',
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  });
  if (!resposta.ok) throw new ErroPlataforma(resposta.status, 'Trello', corpo ? 'a criação do cartão' : 'a consulta');
  return resposta.json();
}

async function quadroTrello(config: TrelloConfig) {
  const { idBoard, closed } = await trello<{ idBoard: string; closed: boolean }>(config, '/lists/' + config.lista + '?fields=idBoard,closed');
  if (closed || !/^[a-f0-9]{24}$/i.test(idBoard)) throw new Error('Confira se a lista de pedidos do Trello está aberta.');
  return idBoard;
}

export async function procurarCartao(config: TrelloConfig, marcador: string) {
  const quadro = await quadroTrello(config);
  const cartoes = await trello<Cartao[]>(config, '/boards/' + quadro + '/cards/all?fields=name,desc,shortUrl');
  return cartoes.find(cartao => cartao.desc?.split('\n').includes(marcador));
}

export function criarCartao(config: TrelloConfig, name: string, desc: string) {
  return trello<Cartao>(config, '/cards', { idList: config.lista, name, desc });
}

export function urlCartao(valor: string) {
  if (typeof valor !== 'string' || !/^https:\/\/trello\.com\/c\/[A-Za-z0-9]+(?:\/[^\s]*)?$/.test(valor)) {
    throw new Error('O Trello não retornou um link de cartão válido.');
  }
  return valor;
}
