// Testes das rotas contra um Postgres de teste (TEST_DATABASE_URL) com o iTunes simulado.
import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { NextRequest } from "next/server";

const DB = process.env.TEST_DATABASE_URL;
process.env.DATABASE_URL = DB ?? "";
process.env.DJ_PASSWORD = "senha-certa";
process.env.IP_HASH_SALT = "sal";

const skip = !DB && "defina TEST_DATABASE_URL (Postgres local) para rodar";

type Fake = { trackId: number; trackName: string; artistName: string; trackExplicitness?: string };
const catalog: Fake[] = [
  { trackId: 1, trackName: "Evidências", artistName: "Chitãozinho & Xororó" },
  { trackId: 2, trackName: "Ai Se Eu Te Pego", artistName: "Michel Teló" },
  { trackId: 3, trackName: "Explícita", artistName: "Alguém", trackExplicitness: "explicit" },
];

const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL) => {
  const url = new URL(String(input));
  if (url.hostname !== "itunes.apple.com") return realFetch(input);
  const toResult = (t: Fake) => ({
    wrapperType: "track",
    kind: "song",
    trackExplicitness: "notExplicit",
    collectionName: "Álbum",
    previewUrl: "https://example.com/p.m4a",
    ...t,
  });
  if (url.pathname === "/lookup") {
    const t = catalog.find((c) => c.trackId === Number(url.searchParams.get("id")));
    return Response.json({ results: t ? [toResult(t)] : [] });
  }
  return Response.json({ results: catalog.map(toResult) });
}) as typeof fetch;

const uuid = () => crypto.randomUUID();
const auth = (pw: string) => ({ authorization: `Basic ${Buffer.from(`dj:${pw}`).toString("base64")}` });

async function post(trackId: number, deviceId: string, ip = "10.0.0.1") {
  const { POST } = await import("../app/api/requests/route");
  return POST(
    new Request("http://x/api/requests", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify({ trackId, deviceId }),
    }),
  );
}

let query: typeof import("../lib/db").query;

before(async () => {
  if (skip) return;
  ({ query } = await import("../lib/db"));
});
beforeEach(async () => {
  if (skip) return;
  await query("truncate requests restart identity");
  await query("update settings set value = 'off' where key = 'moderation'");
});
after(() => {
  if (!skip) setTimeout(() => process.exit(0), 50).unref();
});

test("busca devolve allowed/review e cache", { skip }, async () => {
  const { GET } = await import("../app/api/search/route");
  const res = await GET(new Request("http://x/api/search?q=ev"));
  assert.equal(res.status, 200);
  assert.match(res.headers.get("cache-control") ?? "", /s-maxage=600/);
  const { results } = await res.json();
  assert.equal(results.length, 3);
  assert.equal(results[2].review, true);
  assert.equal(results[0].review, false);
});

test("pedido novo entra na fila com posição", { skip }, async () => {
  const res = await post(1, uuid());
  assert.equal(res.status, 201);
  assert.deepEqual(await res.json(), { status: "queued", position: 1 });
  const res2 = await post(2, uuid(), "10.0.0.2");
  assert.deepEqual(await res2.json(), { status: "queued", position: 2 });
});

test("segundo pedido do mesmo aparelho em menos de 5 min recebe 429", { skip }, async () => {
  const dev = uuid();
  assert.equal((await post(1, dev)).status, 201);
  const res = await post(2, dev);
  assert.equal(res.status, 429);
  const body = await res.json();
  assert.match(body.error, /Calma! Você pode pedir de novo em 5 min/);
  assert.ok(body.retryAfterSec > 0);
});

test("música repetida na fila recebe 409", { skip }, async () => {
  assert.equal((await post(1, uuid())).status, 201);
  const res = await post(1, uuid(), "10.0.0.9");
  assert.equal(res.status, 409);
  assert.equal((await res.json()).error, "Essa música já está na fila. Peça outra!");
});

test("limite por IP: 30 por hora", { skip }, async () => {
  for (let i = 0; i < 30; i++) {
    await query(
      `insert into requests (track_id, track_name, artist_name, device_id, ip_hash, status)
       values ($1, 'x', 'y', $2, $3, 'played')`,
      [1000 + i, uuid(), (await import("../lib/ratelimit")).hashIp("10.9.9.9")],
    );
  }
  assert.equal((await post(2, uuid(), "10.9.9.9")).status, 429);
});

test("explícita entra como pending (Revisão), não na fila", { skip }, async () => {
  const res = await post(3, uuid());
  assert.equal(res.status, 201);
  assert.deepEqual(await res.json(), { status: "pending", position: null });
  const rows = await query("select flag_level from requests where track_id = 3");
  assert.equal(rows[0].flag_level, "review_explicit");
});

test("modo aprovação ligado: pedido limpo também vai para pending", { skip }, async () => {
  await query("update settings set value = 'on' where key = 'moderation'");
  assert.equal((await (await post(1, uuid())).json()).status, "pending");
});

test("corpo inválido recebe 400 e faixa inexistente 404", { skip }, async () => {
  assert.equal((await post(1, "nao-e-uuid")).status, 400);
  assert.equal((await post(999, uuid())).status, 404);
});

test("IP puro nunca vai para o banco", { skip }, async () => {
  await post(1, uuid(), "203.0.113.7");
  const rows = await query("select ip_hash from requests");
  assert.match(String(rows[0].ip_hash), /^[0-9a-f]{64}$/);
});

test("painel e rotas do DJ sem senha devolvem 401", async () => {
  const { proxy } = await import("../proxy");
  for (const path of ["/dj", "/api/dj/requests", "/api/dj/requests/1", "/api/dj/settings", "/api/dj/wipe"]) {
    assert.equal(proxy(new NextRequest(`http://x${path}`)).status, 401, path);
    assert.equal(proxy(new NextRequest(`http://x${path}`, { headers: auth("errada") })).status, 401, path);
  }
  const ok = proxy(new NextRequest("http://x/dj", { headers: auth("senha-certa") }));
  assert.notEqual(ok.status, 401);
  // e as próprias rotas também conferem
  const { GET } = await import("../app/api/dj/requests/route");
  assert.equal((await GET(new Request("http://x/api/dj/requests"))).status, 401);
});

test("sem DJ_PASSWORD configurada, nada libera", async () => {
  const { isDjAuthorized } = await import("../lib/auth");
  const saved = process.env.DJ_PASSWORD;
  delete process.env.DJ_PASSWORD;
  assert.equal(isDjAuthorized(auth("").authorization), false);
  assert.equal(isDjAuthorized(auth("senha-certa").authorization), false);
  process.env.DJ_PASSWORD = saved;
});

test("DJ: tocar, recusar e devolver à fila", { skip }, async () => {
  await post(1, uuid());
  const { PATCH } = await import("../app/api/dj/requests/[id]/route");
  const call = (body: object) =>
    PATCH(
      new Request("http://x/api/dj/requests/1", {
        method: "PATCH",
        headers: { "content-type": "application/json", ...auth("senha-certa") },
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ id: "1" }) },
    );
  assert.equal((await call({ status: "rejected", reason: "fora do estilo" })).status, 200);
  assert.equal((await query("select reject_reason from requests"))[0].reject_reason, "fora do estilo");
  assert.equal((await call({ status: "queued", censor: true })).status, 200);
  const row = (await query("select status, censor from requests"))[0];
  assert.deepEqual(row, { status: "queued", censor: true });
  assert.equal((await call({ status: "played" })).status, 200);
  assert.equal((await call({ status: "pending" })).status, 400);
});
