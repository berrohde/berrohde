import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isDjAuthorized, unauthorizedResponse } from "./lib/auth";

// Basic Auth no painel (/dj) e na API do DJ (/api/dj/*), contra a variável DJ_PASSWORD.
// (No Next 16 o antigo middleware.ts se chama proxy.ts.)
export function proxy(req: NextRequest) {
  if (!isDjAuthorized(req.headers.get("authorization"))) return unauthorizedResponse();
  return NextResponse.next();
}

export const config = {
  matcher: ["/dj", "/dj/:path*", "/api/dj", "/api/dj/:path*"],
};
