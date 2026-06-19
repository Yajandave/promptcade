import json
import os

from google import genai

from app.models import GameSpec
from app.safety import sanitize_spec


OBJECTIVES = [
    "score_runs",
    "repair_meter",
    "escape_zone",
    "defeat_boss",
    "collect_set",
    "complete_pattern",
    "protect_object",
    "deliver_items",
    "combo_chain",
    "clear_waves",
]

ARCHETYPES = [
    "human",
    "cat",
    "mouse",
    "planet",
    "black_hole",
    "ball",
    "bat",
    "paper",
    "bill",
    "ghost",
    "fruit",
    "machine",
    "asteroid",
    "tool",
    "heart",
    "food",
    "weather",
    "abstract_shape",
    "custom",
]

ENTITY_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "name": {"type": "string"},
        "role": {"type": "string"},
        "visualArchetype": {"type": "string", "enum": ARCHETYPES},
        "behavior": {"type": "string"},
        "effect": {"type": "string"},
        "icon": {"type": "string"},
    },
    "required": ["name", "role", "visualArchetype"],
}

JOKE_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "time": {"type": "integer"},
        "text": {"type": "string"},
        "effect": {"type": "string"},
    },
    "required": ["time", "text", "effect"],
}

GAME_SPEC_JSON_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "title": {"type": "string"},
        "template": {"type": "string", "enum": ["dodger", "collector", "runner", "shooter", "boss_fight"]},
        "hero": {"type": "string"},
        "enemy": {"type": "string"},
        "collectible": {"type": "string"},
        "obstacle": {"type": "string"},
        "goal": {"type": "string"},
        "tone": {"type": "string"},
        "palette": {"type": "string"},
        "difficulty": {"type": "string", "enum": ["easy", "medium", "hard"]},
        "intro": {"type": "string"},
        "creativeBrief": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "vibe": {"type": "string"},
                "playableMetaphor": {"type": "string"},
                "coreVerb": {"type": "string"},
                "worldRule": {"type": "string"},
                "escalation": {"type": "string"},
                "payoff": {"type": "string"},
            },
            "required": ["vibe", "playableMetaphor", "coreVerb", "worldRule", "escalation", "payoff"],
        },
        "cast": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "player": ENTITY_SCHEMA,
                "opponents": {"type": "array", "items": ENTITY_SCHEMA},
                "hazards": {"type": "array", "items": ENTITY_SCHEMA},
                "helpers": {"type": "array", "items": ENTITY_SCHEMA},
                "neutralChaos": {"type": "array", "items": ENTITY_SCHEMA},
                "goalObject": ENTITY_SCHEMA,
            },
            "required": ["player", "opponents", "hazards", "helpers", "neutralChaos", "goalObject"],
        },
        "mechanics": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "objectiveType": {"type": "string", "enum": OBJECTIVES},
                "winCondition": {"type": "string"},
                "loseCondition": {"type": "string"},
                "playerAbilities": {"type": "array", "items": {"type": "string"}},
                "worldForces": {"type": "array", "items": {"type": "string"}},
                "specialRules": {"type": "array", "items": {"type": "string"}},
                "targetCount": {"type": "integer"},
                "progressMax": {"type": "integer"},
            },
            "required": [
                "objectiveType",
                "winCondition",
                "loseCondition",
                "playerAbilities",
                "worldForces",
                "specialRules",
                "targetCount",
                "progressMax",
            ],
        },
        "presentation": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "visualMotifs": {"type": "array", "items": {"type": "string"}},
                "jokeEvents": {"type": "array", "items": JOKE_SCHEMA},
                "microcopy": {"type": "array", "items": {"type": "string"}},
            },
            "required": ["visualMotifs", "jokeEvents", "microcopy"],
        },
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
        "creativeBrief",
        "cast",
        "mechanics",
        "presentation",
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
            "temperature": 0.92 if mode == "weirder" else 0.62,
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
You are the tiny game director for Promptcade.

Return strict JSON only. Do not return markdown. Do not include JavaScript, TypeScript,
HTML, CSS, pseudocode, functions, imports, or executable code. You only produce structured data.

Promptcade is not a game-development platform. It is an instant playable nonsense machine.
Your job is to convert the user prompt into one clear microgame situation:
prompt -> playable interpretation -> world rule -> cast of forces -> objective -> visual archetypes -> jokes.

Use fixed templates only:
- dodger
- collector
- runner
- shooter
- boss_fight

Prefer objective-based play over timers. Timers may pace events, but the main win condition should be
repairing, scoring, escaping, collecting a set, defeating a boss, delivering items, protecting a thing,
completing a pattern, chaining a combo, or clearing waves.

Design requirements:
- The prompt must affect mechanics, not just names.
- Choose readable symbolic visualArchetype values for every entity.
- Include multiple forces where useful: opponents, hazards, helpers, neutral chaos, and a goal object.
- Keep it safe, silly, original, and playable in 30-60 seconds.
- Transform famous IP/brands into original parody-like alternatives.
- Avoid explicit sexual content, graphic violence, hateful content, or real-world harassment.
- Never generate executable code.

Good examples:
- "Cat playing cricket against the team of mouse" becomes a cat player scoring runs against mouse fielders,
  with ball hazards, bat helpers, and a score_runs objective.
- "Earth vs Black hole" becomes a planet escaping gravity pull from a black hole with asteroid hazards and
  an escape_zone objective.
- "My landlord is ignoring my broken boiler" becomes a tenant repairing a boiler meter while dodging landlord
  excuses, cold bills, and frozen pipes.

Mode: {mode}
User prompt: {prompt}

Return one complete GameSpec with legacy fields plus creativeBrief, cast, mechanics, and presentation.
""".strip()
