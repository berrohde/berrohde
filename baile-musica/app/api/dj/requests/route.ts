import { getModeration, query, type RequestRow } from "@/lib/db";
import { requireDj } from "@/lib/auth";
import { json } from "@/lib/http";

const COLUMNS = `id::text, track_id::text, track_name, artist_name, artwork_url, preview_url, explicitness,
  status, reject_reason, flag_level, flag_terms, censor, created_at, updated_at`;

export async function GET(req: Request) {
  const denied = requireDj(req);
  if (denied) return denied;

  const [queued, pending, played, rejected, moderation, now] = await Promise.all([
    query<RequestRow>(`select ${COLUMNS} from requests where status = 'queued' order by created_at, id`),
    query<RequestRow>(`select ${COLUMNS} from requests where status = 'pending' order by created_at, id`),
    query<RequestRow>(
      `select ${COLUMNS} from requests where status = 'played' order by updated_at desc limit 100`,
    ),
    query<RequestRow>(
      `select ${COLUMNS} from requests where status in ('skipped','rejected') order by updated_at desc limit 100`,
    ),
    getModeration(),
    query<{ now: string }>("select now() as now"),
  ]);

  return json({ queued, pending, played, rejected, moderation, now: now[0].now });
}
