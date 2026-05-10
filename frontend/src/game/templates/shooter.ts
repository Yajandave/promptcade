import type { TemplateRunner } from "../types";
import { GAME_HEIGHT, GAME_WIDTH } from "../types";
import {
  addBackdrop,
  addBlock,
  addHud,
  addPlayer,
  difficultyScale,
  durationFor,
  livesFor,
  maybeClean,
  moveFourWay,
  randomBetween,
  targetFor,
} from "./common";

export const runShooter: TemplateRunner = (ctx) => {
  const { k, palette, spec } = ctx;
  addBackdrop(ctx);
  const player = addPlayer(ctx, GAME_WIDTH / 2, GAME_HEIGHT - 50);
  const hud = addHud(ctx);
  let score = 0;
  let lives = livesFor(spec.difficulty);
  let elapsed = 0;
  let shootCooldown = 0;
  const duration = durationFor(spec.difficulty);
  const target = targetFor(spec.difficulty) + 4;
  const scale = difficultyScale(spec.difficulty);

  function shoot() {
    const bullet = addBlock(ctx, player.pos.x, player.pos.y - 22, 6, 14, palette.accent2, ["bullet"]);
    bullet.speed = 420;
    ctx.playSound("shoot");
  }

  function spawnEnemy() {
    const enemy = addBlock(ctx, randomBetween(ctx, 30, GAME_WIDTH - 30), -24, 24, 24, palette.danger, ["enemy"]);
    enemy.speed = randomBetween(ctx, 70, 132) * scale;
    enemy.drift = randomBetween(ctx, -32, 32);
  }

  k.loop(Math.max(0.45, 0.9 / scale), () => {
    if (!ctx.isEnded()) spawnEnemy();
  });

  player.onCollide("enemy", (enemy: any) => {
    if (ctx.isEnded()) return;
    k.destroy(enemy);
    lives -= 1;
    ctx.playSound("hit");
    if (lives <= 0) ctx.endGame("lose", `${spec.enemy} broke through.`);
  });

  k.onCollide("bullet", "enemy", (bullet: any, enemy: any) => {
    k.destroy(bullet);
    k.destroy(enemy);
    score += 1;
    ctx.playSound("coin");
    if (score >= target) ctx.endGame("win", spec.goal);
  });

  k.onUpdate("bullet", (bullet: any) => {
    bullet.move(0, -(bullet.speed ?? 420));
    maybeClean(ctx, bullet);
  });
  k.onUpdate("enemy", (enemy: any) => {
    enemy.move(enemy.drift ?? 0, enemy.speed ?? 90);
    maybeClean(ctx, enemy);
  });

  k.onUpdate(() => {
    if (ctx.isEnded()) return;
    elapsed += k.dt();
    shootCooldown = Math.max(0, shootCooldown - k.dt());
    moveFourWay(ctx, player, 220);
    if ((ctx.controls.actionDown() || ctx.controls.actionPressed()) && shootCooldown <= 0) {
      shoot();
      shootCooldown = spec.difficulty === "hard" ? 0.28 : 0.22;
    }
    hud.update({ score, lives, timeLeft: duration - elapsed });
    if (elapsed >= duration) ctx.endGame("win", spec.goal);
  });
};

