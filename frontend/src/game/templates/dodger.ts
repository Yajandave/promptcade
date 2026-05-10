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
} from "./common";

export const runDodger: TemplateRunner = (ctx) => {
  const { k, palette, spec } = ctx;
  addBackdrop(ctx);
  const player = addPlayer(ctx, GAME_WIDTH / 2, GAME_HEIGHT - 56);
  const hud = addHud(ctx);
  let score = 0;
  let lives = livesFor(spec.difficulty);
  let elapsed = 0;
  const duration = durationFor(spec.difficulty);
  const scale = difficultyScale(spec.difficulty);

  function spawnHazard() {
    const width = randomBetween(ctx, 18, 42);
    const hazard = addBlock(ctx, randomBetween(ctx, 26, GAME_WIDTH - 26), -30, width, 18, palette.danger, [
      "hazard",
      "falling",
    ]);
    hazard.speed = randomBetween(ctx, 120, 220) * scale;
    addFloatLabel(ctx, spec.obstacle, hazard.pos.x, hazard.pos.y - 10, palette.danger);
  }

  function spawnPickup() {
    const pickup = addBlock(ctx, randomBetween(ctx, 28, GAME_WIDTH - 28), -26, 14, 14, palette.pickup, [
      "pickup",
      "falling",
    ]);
    pickup.speed = randomBetween(ctx, 90, 150);
  }

  k.loop(Math.max(0.34, 0.72 / scale), () => {
    if (!ctx.isEnded()) spawnHazard();
  });
  k.loop(1.4, () => {
    if (!ctx.isEnded()) spawnPickup();
  });

  player.onCollide("hazard", (hazard: any) => {
    if (ctx.isEnded()) return;
    k.destroy(hazard);
    lives -= 1;
    ctx.playSound("hit");
    if (lives <= 0) ctx.endGame("lose", `${spec.enemy} got you.`);
  });

  player.onCollide("pickup", (pickup: any) => {
    k.destroy(pickup);
    score += 1;
    ctx.playSound("coin");
  });

  k.onUpdate("falling", (obj: any) => {
    obj.move(0, obj.speed ?? 120);
    maybeClean(ctx, obj);
  });

  k.onUpdate(() => {
    if (ctx.isEnded()) return;
    elapsed += k.dt();
    moveFourWay(ctx, player, 205);
    hud.update({ score, lives, timeLeft: duration - elapsed });
    if (elapsed >= duration) {
      ctx.endGame("win", spec.goal);
    }
  });
};

