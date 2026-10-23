export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

export const MSG = {
  duplicate: "Essa música já está na fila. Peça outra!",
  searchFailed: "A busca falhou. Tente de novo em alguns segundos.",
  searchBusy: "A busca está cheia, tente de novo em um minuto.",
  unexpected: "Algo deu errado. Fale com o DJ.",
  notFound: "Não encontramos essa música. Tente buscar de novo.",
  invalid: "Pedido inválido. Recarregue a página.",
  rateLimit: (sec: number) => `Calma! Você pode pedir de novo em ${Math.max(1, Math.ceil(sec / 60))} min.`,
};
