export const GAME_WIDTH = 640;
export const GAME_HEIGHT = 420;

export const TEMPLATE_VALUES = ["dodger", "collector", "runner", "shooter", "boss_fight"] as const;
export const DIFFICULTY_VALUES = ["easy", "medium", "hard"] as const;
export const OBJECTIVE_VALUES = [
  "score_runs",
  "repair_meter",
  "escape_zone",
  "defeat_boss",
  "collect_set",
  "complete_pattern",
  "protect_object",
  "deliver_items",
  "combo_chain",
  "clear_waves",
] as const;
export const VISUAL_ARCHETYPE_VALUES = [
  "human",
  "cat",
  "mouse",
  "planet",
  "black_hole",
  "ball",
  "bat",
  "paper",
  "bill",
  "ghost",
  "fruit",
  "machine",
  "asteroid",
  "tool",
  "heart",
  "food",
  "weather",
  "abstract_shape",
  "custom",
] as const;

export type GameTemplate = (typeof TEMPLATE_VALUES)[number];
export type Difficulty = (typeof DIFFICULTY_VALUES)[number];
export type ObjectiveType = (typeof OBJECTIVE_VALUES)[number];
export type VisualArchetype = (typeof VISUAL_ARCHETYPE_VALUES)[number];
export type GenerationMode = "normal" | "weirder" | "harder" | "easier";

export interface JokeEvent {
  time: number;
  text: string;
  effect: string;
}

export interface CreativeBrief {
  vibe: string;
  playableMetaphor: string;
  coreVerb: string;
  worldRule: string;
  escalation: string;
  payoff: string;
}

export interface EntitySpec {
  name: string;
  role: string;
  visualArchetype: VisualArchetype;
  behavior?: string | null;
  effect?: string | null;
  icon?: string | null;
}

export interface CastSpec {
  player?: EntitySpec | null;
  opponents: EntitySpec[];
  hazards: EntitySpec[];
  helpers: EntitySpec[];
  neutralChaos: EntitySpec[];
  goalObject?: EntitySpec | null;
}

export interface MechanicsSpec {
  objectiveType: ObjectiveType;
  winCondition: string;
  loseCondition: string;
  playerAbilities: string[];
  worldForces: string[];
  specialRules: string[];
  targetCount: number;
  progressMax: number;
}

export interface PresentationSpec {
  visualMotifs: string[];
  jokeEvents: JokeEvent[];
  microcopy: string[];
}

export interface GameSpec {
  title: string;
  template: GameTemplate;
  hero: string;
  enemy: string;
  collectible: string;
  obstacle: string;
  goal: string;
  tone: string;
  palette: string;
  difficulty: Difficulty;
  intro: string;
  creativeBrief?: CreativeBrief | null;
  cast?: CastSpec | null;
  mechanics?: MechanicsSpec | null;
  presentation?: PresentationSpec | null;
}

export interface GenerateGameResponse {
  gameSpec: GameSpec;
  source: "gemini" | "fallback";
  warnings: string[];
}

export interface ResolvedPalette {
  name: string;
  background: string;
  panel: string;
  ink: string;
  muted: string;
  accent: string;
  accent2: string;
  danger: string;
  pickup: string;
}

export type VirtualButton = "left" | "right" | "up" | "down" | "action";

export interface VirtualInput {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  action: boolean;
  actionTap: boolean;
}

export interface Controls {
  isDown: (button: VirtualButton) => boolean;
  actionPressed: () => boolean;
  actionDown: () => boolean;
}

export interface TemplateContext {
  k: any;
  spec: GameSpec;
  palette: ResolvedPalette;
  controls: Controls;
  duration: number;
  speedScale: number;
  rng: () => number;
  playSound: (name: SoundName) => void;
  endGame: (result: "win" | "lose", message: string) => void;
  isEnded: () => boolean;
}

export type SoundName = "start" | "coin" | "hit" | "shoot" | "win" | "lose" | "jump";
export type TemplateRunner = (ctx: TemplateContext) => void;
