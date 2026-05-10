import { hexToRgb } from "../palettes";
import type { EntitySpec, TemplateContext, VisualArchetype } from "../types";

interface DrawEntityOptions {
  size?: number;
  label?: boolean;
  color?: string;
}

type Part = { obj: any; dx: number; dy: number };

export function drawEntity(
  ctx: TemplateContext,
  entity: EntitySpec,
  x: number,
  y: number,
  tags: string[] = [],
  options: DrawEntityOptions = {},
) {
  const { k, palette } = ctx;
  const size = options.size ?? 26;
  const color = options.color ?? colorFor(entity.visualArchetype, palette);
  const root = k.add([
    k.rect(size, size),
    k.pos(x, y),
    k.anchor("center"),
    k.area(),
    k.opacity(0),
    ...tags,
  ]);
  root.entity = entity;
  root.parts = [] as any[];

  const parts: Part[] = [];
  const addPart = (obj: any, dx: number, dy: number) => {
    parts.push({ obj, dx, dy });
    root.parts.push(obj);
    return obj;
  };
  const rect = (w: number, h: number, dx: number, dy: number, hex = color, opacity = 1) =>
    addPart(k.add([k.rect(w, h), k.pos(x + dx, y + dy), k.anchor("center"), paint(k, hex), k.opacity(opacity), k.z(18)]), dx, dy);
  const circle = (radius: number, dx: number, dy: number, hex = color, opacity = 1) =>
    addPart(k.add([k.circle(radius), k.pos(x + dx, y + dy), k.anchor("center"), paint(k, hex), k.opacity(opacity), k.z(18)]), dx, dy);
  const label = (text: string, dx: number, dy: number, hex = palette.ink, opacity = 0.78) =>
    addPart(k.add([k.text(text, { size: 8, width: 86, align: "center" }), k.pos(x + dx - 43, y + dy), paint(k, hex), k.opacity(opacity), k.z(40)]), dx - 43, dy);

  drawParts(entity.visualArchetype, { rect, circle, label, size, color, palette });

  if (options.label !== false) {
    const name = entity.name.length > 18 ? `${entity.name.slice(0, 16)}...` : entity.name;
    label(name, 0, size / 2 + 7, palette.muted, 0.7);
  }

  root.onUpdate?.(() => {
    for (const part of parts) {
      part.obj.pos.x = root.pos.x + part.dx;
      part.obj.pos.y = root.pos.y + part.dy;
    }
  });
  root.onDestroy?.(() => {
    for (const part of parts) {
      try {
        k.destroy(part.obj);
      } catch {
        // KAPLAY may already have destroyed the child during scene teardown.
      }
    }
  });

  return root;
}

