import type { GenerateGameResponse, GameSpec, GenerationMode } from "../game/types";
import { createFallbackGameSpec, sanitizePrompt, validateGameSpec } from "./fallbackGameSpec";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

interface ShareState {
  prompt: string;
  spec: GameSpec;
}

export async function generateGame(prompt: string, mode: GenerationMode = "normal"): Promise<GenerateGameResponse> {
  const cleanedPrompt = sanitizePrompt(prompt);

  try {
    const response = await fetch(`${API_BASE_URL}/api/generate-game`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt: cleanedPrompt, mode }),
    });

    if (!response.ok) {
      throw new Error("Promptcade API did not respond with a playable spec.");
    }

    const body = (await response.json()) as GenerateGameResponse;
    const spec = validateGameSpec(body.gameSpec);
    if (!spec) {
      throw new Error("Promptcade API returned an invalid spec.");
    }

    return {
      gameSpec: spec,
      source: body.source ?? "gemini",
      warnings: Array.isArray(body.warnings) ? body.warnings : [],
    };
  } catch {
    return {
      gameSpec: createFallbackGameSpec(cleanedPrompt, mode),
      source: "fallback",
      warnings: ["The backend was unavailable, so this cabinet used the local fallback generator."],
    };
  }
}

export function makeShareUrl(prompt: string, spec: GameSpec): string {
  const state = encodeState({ prompt: sanitizePrompt(prompt), spec });
  const url = new URL(window.location.href);
  url.searchParams.set("play", state);
  return url.toString();
}

export function readShareState(): ShareState | null {
  const raw = new URLSearchParams(window.location.search).get("play");
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(escape(window.atob(raw)))) as Partial<ShareState>;
    const spec = validateGameSpec(parsed.spec);
    if (!parsed.prompt || !spec) {
      return null;
    }
    return {
      prompt: sanitizePrompt(parsed.prompt),
      spec,
    };
  } catch {
    return null;
  }
}

function encodeState(state: ShareState): string {
  return window.btoa(unescape(encodeURIComponent(JSON.stringify(state))));
}

