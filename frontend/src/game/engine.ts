import kaplay from "kaplay";

import { resolvePalette, hexToRgb } from "./palettes";
import { playRetroSound } from "./sounds";
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  type Controls,
  type GameSpec,
  type TemplateContext,
  type TemplateRunner,
  type VirtualButton,
  type VirtualInput,
} from "./types";
import { runBossFight } from "./templates/bossFight";
import { runCollector } from "./templates/collector";
import { runDodger } from "./templates/dodger";
import { runRunner } from "./templates/runner";
import { runShooter } from "./templates/shooter";

const templateMap: Record<GameSpec["template"], TemplateRunner> = {
  dodger: runDodger,
  collector: runCollector,
  runner: runRunner,
  shooter: runShooter,
  boss_fight: runBossFight,
};

export function createVirtualInput(): VirtualInput {
  return {
    left: false,
    right: false,
    up: false,
    down: false,
    action: false,
    actionTap: false,
  };
}

export function mountPromptcadeGame(canvas: HTMLCanvasElement, spec: GameSpec, virtualInput = createVirtualInput()) {
  const palette = resolvePalette(spec.palette);
  const k = kaplay({
    canvas,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    background: hexToRgb(palette.background),
    global: false,
    debug: false,
    crisp: true,
  });

  const controls = createControls(k, virtualInput);
  const rng = mulberry32(hash(JSON.stringify(spec)));
  let ended = false;

  const endGame: TemplateContext["endGame"] = (result, message) => {
    if (ended) return;
    ended = true;
    playRetroSound(result === "win" ? "win" : "lose");
    drawEndScreen(k, palette, result, message);
  };

  const ctx: TemplateContext = {
    k,
    spec,
    palette,
    controls,
    duration: { easy: 36, medium: 45, hard: 52 }[spec.difficulty],
    speedScale: { easy: 0.82, medium: 1, hard: 1.24 }[spec.difficulty],
    rng,
    playSound: playRetroSound,
    endGame,
    isEnded: () => ended,
  };

  try {
    playRetroSound("start");
    const runner = templateMap[spec.template] ?? runDodger;
    runner(ctx);
  } catch {
    drawEndScreen(k, palette, "lose", "The cabinet jammed. Hit remix and it will behave.");
  }

  return {
    destroy() {
      try {
        k.quit();
      } catch {
        canvas.getContext("2d")?.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
      }
    },
  };
}

function createControls(k: any, virtualInput: VirtualInput): Controls {
  const keyMap: Record<VirtualButton, string[]> = {
    left: ["left", "a"],
    right: ["right", "d"],
    up: ["up", "w"],
    down: ["down", "s"],
    action: ["space", "enter"],
  };

  const isKeyDown = (key: string) => Boolean(k.isKeyDown?.(key));
  const isKeyPressed = (key: string) => Boolean(k.isKeyPressed?.(key));

  return {
    isDown(button) {
      return Boolean(virtualInput[button]) || keyMap[button].some(isKeyDown);
    },
    actionDown() {
      return Boolean(virtualInput.action) || keyMap.action.some(isKeyDown);
    },
    actionPressed() {
      const tapped = virtualInput.actionTap;
      virtualInput.actionTap = false;
      return tapped || keyMap.action.some(isKeyPressed);
    },
  };
}

function drawEndScreen(k: any, palette: ReturnType<typeof resolvePalette>, result: "win" | "lose", message: string) {
  k.add([
    k.rect(GAME_WIDTH, GAME_HEIGHT),
    k.pos(0, 0),
    k.color(...hexToRgb(palette.panel)),
    k.opacity(0.88),
    k.z(1000),
  ]);
  k.add([
    k.text(result === "win" ? "YOU WIN" : "GAME OVER", { size: 38, width: GAME_WIDTH, align: "center" }),
    k.pos(0, 132),
    k.color(...hexToRgb(result === "win" ? palette.pickup : palette.danger)),
    k.z(1001),
  ]);
  k.add([
    k.text(message, { size: 16, width: GAME_WIDTH - 92, align: "center" }),
    k.pos(46, 196),
    k.color(...hexToRgb(palette.ink)),
    k.z(1001),
  ]);
  k.add([
    k.text("Remix or enter a new prompt to play again", { size: 12, width: GAME_WIDTH, align: "center" }),
    k.pos(0, 270),
    k.color(...hexToRgb(palette.muted)),
    k.z(1001),
  ]);
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
