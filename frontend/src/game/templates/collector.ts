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
  moveFourWay,
  randomBetween,
  targetFor,
} from "./common";

export const runCollector: TemplateRunner = (ctx) => {
  const { k, palette, spec } = ctx;
  addBackdrop(ctx);
  const player = addPlayer(ctx, GAME_WIDTH / 2, GAME_HEIGHT / 2);
  const hud = addHud(ctx);
  const target = targetFor(spec.difficulty);
  let score = 0;
  let lives = livesFor(spec.difficulty);
  let elapsed = 0;
  const duration = durationFor(spec.difficulty);
  const scale = difficultyScale(spec.difficulty);

  function spawnPickup() {
    addBlock(
      ctx,
      randomBetween(ctx, 38, GAME_WIDTH - 38),
      randomBetween(ctx, 72, GAME_HEIGHT - 38),
      15,
      15,
      palette.pickup,
      ["pickup"],
    );
  }

  function spawnEnemy() {
    const enemy = addBlock(
      ctx,
      randomBetween(ctx, 40, GAME_WIDTH - 40),
      randomBetween(ctx, 76, GAME_HEIGHT - 40),
      22,
      22,
      palette.danger,
      ["enemy"],
    );
    enemy.dirX = ctx.rng() > 0.5 ? 1 : -1;
    enemy.dirY = ctx.rng() > 0.5 ? 1 : -1;
    enemy.speed = randomBetween(ctx, 62, 105) * scale;
  }

  for (let index = 0; index < 5; index += 1) spawnPickup();
  for (let index = 0; index < (spec.difficulty === "easy" ? 2 : spec.difficulty === "medium" ? 3 : 4); index += 1) {
    spawnEnemy();
  }

  player.onCollide("pickup", (pickup: any) => {
    k.destroy(pickup);
    score += 1;
    ctx.playSound("coin");
    spawnPickup();
    if (score >= target) {
      ctx.endGame("win", spec.goal);
    }
  });

  player.onCollide("enemy", () => {
    if (ctx.isEnded()) return;
    lives -= 1;
    ctx.playSound("hit");
    player.pos.x = GAME_WIDTH / 2;
    player.pos.y = GAME_HEIGHT / 2;
    if (lives <= 0) {
      ctx.endGame("lose", `${spec.enemy} crowded the arena.`);
    }
  });

  k.onUpdate("enemy", (enemy: any) => {
    enemy.move(enemy.dirX * enemy.speed, enemy.dirY * enemy.speed);
    if (enemy.pos.x < 24 || enemy.pos.x > GAME_WIDTH - 24) enemy.dirX *= -1;
    if (enemy.pos.y < 58 || enemy.pos.y > GAME_HEIGHT - 24) enemy.dirY *= -1;
  });

  k.onUpdate(() => {
    if (ctx.isEnded()) return;
    elapsed += k.dt();
    moveFourWay(ctx, player, 215);
    hud.update({ score, lives, timeLeft: duration - elapsed });
    if (elapsed >= duration) {
      ctx.endGame("lose", `Not enough ${spec.collectible}s.`);
    }
  });
};

