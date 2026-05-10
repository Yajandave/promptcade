import type { TemplateRunner } from "../types";
import { GAME_HEIGHT, GAME_WIDTH } from "../types";
import {
  addBackdrop,
  addBlock,
  addFloatLabel,
  addHud,
  addPlayer,
  difficultyScale,
  durationFor,
  livesFor,
  maybeClean,
  moveFourWay,
  randomBetween,
  rgb,
} from "./common";

export const runBossFight: TemplateRunner = (ctx) => {
  const { k, palette, spec } = ctx;
  addBackdrop(ctx);
  const player = addPlayer(ctx, GAME_WIDTH / 2, GAME_HEIGHT - 46);
  const boss = addBlock(ctx, GAME_WIDTH / 2, 102, 86, 44, palette.danger, ["boss"]);
  addFloatLabel(ctx, spec.enemy, GAME_WIDTH / 2, 135, palette.danger);
  const hud = addHud(ctx);
  let lives = livesFor(spec.difficulty);
  let score = 0;
  let elapsed = 0;
  let shootCooldown = 0;
  let bossHp = { easy: 12, medium: 18, hard: 24 }[spec.difficulty];
  const duration = durationFor(spec.difficulty) + 8;
  const scale = difficultyScale(spec.difficulty);

  function shoot() {
    const bullet = addBlock(ctx, player.pos.x, player.pos.y - 22, 7, 15, palette.accent2, ["bullet"]);
    bullet.speed = 430;
    ctx.playSound("shoot");
  }

  function bossAttack() {
    const attack = addBlock(ctx, boss.pos.x + randomBetween(ctx, -42, 42), boss.pos.y + 34, 16, 30, palette.danger, [
      "bossAttack",
      "hazard",
    ]);
    attack.speed = randomBetween(ctx, 140, 230) * scale;
  }

  k.loop(Math.max(0.38, 0.85 / scale), () => {
    if (!ctx.isEnded()) bossAttack();
  });

  player.onCollide("hazard", (hazard: any) => {
    if (ctx.isEnded()) return;
    k.destroy(hazard);
    lives -= 1;
    ctx.playSound("hit");
    if (lives <= 0) ctx.endGame("lose", `${spec.enemy} kept the room spinning.`);
  });

  k.onCollide("bullet", "boss", (bullet: any) => {
    if (ctx.isEnded()) return;
    k.destroy(bullet);
    bossHp -= 1;
    score += 1;
    ctx.playSound("coin");
    boss.color = rgb(k, palette.ink);
    k.wait(0.06, () => {
      boss.color = rgb(k, palette.danger);
    });
    if (bossHp <= 0) ctx.endGame("win", spec.goal);
  });

  k.onUpdate("bullet", (bullet: any) => {
    bullet.move(0, -(bullet.speed ?? 430));
    maybeClean(ctx, bullet);
  });

  k.onUpdate("bossAttack", (attack: any) => {
    attack.move(0, attack.speed ?? 150);
    maybeClean(ctx, attack);
  });

  k.onUpdate(() => {
    if (ctx.isEnded()) return;
    elapsed += k.dt();
    shootCooldown = Math.max(0, shootCooldown - k.dt());
    boss.pos.x = GAME_WIDTH / 2 + Math.sin(k.time() * 1.6 * scale) * 170;
    moveFourWay(ctx, player, 218);
    player.pos.y = Math.max(GAME_HEIGHT / 2, player.pos.y);
    if ((ctx.controls.actionDown() || ctx.controls.actionPressed()) && shootCooldown <= 0) {
      shoot();
      shootCooldown = spec.difficulty === "hard" ? 0.32 : 0.25;
    }
    hud.update({ score, lives, timeLeft: duration - elapsed, bossHp });
    if (elapsed >= duration) ctx.endGame("lose", `${spec.enemy} stalled too long.`);
  });
};
