import type { TemplateRunner } from "../types";
import { GAME_HEIGHT, GAME_WIDTH } from "../types";
import {
  addBackdrop,
  addGoalObject,
  addHazard,
  addHud,
  addOpponent,
  addPickup,
  addPlayer,
  clamp,
  difficultyScale,
  hasRule,
  livesFor,
  mechanicsFor,
  moveFourWay,
  objectiveText,
  randomBetween,
  scheduleJokeEvents,
  showEvent,
} from "./common";

export const runCollector: TemplateRunner = (ctx) => {
  const { k, spec } = ctx;
  const mechanics = mechanicsFor(ctx);
  addBackdrop(ctx);
  const player = addPlayer(ctx, GAME_WIDTH / 2, GAME_HEIGHT / 2);
  const hud = addHud(ctx);
  const scale = difficultyScale(spec.difficulty);
  const target = mechanics.targetCount;
  const progressMax = mechanics.progressMax;
  const objective = mechanics.objectiveType;
  const needsGoal = ["deliver_items", "repair_meter", "protect_object", "escape_zone"].includes(objective);
  const goal = needsGoal ? addGoalObject(ctx, GAME_WIDTH - 74, GAME_HEIGHT / 2) : null;

  let score = 0;
  let progress = 0;
  let lives = livesFor(spec.difficulty);
  let elapsed = 0;
  let carried = 0;
  let delivered = 0;
  let combo = 0;
  let goalHealth = 100;
  let invulnerableUntil = 0;
  let pickupIndex = 0;
  let hazardIndex = 0;
  let opponentIndex = 0;
  let dashUntil = 0;

  function spawnPickup() {
    const pickup = addPickup(
      ctx,
      randomBetween(ctx, 42, GAME_WIDTH - 42),
      randomBetween(ctx, 78, GAME_HEIGHT - 38),
      pickupIndex,
    );
    pickup.kind = "helper";
    pickupIndex += 1;
  }

  function spawnHazard() {
    const hazard = addHazard(
      ctx,
      randomBetween(ctx, 36, GAME_WIDTH - 36),
      randomBetween(ctx, 72, GAME_HEIGHT - 34),
      hazardIndex,
    );
    hazard.dirX = randomBetween(ctx, -1, 1) || 1;
    hazard.dirY = randomBetween(ctx, -1, 1) || 1;
    hazard.speed = randomBetween(ctx, 35, 78) * scale;
    hazardIndex += 1;
  }

  function spawnOpponent() {
    const enemy = addOpponent(
      ctx,
      randomBetween(ctx, 44, GAME_WIDTH - 44),
      randomBetween(ctx, 80, GAME_HEIGHT - 44),
      opponentIndex,
    );
    enemy.dirX = ctx.rng() > 0.5 ? 1 : -1;
    enemy.dirY = ctx.rng() > 0.5 ? 1 : -1;
    enemy.speed = randomBetween(ctx, 58, 98) * scale;
    opponentIndex += 1;
  }

  function addProgress(amount: number) {
    progress = clamp(progress + amount, 0, progressMax);
  }

  function collectPickup(pickup: any) {
    if (ctx.isEnded()) return;
    k.destroy(pickup);
    ctx.playSound("coin");

    if (objective === "deliver_items") {
      carried += 1;
      score += 1;
      showEvent(ctx, `Carrying ${carried} ${spec.collectible}. Get to ${spec.cast?.goalObject?.name ?? "the goal"}.`);
    } else if (objective === "repair_meter") {
      score += 1;
      addProgress(hasRule(ctx, "tool") ? 22 : 17);
    } else if (objective === "score_runs") {
      score += 1;
      addProgress(100 / target);
    } else if (objective === "combo_chain") {
      combo += 1;
      score += 1;
      addProgress(10 + combo * 2);
    } else if (objective === "complete_pattern") {
      combo = (combo + 1) % 4;
      score += 1;
      addProgress(combo === 0 ? 22 : 12);
    } else {
      score += 1;
      addProgress(100 / target);
    }

    spawnPickup();
    if (score % 3 === 0) spawnOpponent();
    if (score % 4 === 0) spawnHazard();
    checkObjective();
  }

  function takeHit(threat: any) {
    if (ctx.isEnded() || elapsed < invulnerableUntil) return;
    if (threat?.is?.("hazard")) k.destroy(threat);
    lives -= 1;
    combo = 0;
    progress = Math.max(0, progress - 8);
    invulnerableUntil = elapsed + 1.1;
    player.pos.x = GAME_WIDTH / 2;
    player.pos.y = GAME_HEIGHT / 2;
    ctx.playSound("hit");
    if (lives <= 0) {
      ctx.endGame("lose", mechanics.loseCondition || `${spec.enemy} took over the room.`);
    }
  }

  function deliverIfClose() {
    if (!goal || objective !== "deliver_items" || carried <= 0) return;
    if (distance(player, goal) < 42) {
      delivered += carried;
      addProgress((carried / target) * 100);
      carried = 0;
      ctx.playSound("coin");
      showEvent(ctx, `Delivered! ${target - delivered > 0 ? `${target - delivered} to go.` : "The cabinet accepts this offering."}`);
      checkObjective();
    }
  }

  function protectGoal() {
    if (!goal || objective !== "protect_object") return;
    for (const enemy of k.get("enemy")) {
      if (distance(enemy, goal) < 52) {
        goalHealth -= k.dt() * 10 * scale;
        progress = clamp(progress + k.dt() * 4, 0, progressMax);
      }
    }
    if (goalHealth <= 0) ctx.endGame("lose", `${spec.cast?.goalObject?.name ?? "the goal"} got overwhelmed.`);
  }

  function checkObjective() {
    const countWin = score >= target;
    const progressWin = progress >= progressMax;
    const deliveredWin = objective === "deliver_items" && delivered >= target;
    if (objective === "repair_meter" && progressWin) ctx.endGame("win", mechanics.winCondition || spec.goal);
    else if (objective === "deliver_items" && deliveredWin) ctx.endGame("win", mechanics.winCondition || spec.goal);
    else if (objective === "protect_object" && progressWin && goalHealth > 0) ctx.endGame("win", mechanics.winCondition || spec.goal);
    else if (["score_runs", "collect_set", "combo_chain", "complete_pattern", "clear_waves"].includes(objective) && (countWin || progressWin)) {
      ctx.endGame("win", mechanics.winCondition || spec.goal);
    }
  }

  player.onCollide("pickup", collectPickup);
  player.onCollide("hazard", takeHit);
  player.onCollide("enemy", takeHit);

  for (let index = 0; index < 5; index += 1) spawnPickup();
  for (let index = 0; index < (spec.difficulty === "easy" ? 1 : 2); index += 1) spawnOpponent();
  for (let index = 0; index < (spec.difficulty === "hard" ? 3 : 2); index += 1) spawnHazard();

  k.loop(Math.max(1.15, 2.2 / scale), () => {
    if (ctx.isEnded()) return;
    if (ctx.rng() > 0.48) spawnHazard();
    if (ctx.rng() > 0.58) spawnOpponent();
  });

  scheduleJokeEvents(ctx, (effect) => {
    if (effect.includes("helper")) spawnPickup();
    if (effect.includes("hazard")) spawnHazard();
    if (effect.includes("opponent")) spawnOpponent();
    if (effect.includes("screen")) k.shake?.(8);
  });

  k.onUpdate("enemy", (enemy: any) => {
    if (ctx.isEnded()) return;
    const chase = enemy.entity?.behavior?.includes("chase") || enemy.entity?.behavior?.includes("charge") || objective === "repair_meter";
    if (chase) {
      const dx = player.pos.x - enemy.pos.x;
      const dy = player.pos.y - enemy.pos.y;
      const length = Math.hypot(dx, dy) || 1;
      enemy.move((dx / length) * enemy.speed, (dy / length) * enemy.speed);
    } else {
      enemy.move(enemy.dirX * enemy.speed, enemy.dirY * enemy.speed);
    }
    if (enemy.pos.x < 24 || enemy.pos.x > GAME_WIDTH - 24) enemy.dirX *= -1;
    if (enemy.pos.y < 58 || enemy.pos.y > GAME_HEIGHT - 24) enemy.dirY *= -1;
  });

  k.onUpdate("hazard", (hazard: any) => {
    if (ctx.isEnded()) return;
    hazard.move(hazard.dirX * hazard.speed, hazard.dirY * hazard.speed);
    if (hazard.pos.x < 24 || hazard.pos.x > GAME_WIDTH - 24) hazard.dirX *= -1;
    if (hazard.pos.y < 58 || hazard.pos.y > GAME_HEIGHT - 24) hazard.dirY *= -1;
  });

  k.onUpdate(() => {
    if (ctx.isEnded()) return;
    elapsed += k.dt();
    if (ctx.controls.actionPressed()) dashUntil = elapsed + 0.22;
    const speed = (dashUntil > elapsed ? 330 : 220) * (hasRule(ctx, "slippery") ? 0.93 : 1);
    moveFourWay(ctx, player, speed);
    if (hasRule(ctx, "wind")) player.move(Math.sin(elapsed * 2) * 42, 0);
    deliverIfClose();
    protectGoal();
    hud.update({
      score: objective === "deliver_items" ? delivered : score,
      lives,
      elapsed,
      progress: objective === "protect_object" ? goalHealth : (progress / progressMax) * 100,
      objective: objectiveText(objective),
    });
  });
};

function distance(a: any, b: any): number {
  return Math.hypot(a.pos.x - b.pos.x, a.pos.y - b.pos.y);
}
