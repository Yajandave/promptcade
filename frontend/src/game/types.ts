export const GAME_WIDTH = 640;
export const GAME_HEIGHT = 420;

export const TEMPLATE_VALUES = ["dodger", "collector", "runner", "shooter", "boss_fight"] as const;
export const DIFFICULTY_VALUES = ["easy", "medium", "hard"] as const;

export type GameTemplate = (typeof TEMPLATE_VALUES)[number];
export type Difficulty = (typeof DIFFICULTY_VALUES)[number];
export type GenerationMode = "normal" | "weirder" | "harder" | "easier";

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

