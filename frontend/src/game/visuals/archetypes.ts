import type { EntitySpec, GameSpec, VisualArchetype } from "../types";

export function playerEntity(spec: GameSpec): EntitySpec {
  return spec.cast?.player ?? legacyEntity(spec.hero, "player", guessArchetype(spec.hero));
}

export function opponentEntity(spec: GameSpec, index = 0): EntitySpec {
  return spec.cast?.opponents?.[index % Math.max(1, spec.cast.opponents.length)] ?? legacyEntity(spec.enemy, "opponent", guessArchetype(spec.enemy));
}

export function hazardEntity(spec: GameSpec, index = 0): EntitySpec {
  return spec.cast?.hazards?.[index % Math.max(1, spec.cast.hazards.length)] ?? legacyEntity(spec.obstacle, "hazard", guessArchetype(spec.obstacle));
}

export function helperEntity(spec: GameSpec, index = 0): EntitySpec {
  return spec.cast?.helpers?.[index % Math.max(1, spec.cast.helpers.length)] ?? legacyEntity(spec.collectible, "helper", guessArchetype(spec.collectible));
}

export function goalEntity(spec: GameSpec): EntitySpec {
  return spec.cast?.goalObject ?? legacyEntity(spec.goal, "goal", "paper");
}

export function legacyEntity(name: string, role: string, visualArchetype: VisualArchetype): EntitySpec {
  return { name, role, visualArchetype };
}

export function guessArchetype(text: string): VisualArchetype {
  const value = text.toLowerCase();
  if (/\bcat|kitten\b/.test(value)) return "cat";
  if (/\bmouse|mice\b/.test(value)) return "mouse";
  if (/\bearth|planet|moon|orbit\b/.test(value)) return "planet";
  if (/\bblack hole|singularity\b/.test(value)) return "black_hole";
  if (/\bball|cricket|tennis|football|run\b/.test(value)) return "ball";
  if (/\bbat\b/.test(value)) return "bat";
  if (/\bpaper|essay|dissertation|citation|deadline|receipt|letter\b/.test(value)) return "paper";
  if (/\bbill|rent|invoice\b/.test(value)) return "bill";
  if (/\bghost|cemetery|grave\b/.test(value)) return "ghost";
  if (/\bapple|pineapple|strawberry|fruit|berry\b/.test(value)) return "fruit";
  if (/\bboiler|machine|washing|oven\b/.test(value)) return "machine";
  if (/\basteroid|rock|debris\b/.test(value)) return "asteroid";
  if (/\btool|wrench|pen|rocket\b/.test(value)) return "tool";
  if (/\blove|heart\b/.test(value)) return "heart";
  if (/\bfood|biryani|chicken|pizza|cheese|sandwich|coffee\b/.test(value)) return "food";
  if (/\brain|weather|storm|wind|cloud|puddle|ice\b/.test(value)) return "weather";
  return "abstract_shape";
}
