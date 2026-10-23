// npm run db:init  → cria as tabelas no banco de DATABASE_URL. Pode rodar de novo sem erro.
import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { join } from "node:path";

config({ path: [".env.local", ".env"], quiet: true });

async function main() {
  const { query } = await import("../lib/db");
  const sql = readFileSync(join(__dirname, "..", "db", "schema.sql"), "utf8");
  const statements = sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .split(/;\s*$/m)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const stmt of statements) await query(stmt);
  console.log(`Banco pronto (${statements.length} comandos executados).`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Falhou:", err.message ?? err);
  process.exit(1);
});
