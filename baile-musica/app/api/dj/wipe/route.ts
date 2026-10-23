import { requireDj } from "@/lib/auth";
import { query } from "@/lib/db";
import { json } from "@/lib/http";

// Fim da festa: apaga todos os pedidos (inclusive deviceId e hash de IP).
export async function POST(req: Request) {
  const denied = requireDj(req);
  if (denied) return denied;
  const body = (await req.json().catch(() => null)) as { confirm?: string } | null;
  if (body?.confirm !== "APAGAR") return json({ error: "confirmação ausente" }, 400);
  await query("truncate table requests restart identity");
  return json({ ok: true });
}
