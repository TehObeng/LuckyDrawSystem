const blockedFragments = [
  "anjing",
  "bangsat",
  "kontol",
  "memek",
  "fuck",
  "fck",
  "fuk",
  "shit",
  "bitch",
  "asshole",
  "porn",
  "casino",
  "crypto",
  "btc",
  "dropdead",
  "killyourself",
  "bunuhdiri",
  "mati lu",
  "mati kau",
  "suckmy",
  "dick",
];

const riskyFragments = [
  "anjir",
  "anjay",
  "goblok",
  "tolol",
  "bodoh",
  "idiot",
  "stupid",
  "noob",
  "bacot",
  "loser",
  "moron",
  "sial",
];

const urlPattern = /(https?:\/\/|www\.|t\.me\/|wa\.me\/|discord\.gg\/|@everyone|@here)/i;
const repeatedPattern = /(.)\1{5,}/i;
const nonWordPattern = /[^\p{Letter}\p{Number}\s]+/gu;
const spacePattern = /\s+/g;

export type ModerationRiskLevel = "safe" | "risky" | "blocked";

export interface MessageClassification {
  normalizedContent: string;
  riskLevel: ModerationRiskLevel;
  reason?: string;
}

export function normalizeMessageContent(input: string) {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(nonWordPattern, " ")
    .replace(spacePattern, " ")
    .trim();
}

export function classifyMessageContent(input: string): MessageClassification {
  const normalizedContent = normalizeMessageContent(input);
  const compact = normalizedContent.replace(/\s+/g, "");

  if (!normalizedContent) {
    return {
      normalizedContent,
      riskLevel: "blocked",
      reason: "Message is empty.",
    };
  }

  if (urlPattern.test(input)) {
    return {
      normalizedContent,
      riskLevel: "blocked",
      reason: "Links or broadcast mentions are not allowed.",
    };
  }

  if (repeatedPattern.test(normalizedContent)) {
    return {
      normalizedContent,
      riskLevel: "risky",
      reason: "Repeated-character spam detected.",
    };
  }

  if (blockedFragments.some((fragment) => normalizedContent.includes(fragment) || compact.includes(fragment.replace(/\s+/g, "")))) {
    return {
      normalizedContent,
      riskLevel: "blocked",
      reason: "Blocked profanity or spam fragment detected.",
    };
  }

  if (riskyFragments.some((fragment) => normalizedContent.includes(fragment) || compact.includes(fragment.replace(/\s+/g, "")))) {
    return {
      normalizedContent,
      riskLevel: "risky",
      reason: "Risky language detected.",
    };
  }

  return {
    normalizedContent,
    riskLevel: "safe",
  };
}
