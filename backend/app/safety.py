import re
from typing import Any

from app.models import GameSpec


FAMOUS_IP_REPLACEMENTS = {
    "mario": "tiny plumber-like jumper",
    "luigi": "nervous green jumper",
    "peach": "royal pastry champion",
    "zelda": "legendary puzzle princess",
    "link": "pointy-hat woodland hero",
    "pokemon": "pocket critter league",
    "pikachu": "spark mouse mascot",
    "sonic": "speedy blue-ish hedgehog-ish blur",
    "darth vader": "dramatic space helmet villain",
    "star wars": "overdramatic space opera",
    "harry potter": "bespectacled wand-school kid",
    "hogwarts": "wizard homework castle",
    "batman": "brooding cave detective",
    "joker": "chaotic purple prankster",
    "spider-man": "web-slinging bug-costume acrobat",
    "spiderman": "web-slinging bug-costume acrobat",
    "marvel": "cape committee",
    "disney": "storybook megacorp castle",
    "fortnite": "dance-battle island",
    "minecraft": "blocky craft world",
    "among us": "suspicious space chores",
}

BLOCKED_PATTERNS = [
    r"\bexplicit sex\b",
    r"\bporn\b",
    r"\bgenitals?\b",
    r"\brape\b",
    r"\bgore\b",
    r"\bgraphic violence\b",
    r"\bslur\b",
]

SOFT_REPLACEMENT = "awkward arcade nonsense"


def sanitize_prompt(prompt: str) -> tuple[str, list[str]]:
    warnings: list[str] = []
    cleaned = _strip_control_chars(prompt).strip()
    if not cleaned:
        return "a bored toaster wants a promotion", ["Empty prompt replaced with arcade nonsense."]

    original = cleaned
    cleaned = _replace_famous_ip(cleaned)
    if cleaned != original:
        warnings.append("Some famous names were transformed into original arcade-safe alternatives.")

    blocked = _contains_blocked_content(cleaned)
    if blocked:
        cleaned = SOFT_REPLACEMENT
        warnings.append("Unsafe content was softened into silly arcade-safe nonsense.")

    return cleaned[:500], warnings


def sanitize_spec(spec: GameSpec, mode: str | None = None) -> tuple[GameSpec, list[str]]:
    warnings: list[str] = []
    data: dict[str, Any] = spec.model_dump()

    for key in ["title", "hero", "enemy", "collectible", "obstacle", "goal", "tone", "intro"]:
        next_value = safe_phrase(str(data.get(key, "")), fallback=default_for(key))
        if next_value != data.get(key):
            warnings.append(f"{key} was sanitised.")
        data[key] = next_value

    data["palette"] = safe_palette(str(data.get("palette", "neon-night")))
    data["creativeBrief"] = safe_creative_brief(data.get("creativeBrief"))
    data["cast"] = safe_cast(data.get("cast"))
    data["mechanics"] = safe_mechanics(data.get("mechanics"))
    data["presentation"] = safe_presentation(data.get("presentation"))

    if mode == "harder":
        data["difficulty"] = "hard"
    elif mode == "easier":
        data["difficulty"] = "easy"
    elif data.get("difficulty") not in {"easy", "medium", "hard"}:
        data["difficulty"] = "medium"

    if mode == "weirder" and "weird" not in data["tone"].lower():
        data["tone"] = f"{data['tone']} with weird arcade nonsense"[:72]

    return GameSpec.model_validate(data), warnings


def safe_creative_brief(value: Any) -> dict[str, Any] | None:
    if not isinstance(value, dict):
        return None
    return {
        "vibe": safe_phrase(str(value.get("vibe", "absurd retro comedy")), "absurd retro comedy"),
        "playableMetaphor": safe_phrase(
            str(value.get("playableMetaphor", "turn the prompt into a tiny arcade situation")),
            "turn the prompt into a tiny arcade situation",
        ),
        "coreVerb": safe_phrase(str(value.get("coreVerb", "collect")), "collect"),
        "worldRule": safe_phrase(str(value.get("worldRule", "everything behaves like arcade nonsense")), "everything behaves like arcade nonsense"),
        "escalation": safe_phrase(str(value.get("escalation", "more chaos appears as progress rises")), "more chaos appears as progress rises"),
        "payoff": safe_phrase(str(value.get("payoff", "win by making the joke physically playable")), "win by making the joke physically playable"),
    }


def safe_cast(value: Any) -> dict[str, Any] | None:
    if not isinstance(value, dict):
        return None
    return {
        "player": safe_entity(value.get("player")),
        "opponents": safe_entities(value.get("opponents"), 6),
        "hazards": safe_entities(value.get("hazards"), 8),
        "helpers": safe_entities(value.get("helpers"), 8),
        "neutralChaos": safe_entities(value.get("neutralChaos"), 6),
        "goalObject": safe_entity(value.get("goalObject")),
    }


