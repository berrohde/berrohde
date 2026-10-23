import assert from "node:assert/strict";
import { test } from "node:test";
import { classify, findTerms, normalize } from "../lib/filter";

test("normaliza acento, maiúsculas, pontuação e números trocados", () => {
  assert.equal(normalize("P0RRA!!"), "porra");
  assert.equal(normalize("Tesão, Não?"), "tesao nao");
  assert.equal(normalize("f0d@-se"), "foda se");
  assert.equal(normalize("22 de Março"), "22 de marco");
});

test("faixa marcada como explícita no iTunes vai para revisão", () => {
  const r = classify({ trackName: "Qualquer", artistName: "Alguém", trackExplicitness: "explicit" });
  assert.equal(r.allowed, true);
  assert.equal(r.flagLevel, "review_explicit");
});

test("versão editada vai para revisão como cleaned", () => {
  const r = classify({ trackName: "Qualquer", artistName: "Alguém", trackExplicitness: "cleaned" });
  assert.equal(r.flagLevel, "review_cleaned");
});

test("termo da lista com e sem acento e com número é marcado", () => {
  assert.deepEqual(findTerms("Tesão"), ["tesao"]);
  assert.deepEqual(findTerms("Tesao"), ["tesao"]);
  assert.deepEqual(findTerms("Que P0rra É Essa"), ["porra"]);
  const r = classify({ trackName: "Senta Danada", artistName: "MC X", trackExplicitness: "notExplicit" });
  assert.equal(r.flagLevel, "review_explicit");
  assert.ok(r.flagTerms.includes("senta"));
});

test("palavra inteira: não marca palavras que só contêm o termo", () => {
  assert.deepEqual(findTerms("Computador", "Curtindo a Vida", "Disputa Classe"), []);
});

test("faixa limpa passa sem alerta", () => {
  const r = classify({
    trackName: "Evidências",
    artistName: "Chitãozinho & Xororó",
    collectionName: "Ao Vivo",
    trackExplicitness: "notExplicit",
  });
  assert.deepEqual(r, { allowed: true, reason: null, flagLevel: "ok", flagTerms: [] });
});

test("título com asterisco é marcado", () => {
  assert.ok(findTerms("F**k You").length > 0);
});
