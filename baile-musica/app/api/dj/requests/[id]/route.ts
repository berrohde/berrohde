import { z } from "zod";
import { requireDj } from "@/lib/auth";
import { isUniqueViolation, query } from "@/lib/db";
import { json, MSG } from "@/lib/http";

const Body = z.object({
  status: z.enum(["queued", "played", "skipped", "rejected"]),
  reason: z.string().trim().max(120).optional(),
  /** Ao aprovar da Revisão: aprovada com censura na transição. */
  censor: z.boolean().optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denied = requireDj(req);
  if (denied) return denied;

  const { id } = await ctx.params;
  if (!/^\d{1,18}$/.test(id)) return json({ error: "id inválido" }, 400);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "corpo inválido" }, 400);
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) return json({ error: "corpo inválido" }, 400);
  const { status, reason, censor } = parsed.data;

  try {
    const rows = await query(
      `update requests set
         status = $2,
         reject_reason = case when $2 = 'rejected' then $3 else null end,
         censor = case when $2 = 'queued' then coalesce($4, censor) else censor end,
         updated_at = now()
       where id = $1
       returning id::text, status`,
      [id, status, reason ?? null, censor ?? null],
    );
    if (rows.length === 0) return json({ error: "pedido não encontrado" }, 404);
    return json(rows[0]);
  } catch (err) {
    if (isUniqueViolation(err)) return json({ error: MSG.duplicate }, 409);
    console.error("update request failed", err);
    return json({ error: MSG.unexpected }, 500);
  }
}
