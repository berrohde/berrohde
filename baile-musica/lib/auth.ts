import { createHash, timingSafeEqual } from "node:crypto";

export const AUTH_REALM = "Painel do DJ";

/**
 * Confere o cabeçalho Basic Auth contra DJ_PASSWORD.
 * O usuário pode ser qualquer texto; só a senha importa.
 * Sem DJ_PASSWORD configurada, nunca libera.
 */
export function isDjAuthorized(authorization: string | null): boolean {
  const expected = process.env.DJ_PASSWORD;
  if (!expected) return false;
  if (!authorization?.startsWith("Basic ")) return false;

  let decoded: string;
  try {
    decoded = Buffer.from(authorization.slice(6).trim(), "base64").toString("utf8");
  } catch {
    return false;
  }
  const sep = decoded.indexOf(":");
  if (sep < 0) return false;
  const given = decoded.slice(sep + 1);

  // Compara os hashes (mesmo tamanho) em tempo constante.
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export function unauthorizedResponse(): Response {
  if (!process.env.DJ_PASSWORD) console.warn("DJ_PASSWORD não configurada: painel bloqueado");
  return new Response("Senha necessária", {
    status: 401,
    headers: { "WWW-Authenticate": `Basic realm="${AUTH_REALM}", charset="UTF-8"`, "Cache-Control": "no-store" },
  });
}

/** Proteção extra dentro das rotas do DJ (além do proxy). */
export function requireDj(req: Request): Response | null {
  return isDjAuthorized(req.headers.get("authorization")) ? null : unauthorizedResponse();
}
