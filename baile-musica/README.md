# Pedidos de Música · Baile de Máscaras

Site de pedidos de música para o baile do grêmio. O público lê o QR code, busca a música e pede.
O DJ vê a fila em tempo real num painel protegido por senha.

| Página | Quem usa | Endereço |
|---|---|---|
| Pedidos | Público (QR code) | `/` |
| Painel do DJ e do grêmio | DJ e grêmio (com senha) | `/dj` |
| Cartaz para imprimir | Grêmio | `/cartaz` |

## Como o filtro funciona

- **Música limpa:** vai direto para a fila do DJ.
- **Explícita no iTunes, versão editada ou com palavra da lista** (`lib/blocklist.ts`): o público consegue pedir,
  mas o pedido vai para a aba **Revisão** do painel, com cor vermelha (explícita) ou amarela (editada).
  O grêmio escolhe: **Aprovar**, **Aprovar c/ censura** (aparece "CENSURAR NA TRANSIÇÃO" na fila do DJ) ou **Recusar**.
- **Artista em `BLOCKED_ARTISTS`** (`lib/blocklist.ts`, começa vazia): recusado na hora, "Não permitida no baile".
- **Modo aprovação** (interruptor no painel): quando ligado, TODO pedido passa pela Revisão.

Limites: 1 pedido a cada 5 min e 5 por noite por aparelho; 30 por hora por rede. Os valores ficam em `lib/ratelimit.ts`.

## Variáveis de ambiente

| Variável | Para que serve |
|---|---|
| `DATABASE_URL` | Postgres (criada sozinha pela integração Neon na Vercel) |
| `DJ_PASSWORD` | Senha do painel `/dj`. Sem ela, o painel fica sempre bloqueado |
| `IP_HASH_SALT` | Texto aleatório longo: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `NEXT_PUBLIC_SITE_URL` | URL pública final (QR code e cartaz) |

## Deploy na Vercel

1. Na Vercel: **Add New → Project**, importe o repositório `berrohde/berrohde`.
   Em **Root Directory**, escolha **`baile-musica`** (o app está nesta pasta). Framework: Next.js.
2. No projeto, aba **Storage → Create Database → Neon (Postgres)**, região São Paulo se aparecer, e conecte ao projeto.
3. **Settings → Environment Variables** (Production): `DJ_PASSWORD`, `IP_HASH_SALT`, `NEXT_PUBLIC_SITE_URL`.
4. **Deployments → Redeploy** (para pegar as variáveis). As tabelas são criadas sozinhas no primeiro acesso
   (o esquema fica em `lib/schema.ts`; `npm run db:init` faz o mesmo à mão). Abra a URL no celular e teste.
5. Com a URL final definida: abra `/cartaz` e imprima (Ctrl+P, A4, "gráficos de fundo" ligado),
   ou rode `npm run qr` para gerar `qr/pedir-musica.png` e `.svg`.

As funções rodam em São Paulo (`vercel.json` → `gru1`).

## Rodar localmente

```bash
cp .env.example .env.local   # preencha
npm install
npm run db:init
npm run dev                   # http://localhost:3000
```

## Testes

```bash
npm run build
TEST_DATABASE_URL=postgres://usuario@localhost:5432/banco_de_teste npm test   # APAGA os pedidos desse banco
```

## Fim da festa

No painel, botão **"Apagar tudo (fim da festa)"** no rodapé (pede confirmação duas vezes).
Apaga todos os pedidos, inclusive os identificadores de aparelho e hashes de IP.

## Plano B

- Se a busca do iTunes cair (limite), o painel do DJ continua funcionando; peça para o público tentar em 1 minuto.
- Se o site inteiro cair: caixinha de perguntas do Instagram.
- O QR funciona também nos dados móveis, se o wifi do salão não aguentar.
