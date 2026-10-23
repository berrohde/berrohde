// Listas editáveis à mão. Tudo é comparado depois de normalizado
// (minúsculas, sem acento, pontuação vira espaço, números trocados por letras: "p0rra" -> "porra"),
// e sempre por PALAVRA INTEIRA: "cu" não marca "curtir", "puta" não marca "computador".
//
// Um termo que bate NÃO recusa a música: ela vai para a aba Revisão do painel,
// e o grêmio decide. Só BLOCKED_ARTISTS recusa na hora.

export const BLOCKED_TERMS: string[] = [
  // Palavrões (português)
  "porra", "porra nenhuma", "caralho", "caralhos", "krl", "krlh", "crl", "carai", "caraio",
  "foda", "fodas", "foda se", "fodase", "fodasse", "foder", "fode", "fodendo", "fodido", "fodida",
  "fuder", "fude", "fudendo", "fudido", "fudida",
  "puta", "putas", "puto", "putinha", "putaria", "puteiro", "pqp", "fdp", "filho da puta",
  "merda", "bosta", "cu", "cuzao", "cuzinho", "arrombado", "arrombada",
  "vsf", "vtnc", "tnc", "vai se fuder", "vai tomar no cu", "tomar no cu",
  "viado", "viadinho", "vadia", "vagabunda", "piranha", "cachorra", "safada", "safadinha",

  // Termos sexuais (português, inclusive gírias de funk)
  "buceta", "boceta", "bct", "xoxota", "xereca", "xota", "xavasca", "perereca",
  "piroca", "pirocada", "pica", "picao", "rola", "rolao", "pau no cu", "pau duro",
  "pentelho", "piru", "caceta", "cacete",
  "boquete", "mamada", "mamadinha", "chupa", "chupada", "chupeta", "punheta", "siririca",
  "gozar", "gozo", "gozei", "goza", "gozada", "gozando",
  "tesao", "tesuda", "tesudo", "transar", "transa", "transando", "trepar", "trepada",
  "meter", "metendo", "metida", "metidinha", "metecao", "socada", "socadinha",
  "sentar", "senta", "sentada", "sentadinha", "sentando", "quica", "quicada", "quicando",
  "sarra", "sarrada", "sarrando", "botada", "pelada", "peladinha", "nudes", "nude",
  "novinha", "novinhas", "sexo", "sexual", "putona", "rabuda", "popozuda", "bundao",
  "ninfeta", "ninfo", "suruba", "surubinha", "orgia", "camisinha", "brotheragem",

  // Drogas
  "maconha", "baseado", "cocaina", "lanca perfume", "loló", "lolo",
  "crack", "droga", "drogas", "ecstasy", "mdma", "md", "bala de md", "lsd",
  "codeina", "xarope", "baforada", "cheirar", "cheirando", "haxixe",

  // Violência explícita
  "estupro", "estuprar", "tiro na cara", "bala na cara", "matar policia", "fuzil", "glock",
  "tiroteio", "chacina", "faccao", "proibidao",

  // Inglês
  "fuck", "fucks", "fucking", "fuckin", "fucked", "fucker", "motherfucker", "wtf", "stfu",
  "shit", "shits", "shitty", "bullshit", "bitch", "bitches", "biatch", "ass", "asshole", "dumbass",
  "pussy", "dick", "dicks", "cock", "cum", "cumming", "slut", "sluts", "whore", "whores", "hoe", "hoes",
  "nigga", "niggas", "nigger", "porn", "porno", "horny", "tits", "titties", "boobs", "booty call",
  "wap", "sex", "sexual", "orgasm", "nsfw", "bdsm", "blowjob", "handjob", "milf",
  "weed", "cocaine", "coke", "molly", "xanax", "percocet", "percs", "codeine", "kush", "blunt",
  "murder",
];

// Artistas que o grêmio já sabe que não quer. Recusados NA HORA, sem passar por revisão.
// Escreva o nome como aparece no iTunes (acentos e maiúsculas não importam). Ex.: "Nome do Artista".
export const BLOCKED_ARTISTS: string[] = [];
