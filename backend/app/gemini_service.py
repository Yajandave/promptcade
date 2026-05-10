import json
import os

from google import genai

from app.models import GameSpec
from app.safety import sanitize_spec


GAME_SPEC_JSON_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "title": {"type": "string"},
        "template": {
            "type": "string",
            "enum": ["dodger", "collector", "runner", "shooter", "boss_fight"],
        },
        "hero": {"type": "string"},
        "enemy": {"type": "string"},
        "collectible": {"type": "string"},
        "obstacle": {"type": "string"},
        "goal": {"type": "string"},
        "tone": {"type": "string"},
        "palette": {"type": "string"},
        "difficulty": {"type": "string", "enum": ["easy", "medium", "hard"]},
        "intro": {"type": "string"},
    },
    "required": [
        "title",
        "template",
        "hero",
        "enemy",
        "collectible",
        "obstacle",
        "goal",
        "tone",
        "palette",
        "difficulty",
        "intro",
    ],
}


def generate_with_gemini(prompt: str, mode: str = "normal") -> GameSpec:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured")

    client = genai.Client(api_key=api_key)
    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    response = client.models.generate_content(
        model=model,
        contents=_build_prompt(prompt, mode),
        config={
            "temperature": 0.85 if mode == "weirder" else 0.55,
            "response_mime_type": "application/json",
            "response_json_schema": GAME_SPEC_JSON_SCHEMA,
        },
    )

    data = response.parsed if getattr(response, "parsed", None) else json.loads(response.text)
    spec = GameSpec.model_validate(data)
    sanitized, _warnings = sanitize_spec(spec, mode=mode)
    return sanitized


def _build_prompt(prompt: str, mode: str) -> str:
    return f"""
You design tiny 30-60 second retro arcade microgames for Promptcade.

Return strict JSON only. Do not return markdown. Do not include JavaScript, TypeScript, HTML,
CSS, pseudocode, functions, imports, or executable code. You only produce a GameSpec object.

The game engine has fixed templates only:
- dodger: move and avoid hazards until a timer ends
- collector: collect items while avoiding enemies
- runner: side-scrolling jump/dodge survival
- shooter: move and shoot simple projectiles
- boss_fight: dodge a silly boss and shoot it

Safety:
- Transform famous characters, brands, and copyrighted settings into original generic parody-like alternatives.
- Avoid explicit sexual content, graphic violence, hateful content, or real-world harassment.
- Keep the result silly, safe, original, and playable.

Mode: {mode}
User prompt: {prompt}

Write one concise GameSpec with these exact keys:
title, template, hero, enemy, collectible, obstacle, goal, tone, palette, difficulty, intro.
""".strip()

