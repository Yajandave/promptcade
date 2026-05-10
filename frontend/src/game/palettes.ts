import type { ResolvedPalette } from "./types";

export const PALETTES: Record<string, ResolvedPalette> = {
  "neon-night": {
    name: "Neon Night",
    background: "#090715",
    panel: "#17122b",
    ink: "#f7f7ff",
    muted: "#8d9bc6",
    accent: "#00e5ff",
    accent2: "#ff3df2",
    danger: "#ff4d6d",
    pickup: "#faff00",
  },
  "candy-crisis": {
    name: "Candy Crisis",
    background: "#120813",
    panel: "#2d1230",
    ink: "#fff7fa",
    muted: "#e3a9c7",
    accent: "#ff4fa3",
    accent2: "#5df2c2",
    danger: "#ff6b35",
    pickup: "#ffe66d",
  },
  "toxic-lime": {
    name: "Toxic Lime",
    background: "#071108",
    panel: "#102417",
    ink: "#edffe8",
    muted: "#9ecc9a",
    accent: "#a3ff12",
    accent2: "#20d7ff",
    danger: "#ff315a",
    pickup: "#f4ff52",
  },
  "sunset-byte": {
    name: "Sunset Byte",
    background: "#14090d",
    panel: "#2b141d",
    ink: "#fff4de",
    muted: "#e5a986",
    accent: "#ff8f3d",
    accent2: "#35d7ff",
    danger: "#ff3d57",
    pickup: "#ffd166",
  },
  "deep-sea": {
    name: "Deep Sea",
    background: "#041018",
    panel: "#092236",
    ink: "#e8fbff",
    muted: "#82b6ca",
    accent: "#2ee6a6",
    accent2: "#75a7ff",
    danger: "#ff5d73",
    pickup: "#e6ff7a",
  },
};

export function resolvePalette(name: string): ResolvedPalette {
  return PALETTES[name] ?? PALETTES["neon-night"];
}

export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const value = Number.parseInt(clean.length === 3 ? clean.split("").map((ch) => ch + ch).join("") : clean, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

