// npm run db:init  → cria as tabelas no banco de DATABASE_URL. Pode rodar de novo sem erro.
// (O site também cria sozinho na primeira consulta; este script é só para conferir.)
import { config } from "dotenv";

config({ path: [".env.local", ".env"], quiet: true });

async function main() {
  const { ensureSchema } = await import("../lib/db");
  const { SCHEMA_STATEMENTS } = await import("../lib/schema");
  await ensureSchema();
  console.log(`Banco pronto (${SCHEMA_STATEMENTS.length} comandos executados).`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Falhou:", err.message ?? err);
  process.exit(1);
});
