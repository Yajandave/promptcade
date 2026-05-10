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
  randomBetween,
} from "./common";

export const runRunner: TemplateRunner = (ctx) => {
  const { k, palette, spec } = ctx;
  addBackdrop(ctx);
  const groundY = GAME_HEIGHT - 58;
  const player = addPlayer(ctx, 92, groundY - 18);
  const hud = addHud(ctx);
  let score = 0;
  let lives = livesFor(spec.difficulty);
  let elapsed = 0;
  let verticalVelocity = 0;
  const duration = durationFor(spec.difficulty);
  const scale = difficultyScale(spec.difficulty);
  const gravity = 1260;
  const jumpForce = -520;

  k.add([k.rect(GAME_WIDTH, 6), k.pos(0, groundY + 22), k.color(255, 255, 255), k.opacity(0.18)]);

  function spawnObstacle() {
    const obstacle = addBlock(ctx, GAME_WIDTH + 24, groundY - randomBetween(ctx, 6, 32), 22, 36, palette.danger, [
      "runnerObstacle",
      "hazard",
    ]);
    obstacle.speed = randomBetween(ctx, 172, 250) * scale;
  }

  function spawnPickup() {
    const pickup = addBlock(ctx, GAME_WIDTH + 24, groundY - randomBetween(ctx, 72, 132), 14, 14, palette.pickup, [
      "runnerPickup",
      "pickup",
    ]);
    pickup.speed = randomBetween(ctx, 165, 235) * scale;
  }

  k.loop(Math.max(0.7, 1.25 / scale), () => {
    if (!ctx.isEnded()) spawnObstacle();
  });
  k.loop(1.65, () => {
    if (!ctx.isEnded()) spawnPickup();
  });

  player.onCollide("hazard", (hazard: any) => {
    if (ctx.isEnded()) return;
    k.destroy(hazard);
    lives -= 1;
    ctx.playSound("hit");
    if (lives <= 0) ctx.endGame("lose", `${spec.obstacle} ended the run.`);
  });

  player.onCollide("pickup", (pickup: any) => {
    k.destroy(pickup);
    score += 1;
    ctx.playSound("coin");
  });

  k.onUpdate("runnerObstacle", (obj: any) => {
    obj.move(-(obj.speed ?? 180), 0);
    maybeClean(ctx, obj);
  });
  k.onUpdate("runnerPickup", (obj: any) => {
    obj.move(-(obj.speed ?? 180), 0);
    maybeClean(ctx, obj);
  });

  k.onUpdate(() => {
    if (ctx.isEnded()) return;
    elapsed += k.dt();

    const onGround = player.pos.y >= groundY - 18;
    if ((ctx.controls.actionPressed() || ctx.controls.isDown("up")) && onGround) {
      verticalVelocity = jumpForce;
      ctx.playSound("jump");
    }

    verticalVelocity += gravity * k.dt();
    player.pos.y += verticalVelocity * k.dt();
    if (player.pos.y > groundY - 18) {
      player.pos.y = groundY - 18;
      verticalVelocity = 0;
    }
    if (ctx.controls.isDown("down")) {
      player.pos.y = Math.min(groundY - 18, player.pos.y + 5);
    }

    hud.update({ score, lives, timeLeft: duration - elapsed });
    if (elapsed >= duration) ctx.endGame("win", spec.goal);
  });
};

