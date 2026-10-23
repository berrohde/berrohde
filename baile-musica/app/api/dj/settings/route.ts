import { z } from "zod";
import { requireDj } from "@/lib/auth";
import { getModeration, setModeration } from "@/lib/db";
import { json } from "@/lib/http";

export async function GET(req: Request) {
  const denied = requireDj(req);
  if (denied) return denied;
  return json({ moderation: await getModeration() });
}

const Body = z.object({ moderation: z.boolean() });

export async function PUT(req: Request) {
  const denied = requireDj(req);
  if (denied) return denied;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "corpo inválido" }, 400);
  await setModeration(parsed.data.moderation);
  return json({ moderation: parsed.data.moderation });
}