def safe_entity(value: Any) -> dict[str, Any] | None:
    if not isinstance(value, dict):
        return None
    return {
        "name": safe_phrase(str(value.get("name", "arcade thing")), "arcade thing")[:56],
        "role": safe_phrase(str(value.get("role", "thing")), "thing")[:48],
        "visualArchetype": safe_archetype(str(value.get("visualArchetype", "abstract_shape"))),
        "behavior": safe_optional_phrase(value.get("behavior"), 64),
        "effect": safe_optional_phrase(value.get("effect"), 64),
        "icon": safe_optional_phrase(value.get("icon"), 8),
    }


def safe_entities(value: Any, limit: int) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        return []
    entities = [safe_entity(item) for item in value[:limit]]
    return [entity for entity in entities if entity is not None]


def safe_mechanics(value: Any) -> dict[str, Any] | None:
    if not isinstance(value, dict):
        return None
    return {
        "objectiveType": safe_objective(str(value.get("objectiveType", "collect_set"))),
        "winCondition": safe_phrase(str(value.get("winCondition", "complete the objective")), "complete the objective"),
        "loseCondition": safe_phrase(str(value.get("loseCondition", "lose all lives")), "lose all lives"),
        "playerAbilities": safe_phrase_list(value.get("playerAbilities"), 5),
        "worldForces": safe_phrase_list(value.get("worldForces"), 6),
        "specialRules": safe_phrase_list(value.get("specialRules"), 6),
        "targetCount": clamp_int(value.get("targetCount"), 6, 1, 30),
        "progressMax": clamp_int(value.get("progressMax"), 100, 10, 500),
    }


def safe_presentation(value: Any) -> dict[str, Any] | None:
    if not isinstance(value, dict):
        return None
    return {
        "visualMotifs": safe_phrase_list(value.get("visualMotifs"), 8),
        "jokeEvents": safe_joke_events(value.get("jokeEvents")),
        "microcopy": safe_phrase_list(value.get("microcopy"), 8),
    }


def safe_phrase_list(value: Any, limit: int) -> list[str]:
    if not isinstance(value, list):
        return []
    cleaned: list[str] = []
    for item in value:
        phrase = safe_phrase(str(item), "")[:120]
        if phrase and phrase not in cleaned:
            cleaned.append(phrase)
    return cleaned[:limit]


def safe_joke_events(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        return []
    events: list[dict[str, Any]] = []
    for index, item in enumerate(value[:6]):
        if not isinstance(item, dict):
            continue
        events.append(
            {
                "time": clamp_int(item.get("time"), 8 + index * 8, 0, 60),
                "text": safe_phrase(str(item.get("text", "The arcade makes a suspicious noise.")), "The arcade makes a suspicious noise.")[:120],
                "effect": safe_phrase(str(item.get("effect", "spawn_chaos")), "spawn_chaos")[:40],
            }
        )
    return events


def safe_optional_phrase(value: Any, max_length: int) -> str | None:
    if value is None:
        return None
    phrase = safe_phrase(str(value), "")[:max_length]
    return phrase or None


def safe_objective(value: str) -> str:
    allowed = {
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
    }
    return value if value in allowed else "collect_set"


def safe_archetype(value: str) -> str:
    allowed = {
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
    }
    return value if value in allowed else "abstract_shape"


def clamp_int(value: Any, fallback: int, minimum: int, maximum: int) -> int:
    try:
        number = int(value)
    except (TypeError, ValueError):
        number = fallback
    return max(minimum, min(maximum, number))


def safe_phrase(value: str, fallback: str) -> str:
    cleaned = _strip_control_chars(value)
    cleaned = _replace_famous_ip(cleaned)
    if _contains_blocked_content(cleaned):
        cleaned = fallback
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    cleaned = re.sub(r"[<>`{}$]", "", cleaned)
    return cleaned or fallback


def safe_palette(value: str) -> str:
    value = re.sub(r"[^a-z0-9-]", "", value.lower())[:32]
    return value or "neon-night"


def default_for(key: str) -> str:
    defaults = {
        "title": "Snack Panic",
        "hero": "tiny arcade underdog",
        "enemy": "wobbly excuse cloud",
        "collectible": "bonus receipt",
        "obstacle": "dramatic hazard cube",
        "goal": "survive the nonsense and look busy",
        "tone": "absurd retro comedy",
        "intro": "Grab the good stuff and dodge whatever today is throwing at you.",
    }
    return defaults[key]


def _replace_famous_ip(value: str) -> str:
    cleaned = value
    for phrase, replacement in FAMOUS_IP_REPLACEMENTS.items():
        cleaned = re.sub(re.escape(phrase), replacement, cleaned, flags=re.IGNORECASE)
    return cleaned


def _contains_blocked_content(value: str) -> bool:
    return any(re.search(pattern, value, flags=re.IGNORECASE) for pattern in BLOCKED_PATTERNS)


def _strip_control_chars(value: str) -> str:
    return "".join(ch for ch in value if ch.isprintable())
