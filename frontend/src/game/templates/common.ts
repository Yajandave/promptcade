import { GAME_HEIGHT, GAME_WIDTH, type Difficulty, type TemplateContext } from "../types";
import { hexToRgb } from "../palettes";

export interface Hud {
  update: (stats: { score?: number; lives?: number; timeLeft?: number; bossHp?: number }) => void;
}

export function addBackdrop(ctx: TemplateContext) {
  const { k, palette, rng } = ctx;
  k.add([k.rect(GAME_WIDTH, GAME_HEIGHT), k.pos(0, 0), paint(ctx, palette.background), k.z(-20)]);

  for (let y = 34; y < GAME_HEIGHT; y += 34) {
    k.add([k.rect(GAME_WIDTH, 1), k.pos(0, y), paint(ctx, palette.accent2), k.opacity(0.11), k.z(-10)]);
  }

  for (let index = 0; index < 34; index += 1) {
    const size = rng() > 0.84 ? 3 : 2;
    k.add([
      k.rect(size, size),
      k.pos(20 + rng() * (GAME_WIDTH - 40), 26 + rng() * (GAME_HEIGHT - 80)),
      paint(ctx, rng() > 0.5 ? palette.accent : palette.pickup),
      k.opacity(0.35),
      k.z(-8),
    ]);
  }

  k.add([k.rect(GAME_WIDTH - 16, 2), k.pos(8, 8), paint(ctx, palette.accent), k.z(60)]);
  k.add([k.rect(GAME_WIDTH - 16, 2), k.pos(8, GAME_HEIGHT - 10), paint(ctx, palette.accent), k.z(60)]);
  k.add([k.rect(2, GAME_HEIGHT - 16), k.pos(8, 8), paint(ctx, palette.accent), k.z(60)]);
  k.add([k.rect(2, GAME_HEIGHT - 16), k.pos(GAME_WIDTH - 10, 8), paint(ctx, palette.accent), k.z(60)]);
}

export function addHud(ctx: TemplateContext): Hud {
  const { k, palette } = ctx;
  const scoreText = k.add([k.text("SCORE 0", { size: 14 }), k.pos(18, 15), paint(ctx, palette.ink), k.z(80)]);
  const timeText = k.add([k.text("TIME 0", { size: 14 }), k.pos(GAME_WIDTH / 2 - 48, 15), paint(ctx, palette.pickup), k.z(80)]);
  const lifeText = k.add([k.text("LIVES 3", { size: 14 }), k.pos(GAME_WIDTH - 112, 15), paint(ctx, palette.danger), k.z(80)]);
  const bossText = k.add([k.text("", { size: 12 }), k.pos(18, 38), paint(ctx, palette.accent2), k.z(80)]);

  return {
    update(stats) {
      if (stats.score !== undefined) scoreText.text = `SCORE ${stats.score}`;
      if (stats.timeLeft !== undefined) timeText.text = `TIME ${Math.max(0, Math.ceil(stats.timeLeft))}`;
      if (stats.lives !== undefined) lifeText.text = `LIVES ${Math.max(0, stats.lives)}`;
      if (stats.bossHp !== undefined) bossText.text = `BOSS ${Math.max(0, stats.bossHp)}`;
    },
  };
}

export function addPlayer(ctx: TemplateContext, x: number, y: number) {
  const { k, palette, spec } = ctx;
  const player = k.add([
    k.rect(24, 24),
    k.pos(x, y),
    k.anchor("center"),
    k.area(),
    paint(ctx, palette.accent),
    k.outline(2, rgb(k, palette.ink)),
    "player",
  ]);
  addFloatLabel(ctx, spec.hero, x, y + 26, palette.ink);
  return player;
}

export function addFloatLabel(ctx: TemplateContext, text: string, x: number, y: number, colorHex?: string) {
  const { k, palette } = ctx;
  const label = text.length > 18 ? `${text.slice(0, 16)}...` : text;
  return k.add([
    k.text(label, { size: 8, width: 110, align: "center" }),
    k.pos(x - 55, y),
    paint(ctx, colorHex ?? palette.muted),
    k.opacity(0.7),
    k.z(40),
  ]);
}

export function addBlock(
  ctx: TemplateContext,
  x: number,
  y: number,
  width: number,
  height: number,
  colorHex: string,
  tags: string[] = [],
) {
  const { k } = ctx;
  return k.add([k.rect(width, height), k.pos(x, y), k.anchor("center"), k.area(), paint(ctx, colorHex), ...tags]);
}

export function moveFourWay(ctx: TemplateContext, obj: any, speed: number) {
  let dx = 0;
  let dy = 0;
  if (ctx.controls.isDown("left")) dx -= 1;
  if (ctx.controls.isDown("right")) dx += 1;
  if (ctx.controls.isDown("up")) dy -= 1;
  if (ctx.controls.isDown("down")) dy += 1;

  if (dx !== 0 || dy !== 0) {
    const length = Math.hypot(dx, dy);
    obj.move((dx / length) * speed, (dy / length) * speed);
  }
  clampToScreen(obj);
}

export function clampToScreen(obj: any, pad = 20) {
  obj.pos.x = clamp(obj.pos.x, pad, GAME_WIDTH - pad);
  obj.pos.y = clamp(obj.pos.y, 52, GAME_HEIGHT - pad);
}

export function difficultyScale(difficulty: Difficulty): number {
  return { easy: 0.82, medium: 1, hard: 1.24 }[difficulty];
}

export function livesFor(difficulty: Difficulty): number {
  return { easy: 4, medium: 3, hard: 2 }[difficulty];
}

export function durationFor(difficulty: Difficulty): number {
  return { easy: 36, medium: 45, hard: 52 }[difficulty];
}

export function targetFor(difficulty: Difficulty): number {
  return { easy: 7, medium: 10, hard: 13 }[difficulty];
}

export function randomBetween(ctx: TemplateContext, min: number, max: number): number {
  return min + ctx.rng() * (max - min);
}

export function maybeClean(ctx: TemplateContext, obj: any, margin = 80) {
  if (
    obj.pos.x < -margin ||
    obj.pos.x > GAME_WIDTH + margin ||
    obj.pos.y < -margin ||
    obj.pos.y > GAME_HEIGHT + margin
  ) {
    ctx.k.destroy(obj);
  }
}

export function paint(ctx: TemplateContext, hex: string) {
  return ctx.k.color(...hexToRgb(hex));
}

export function rgb(k: any, hex: string) {
  return k.rgb(...hexToRgb(hex));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