function drawParts(
  archetype: VisualArchetype,
  helpers: {
    rect: (w: number, h: number, dx: number, dy: number, hex?: string, opacity?: number) => any;
    circle: (radius: number, dx: number, dy: number, hex?: string, opacity?: number) => any;
    label: (text: string, dx: number, dy: number, hex?: string, opacity?: number) => any;
    size: number;
    color: string;
    palette: TemplateContext["palette"];
  },
) {
  const { rect, circle, label, size, color, palette } = helpers;
  const s = size / 26;
  if (archetype === "cat") {
    circle(9 * s, 0, 0);
    rect(5 * s, 7 * s, -7 * s, -10 * s);
    rect(5 * s, 7 * s, 7 * s, -10 * s);
    rect(14 * s, 3 * s, 13 * s, 8 * s, palette.accent2);
    label("..", 0, -5 * s, palette.panel, 1);
  } else if (archetype === "mouse") {
    circle(7 * s, 0, 2 * s);
    circle(4 * s, -6 * s, -5 * s, palette.accent2);
    circle(4 * s, 6 * s, -5 * s, palette.accent2);
    rect(13 * s, 2 * s, 11 * s, 8 * s, palette.muted);
    label("o", 0, -4 * s, palette.panel, 1);
  } else if (archetype === "planet") {
    circle(12 * s, 0, 0);
    rect(14 * s, 3 * s, 0, -3 * s, palette.pickup, 0.8);
    circle(3 * s, -5 * s, 4 * s, palette.accent2, 0.9);
    circle(2 * s, 6 * s, -5 * s, palette.accent2, 0.9);
  } else if (archetype === "black_hole") {
    circle(17 * s, 0, 0, palette.accent2, 0.24);
    circle(12 * s, 0, 0, palette.danger, 0.55);
    circle(7 * s, 0, 0, "#05040a", 1);
    rect(34 * s, 3 * s, 0, 0, palette.pickup, 0.85);
  } else if (archetype === "human") {
    circle(6 * s, 0, -9 * s, palette.ink);
    rect(12 * s, 16 * s, 0, 4 * s);
    rect(4 * s, 9 * s, -5 * s, 17 * s, palette.accent2);
    rect(4 * s, 9 * s, 5 * s, 17 * s, palette.accent2);
  } else if (archetype === "paper" || archetype === "bill") {
    rect(20 * s, 24 * s, 0, 0, archetype === "bill" ? palette.pickup : "#f7f1ff");
    rect(13 * s, 2 * s, 0, -5 * s, palette.panel, 0.7);
    rect(13 * s, 2 * s, 0, 1 * s, palette.panel, 0.7);
    label(archetype === "bill" ? "$" : "!!", 0, -7 * s, palette.panel, 1);
  } else if (archetype === "ghost") {
    circle(10 * s, 0, -3 * s, "#f7f1ff", 0.95);
    rect(20 * s, 14 * s, 0, 7 * s, "#f7f1ff", 0.95);
    label("oo", 0, -8 * s, palette.panel, 1);
  } else if (archetype === "fruit") {
    circle(11 * s, 0, 1 * s);
    rect(8 * s, 4 * s, 5 * s, -10 * s, palette.pickup);
    rect(2 * s, 7 * s, 0, -11 * s, palette.panel);
  } else if (archetype === "machine") {
    rect(24 * s, 24 * s, 0, 0);
    circle(7 * s, 0, 2 * s, palette.panel, 0.95);
    rect(15 * s, 3 * s, 0, -8 * s, palette.pickup);
  } else if (archetype === "asteroid") {
    circle(10 * s, 0, 0, palette.muted);
    circle(4 * s, -7 * s, -3 * s, color);
    circle(3 * s, 7 * s, 5 * s, color);
  } else if (archetype === "tool" || archetype === "bat") {
    rect(5 * s, 27 * s, 0, 0);
    rect(archetype === "bat" ? 12 * s : 16 * s, 5 * s, 0, -10 * s, palette.pickup);
    rect(9 * s, 4 * s, 0, 12 * s, palette.panel);
  } else if (archetype === "heart") {
    circle(7 * s, -5 * s, -3 * s, palette.danger);
    circle(7 * s, 5 * s, -3 * s, palette.danger);
    rect(14 * s, 14 * s, 0, 5 * s, palette.danger);
    label("<3", 0, -8 * s, palette.ink, 1);
  } else if (archetype === "food") {
    circle(11 * s, 0, 0);
    rect(22 * s, 4 * s, 0, 9 * s, palette.pickup);
    circle(3 * s, -5 * s, -4 * s, palette.panel, 0.8);
  } else if (archetype === "weather") {
    circle(7 * s, -6 * s, -2 * s, "#f7f1ff", 0.85);
    circle(8 * s, 2 * s, -4 * s, "#f7f1ff", 0.85);
    circle(6 * s, 8 * s, 1 * s, "#f7f1ff", 0.85);
    rect(2 * s, 8 * s, -5 * s, 10 * s, palette.accent2);
    rect(2 * s, 8 * s, 5 * s, 11 * s, palette.accent2);
  } else {
    rect(22 * s, 22 * s, 0, 0);
    circle(5 * s, -6 * s, -6 * s, palette.pickup);
    rect(10 * s, 3 * s, 5 * s, 7 * s, palette.accent2);
  }
}

function colorFor(archetype: VisualArchetype, palette: TemplateContext["palette"]): string {
  if (["hazard", "black_hole"].includes(archetype)) return palette.danger;
  if (archetype === "heart" || archetype === "fruit") return palette.danger;
  if (archetype === "paper" || archetype === "bill" || archetype === "tool" || archetype === "bat") return palette.pickup;
  if (archetype === "mouse" || archetype === "asteroid") return palette.muted;
  return palette.accent;
}

function paint(k: any, hex: string) {
  return k.color(...hexToRgb(hex));
}
