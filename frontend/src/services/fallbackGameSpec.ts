import type { Difficulty, GameSpec, GameTemplate, GenerationMode } from "../game/types";
import { DIFFICULTY_VALUES, TEMPLATE_VALUES } from "../game/types";

const STOPWORDS = new Set([
  "the",
  "and",
  "but",
  "for",
  "with",
  "that",
  "this",
  "from",
  "into",
  "about",
  "because",
  "just",
  "really",
  "very",
  "have",
  "has",
  "was",
  "were",
  "are",
  "you",
  "your",
  "our",
  "their",
  "they",
  "them",
  "today",
  "tomorrow",
]);

const IP_REPLACEMENTS: Record<string, string> = {
  mario: "tiny plumber-like jumper",
  "darth vader": "dramatic space helmet villain",
  "star wars": "overdramatic space opera",
  "harry potter": "bespectacled wand-school kid",
  pokemon: "pocket critter league",
  pikachu: "spark mouse mascot",
  zelda: "legendary puzzle princess",
  sonic: "speedy blue-ish blur",
  batman: "brooding cave detective",
  marvel: "cape committee",
  disney: "storybook megacorp castle",
  fortnite: "dance-battle island",
  minecraft: "blocky craft world",
};

const palettes = ["neon-night", "candy-crisis", "toxic-lime", "sunset-byte", "deep-sea"];
const fallbackNouns = ["receipt", "sandwich", "deadline", "sock", "boiler", "coffee", "elevator", "mood"];
const titleBits = ["Panic", "Dash", "Blaster", "Fiasco", "Emergency", "Rumble", "Meltdown"];

export function createFallbackGameSpec(prompt: string, mode: GenerationMode = "normal"): GameSpec {
  const cleanPrompt = sanitizePrompt(prompt || "a bored toaster wants a promotion");
  const rng = mulberry32(hash(`${cleanPrompt}|${mode}`));
  const words = keywords(cleanPrompt);
  const main = pick(words.length ? words : fallbackNouns, rng);
  const side = pick(words.filter((word) => word !== main).length ? words.filter((word) => word !== main) : fallbackNouns, rng);
  const template = pickTemplate(cleanPrompt, rng);
  const difficulty = pickDifficulty(mode, cleanPrompt, rng);
  const collectible = `${pick(["bonus", "glowing", "premium", "forbidden"], rng)} ${pick(words.length ? words : fallbackNouns, rng)}`;
  const enemy = `${pick(["flying", "dramatic", "overcaffeinated", "rubbery"], rng)} ${side} swarm`;

  return {
    title: titleCase(`${main} ${pick(titleBits, rng)}`),
    template,
    hero: `${pick(["tiny", "frazzled", "neon", "sleepy", "heroic"], rng)} ${main}`,
    enemy,
    collectible,
    obstacle: `${pick(["spiky", "late", "booming", "cursed"], rng)} ${pick(words.length ? words : fallbackNouns, rng)}`,
    goal: goalFor(template, main),
    tone: mode === "weirder" ? "deeply weird retro comedy" : "absurd retro comedy",
    palette: pick(palettes, rng),
    difficulty,
    intro: `${verbFor(template)} ${collectible}s before the ${enemy} ruin the cabinet.`,
  };
}

export function validateGameSpec(value: unknown): GameSpec | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const data = value as Record<string, unknown>;
  if (!TEMPLATE_VALUES.includes(data.template as GameTemplate)) {
    return null;
  }
  if (!DIFFICULTY_VALUES.includes(data.difficulty as Difficulty)) {
    return null;
  }

  const spec: GameSpec = {
    title: cleanField(data.title, "Snack Panic", 64),
    template: data.template as GameTemplate,
    hero: cleanField(data.hero, "tiny arcade underdog", 48),
    enemy: cleanField(data.enemy, "wobbly excuse cloud", 56),
    collectible: cleanField(data.collectible, "bonus receipt", 48),
    obstacle: cleanField(data.obstacle, "dramatic hazard cube", 48),
    goal: cleanField(data.goal, "survive the nonsense and look busy", 120),
    tone: cleanField(data.tone, "absurd retro comedy", 72),
    palette: cleanField(data.palette, "neon-night", 32).toLowerCase(),
    difficulty: data.difficulty as Difficulty,
    intro: cleanField(data.intro, "Grab the good stuff and dodge whatever today is throwing at you.", 180),
  };
  return spec;
}

export function sanitizePrompt(prompt: string): string {
  let cleaned = prompt.replace(/[\u0000-\u001f{}<>`$]/g, " ").replace(/\s+/g, " ").trim();
  for (const [name, replacement] of Object.entries(IP_REPLACEMENTS)) {
    cleaned = cleaned.replace(new RegExp(escapeRegExp(name), "gi"), replacement);
  }
  if (/\b(porn|explicit sex|genitals?|rape|gore|graphic violence|slur)\b/i.test(cleaned)) {
    return "awkward arcade nonsense";
  }
  return cleaned.slice(0, 500) || "a bored toaster wants a promotion";
}

function keywords(prompt: string): string[] {
  return Array.from(
    new Set(
      (prompt.toLowerCase().match(/[a-z][a-z0-9'-]{2,}/g) ?? [])
        .map((word) => word.replace(/^'+|'+$/g, ""))
        .filter((word) => !STOPWORDS.has(word)),
    ),
  ).slice(0, 8);
}

function pickTemplate(prompt: string, rng: () => number): GameTemplate {
  const lower = prompt.toLowerCase();
  if (/(boss|manager|landlord|final|giant|villain)/.test(lower)) return "boss_fight";
  if (/(shoot|blast|email|laser|zap)/.test(lower)) return "shooter";
  if (/(run|late|commute|bus|deadline|escape)/.test(lower)) return "runner";
  if (/(collect|gather|find|snack|receipt)/.test(lower)) return "collector";
  return pick([...TEMPLATE_VALUES], rng);
}

function pickDifficulty(mode: GenerationMode, prompt: string, rng: () => number): Difficulty {
  if (mode === "harder") return "hard";
  if (mode === "easier") return "easy";
  if (/(impossible|angry|panic|chaos)/i.test(prompt)) return "hard";
  return pick(["easy", "medium", "medium", "hard"] as Difficulty[], rng);
}

function goalFor(template: GameTemplate, main: string): string {
  return {
    dodger: `survive until the ${main} alarm stops beeping`,
    collector: `collect enough ${main} tokens before the timer gives up`,
    runner: `keep running until the ${main} corridor ends`,
    shooter: `zap the incoming nonsense and protect the ${main} vibes`,
    boss_fight: `bonk the oversized ${main} problem until it apologises`,
  }[template];
}

function verbFor(template: GameTemplate): string {
  return {
    dodger: "Dodge hazards and scoop",
    collector: "Grab",
    runner: "Jump past disaster and collect",
    shooter: "Blast the nonsense to earn",
    boss_fight: "Dodge the boss and win",
  }[template];
}

function pick<T>(items: T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)] ?? items[0];
}

function cleanField(value: unknown, fallback: string, maxLength: number): string {
  if (typeof value !== "string") return fallback;
  return sanitizePrompt(value).slice(0, maxLength) || fallback;
}

function titleCase(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ")
    .slice(0, 64);
}

function hash(value: string): number {
  let h = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    h ^= value.charCodeAt(index);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  return () => {
    seed += 0x6d2b79f5;
    let next = seed;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

