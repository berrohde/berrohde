// Esquema do banco. Roda sozinho na primeira consulta de cada instância (lib/db.ts)
// e também por "npm run db:init". Tudo é "if not exists": pode repetir sem erro.
export const SCHEMA_SQL = `
-- Pode rodar quantas vezes quiser (npm run db:init): tudo é "if not exists".

create table if not exists requests (
  id            bigserial primary key,
  track_id      bigint      not null,
  track_name    text        not null,
  artist_name   text        not null,
  artwork_url   text,
  preview_url   text,
  explicitness  text        not null default 'notExplicit',
  status        text        not null default 'queued'
                check (status in ('pending','queued','played','skipped','rejected')),
  reject_reason text,
  device_id     text        not null,
  ip_hash       text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Classificação do filtro (ok, review_cleaned, review_explicit) e termos que bateram.
alter table requests add column if not exists flag_level text not null default 'ok';
alter table requests add column if not exists flag_terms text;
-- Aprovada pelo grêmio com a condição de o DJ censurar na transição.
alter table requests add column if not exists censor boolean not null default false;

create index if not exists requests_status_created_idx on requests (status, created_at);
create index if not exists requests_device_created_idx on requests (device_id, created_at desc);
create index if not exists requests_ip_created_idx on requests (ip_hash, created_at desc);

-- impede a mesma música duas vezes na fila ao mesmo tempo
create unique index if not exists requests_one_active_per_track
  on requests (track_id) where status in ('pending','queued');

create table if not exists settings (
  key   text primary key,
  value text not null
);

insert into settings (key, value) values ('moderation', 'off') on conflict do nothing;
`;

export const SCHEMA_STATEMENTS: string[] = SCHEMA_SQL.split("\n")
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n")
  .split(/;\s*$/m)
  .map((s) => s.trim())
  .filter(Boolean);
