import type { TemplateRunner } from "../types";
import { GAME_HEIGHT, GAME_WIDTH } from "../types";
import { opponentEntity } from "../visuals/archetypes";
import {
  addBackdrop,
  addBlock,
  addEntity,
  addGoalObject,
  addHazard,
  addHud,
  addPickup,
  addPlayer,
  clamp,
  difficultyScale,
  hasRule,
  livesFor,
  maybeClean,
  mechanicsFor,
  moveFourWay,
  objectiveText,
  randomBetween,
  rgb,
  scheduleJokeEvents,
  showEvent,
} from "./common";

export const runBossFight: TemplateRunner = (ctx) => {
  const { k, palette, spec } = ctx;
  const mechanics = mechanicsFor(ctx);
  const objective = mechanics.objectiveType;
  const escapeMode = objective === "escape_zone" || mechanics.worldForces.some((force) => force.toLowerCase().includes("gravity"));
  const scale = difficultyScale(spec.difficulty);

  addBackdrop(ctx);
  const player = addPlayer(ctx, escapeMode ? 92 : GAME_WIDTH / 2, GAME_HEIGHT - 52);
  const boss = addEntity(ctx, opponentEntity(spec, 0), GAME_WIDTH / 2, escapeMode ? GAME_HEIGHT / 2 : 104, ["boss", "enemy"], {
    size: escapeMode ? 62 : 54,
    color: palette.danger,
  });
  const safeZone = escapeMode ? addGoalObject(ctx, GAME_WIDTH - 58, 82) : null;
  const hud = addHud(ctx);

  let lives = livesFor(spec.difficulty);
  let score = 0;
  let elapsed = 0;
  let shootCooldown = 0;
  let bossHp = objective === "defeat_boss" ? mechanics.targetCount * 3 : { easy: 12, medium: 16, hard: 22 }[spec.difficulty];
  let progress = 0;
  let boostUntil = 0;
  let invulnerableUntil = 0;
  let hazardIndex = 0;
  let helperIndex = 0;

  function shoot() {
    const bullet = addBlock(ctx, player.pos.x, player.pos.y - 22, 7, 15, palette.accent2, ["bullet"]);
    bullet.speed = hasRule(ctx, "coffee") || hasRule(ctx, "citation") ? 470 : 420;
    ctx.playSound("shoot");
  }

  function spawnAttack() {
    const hazard = addHazard(
      ctx,
      escapeMode ? boss.pos.x + randomBetween(ctx, -24, 24) : boss.pos.x + randomBetween(ctx, -50, 50),
      escapeMode ? boss.pos.y + randomBetween(ctx, -24, 24) : boss.pos.y + 42,
      hazardIndex,
    );
    hazard.angleSeed = randomBetween(ctx, 0, Math.PI * 2);
    hazard.radius = randomBetween(ctx, 54, 150);
    hazard.speed = randomBetween(ctx, 1.2, 2.2) * scale;
    hazard.fallSpeed = randomBetween(ctx, 120, 220) * scale;
    hazardIndex += 1;
  }

  function spawnHelper() {
    const helper = addPickup(
      ctx,
      randomBetween(ctx, 48, GAME_WIDTH - 48),
      randomBetween(ctx, 76, GAME_HEIGHT - 42),
      helperIndex,
    );
    helperIndex += 1;
  }

  function takeHit(threat?: any) {
    if (ctx.isEnded() || elapsed < invulnerableUntil) return;
    if (threat?.is?.("hazard")) k.destroy(threat);
    lives -= 1;
    invulnerableUntil = elapsed + 1.15;
    boostUntil = Math.max(boostUntil, elapsed + 0.35);
    player.pos.x = escapeMode ? 92 : GAME_WIDTH / 2;
    player.pos.y = escapeMode ? GAME_HEIGHT - 70 : GAME_HEIGHT - 52;
    ctx.playSound("hit");
    if (lives <= 0) ctx.endGame("lose", mechanics.loseCondition || `${spec.enemy} won the tiny argument.`);
  }

  function collectHelper(helper: any) {
    k.destroy(helper);
    ctx.playSound("coin");
    boostUntil = elapsed + 2.2;
    if (escapeMode) progress = clamp(progress + 12, 0, mechanics.progressMax);
    else bossHp = Math.max(0, bossHp - 1);
    showEvent(ctx, helper.entity?.effect ?? `${spec.collectible} helps for a moment.`);
  }

  function applyGravity() {
    const dx = boss.pos.x - player.pos.x;
    const dy = boss.pos.y - player.pos.y;
    const distance = Math.hypot(dx, dy) || 1;
    const pull = (boostUntil > elapsed ? 34 : 76) * scale;
    player.move((dx / distance) * pull, (dy / distance) * pull);
    if (distance < 38) takeHit();
    if (safeZone && distanceBetween(player, safeZone) < 56) {
      progress = clamp(progress + k.dt() * 24, 0, mechanics.progressMax);
      if (progress >= mechanics.progressMax) ctx.endGame("win", mechanics.winCondition || spec.goal);
    } else {
      progress = Math.max(0, progress - k.dt() * 4);
    }
  }

  player.onCollide("hazard", takeHit);
  player.onCollide("enemy", () => {
    if (!escapeMode) takeHit();
  });
  player.onCollide("pickup", collectHelper);

  k.onCollide("bullet", "boss", (bullet: any) => {
    if (ctx.isEnded() || escapeMode) return;
    k.destroy(bullet);
    bossHp -= hasRule(ctx, "coffee") ? 2 : 1;
    score += 1;
    ctx.playSound("coin");
    boss.color = rgb(k, palette.ink);
    k.wait(0.06, () => {
      boss.color = rgb(k, palette.danger);
    });
    if (bossHp <= 0) ctx.endGame("win", mechanics.winCondition || spec.goal);
  });

  k.loop(Math.max(0.46, 1.05 / scale), () => {
    if (!ctx.isEnded()) spawnAttack();
  });
  k.loop(5.5, () => {
    if (!ctx.isEnded()) spawnHelper();
  });
  scheduleJokeEvents(ctx, (effect) => {
    if (effect.includes("helper")) spawnHelper();
    if (effect.includes("hazard") || effect.includes("gravity")) spawnAttack();
    if (effect.includes("screen") || effect.includes("phase")) k.shake?.(8);
  });

  for (let index = 0; index < 3; index += 1) spawnAttack();
  spawnHelper();

  k.onUpdate("bullet", (bullet: any) => {
    bullet.move(0, -(bullet.speed ?? 430));
    maybeClean(ctx, bullet);
  });

  k.onUpdate("hazard", (hazard: any) => {
    if (ctx.isEnded()) return;
    if (escapeMode) {
      const angle = (hazard.angleSeed ?? 0) + elapsed * (hazard.speed ?? 1.4);
      hazard.pos.x = boss.pos.x + Math.cos(angle) * (hazard.radius ?? 100);
      hazard.pos.y = boss.pos.y + Math.sin(angle) * ((hazard.radius ?? 100) * 0.62);
    } else {
      hazard.move(Math.sin(elapsed * 2 + (hazard.angleSeed ?? 0)) * 40, hazard.fallSpeed ?? 150);
      maybeClean(ctx, hazard);
    }
  });

  k.onUpdate(() => {
    if (ctx.isEnded()) return;
    elapsed += k.dt();
    shootCooldown = Math.max(0, shootCooldown - k.dt());

    const speed = (boostUntil > elapsed ? 285 : 218) * (hasRule(ctx, "dash") ? 1.08 : 1);
    moveFourWay(ctx, player, speed);
    if (escapeMode) {
      applyGravity();
      boss.angle = elapsed;
    } else {
      boss.pos.x = GAME_WIDTH / 2 + Math.sin(k.time() * 1.45 * scale) * 170;
      player.pos.y = Math.max(GAME_HEIGHT / 2, player.pos.y);
      if ((ctx.controls.actionDown() || ctx.controls.actionPressed()) && shootCooldown <= 0) {
        shoot();
        shootCooldown = spec.difficulty === "hard" ? 0.34 : 0.26;
      }
    }

    hud.update({
      score,
      lives,
      elapsed,
      bossHp: escapeMode ? undefined : bossHp,
      progress: escapeMode ? (progress / mechanics.progressMax) * 100 : undefined,
      objective: objectiveText(objective),
    });
  });
};

function distanceBetween(a: any, b: any): number {
  return Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y);
}
