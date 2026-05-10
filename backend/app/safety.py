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

    if mode == "harder":
        data["difficulty"] = "hard"
    elif mode == "easier":
        data["difficulty"] = "easy"
    elif data.get("difficulty") not in {"easy", "medium", "hard"}:
        data["difficulty"] = "medium"

    if mode == "weirder" and "weird" not in data["tone"].lower():
        data["tone"] = f"{data['tone']} with weird arcade nonsense"[:72]

    return GameSpec.model_validate(data), warnings


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

