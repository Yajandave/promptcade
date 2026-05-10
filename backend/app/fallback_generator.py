import hashlib
import random
import re

from app.models import GameSpec
from app.safety import sanitize_prompt, sanitize_spec


TEMPLATES = ["dodger", "collector", "runner", "shooter", "boss_fight"]
PALETTES = ["neon-night", "candy-crisis", "toxic-lime", "sunset-byte", "deep-sea"]

STOPWORDS = {
    "the",
    "and",
    "but",
    "for",
    "with",
    "that",
    "this",
    "from",
    "into",
    "about",
    "because",
    "just",
    "really",
    "very",
    "have",
    "has",
    "was",
    "were",
    "are",
    "you",
    "your",
    "our",
    "their",
    "they",
    "them",
    "today",
    "tomorrow",
}

TITLE_BITS = [
    "Panic",
    "Blaster",
    "Dash",
    "Meltdown",
    "Quest",
    "Fiasco",
    "Rumble",
    "Gobstopper",
    "Circuit",
    "Emergency",
]

SILLY_NOUNS = [
    "receipt",
    "toast",
    "deadline",
    "sock",
    "sandwich",
    "elevator",
    "mood ring",
    "coffee stain",
    "tiny invoice",
    "office fern",
]

ENEMY_BITS = [
    "flying excuses",
    "haunted notifications",
    "wobbly drama blocks",
    "tax gobbets",
    "suspicious calendar invites",
    "neon inconvenience cubes",
]


def generate_fallback_spec(prompt: str, mode: str = "normal") -> GameSpec:
    clean_prompt, _warnings = sanitize_prompt(prompt)
    rng = random.Random(_stable_seed(clean_prompt, mode))
    words = _keywords(clean_prompt)

    main = rng.choice(words) if words else rng.choice(SILLY_NOUNS)
    side = rng.choice([word for word in words if word != main] or SILLY_NOUNS)
    template = _pick_template(clean_prompt, rng)
    difficulty = _pick_difficulty(mode, clean_prompt, rng)

    hero = f"{rng.choice(['tiny', 'frazzled', 'neon', 'sleepy', 'heroic'])} {main}"
    enemy = rng.choice(ENEMY_BITS) if not words else f"{rng.choice(['flying', 'dramatic', 'overcaffeinated', 'rubbery'])} {side} swarm"
    collectible = f"{rng.choice(['bonus', 'glowing', 'premium', 'forbidden'])} {rng.choice(words or SILLY_NOUNS)}"
    obstacle = f"{rng.choice(['spiky', 'late', 'booming', 'cursed'])} {rng.choice(words or SILLY_NOUNS)}"
    title = _title_case(f"{main} {rng.choice(TITLE_BITS)}")

    spec = GameSpec(
        title=title,
        template=template,
        hero=hero,
        enemy=enemy,
        collectible=collectible,
        obstacle=obstacle,
        goal=_goal_for(template, main),
        tone=_tone_for(mode, rng),
        palette=rng.choice(PALETTES),
        difficulty=difficulty,
        intro=f"{_verb_for(template)} {collectible}s before the {enemy} ruin the cabinet.",
    )
    sanitized, _ = sanitize_spec(spec, mode=mode)
    return sanitized


def _stable_seed(prompt: str, mode: str) -> int:
    digest = hashlib.sha256(f"{prompt}|{mode}".encode("utf-8")).hexdigest()
    return int(digest[:16], 16)


def _keywords(prompt: str) -> list[str]:
    words = re.findall(r"[a-zA-Z][a-zA-Z0-9'-]{2,}", prompt.lower())
    filtered = [word.strip("'") for word in words if word not in STOPWORDS]
    deduped: list[str] = []
    for word in filtered:
        if word not in deduped:
            deduped.append(word)
    return deduped[:8]


def _pick_template(prompt: str, rng: random.Random) -> str:
    lower = prompt.lower()
    if any(word in lower for word in ["boss", "manager", "landlord", "final", "giant", "villain"]):
        return "boss_fight"
    if any(word in lower for word in ["shoot", "blast", "email", "laser", "zap"]):
        return "shooter"
    if any(word in lower for word in ["run", "late", "commute", "bus", "deadline", "escape"]):
        return "runner"
    if any(word in lower for word in ["collect", "gather", "find", "snack", "receipt"]):
        return "collector"
    return rng.choice(TEMPLATES)


def _pick_difficulty(mode: str, prompt: str, rng: random.Random) -> str:
    if mode == "harder":
        return "hard"
    if mode == "easier":
        return "easy"
    if any(word in prompt.lower() for word in ["impossible", "angry", "panic", "chaos"]):
        return "hard"
    return rng.choice(["easy", "medium", "medium", "hard"])


def _goal_for(template: str, main: str) -> str:
    goals = {
        "dodger": f"survive until the {main} alarm stops beeping",
        "collector": f"collect enough {main} tokens before the timer gives up",
        "runner": f"keep running until the {main} corridor ends",
        "shooter": f"zap the incoming nonsense and protect the {main} vibes",
        "boss_fight": f"bonk the oversized {main} problem until it apologises",
    }
    return goals[template]


def _tone_for(mode: str, rng: random.Random) -> str:
    if mode == "weirder":
        return rng.choice(
            [
                "deeply weird retro comedy",
                "surreal snack-machine melodrama",
                "absurd neon fever dream",
            ]
        )
    return rng.choice(["absurd retro comedy", "neon arcade farce", "tiny cabinet chaos"])


def _verb_for(template: str) -> str:
    return {
        "dodger": "Dodge hazards and scoop",
        "collector": "Grab",
        "runner": "Jump past disaster and collect",
        "shooter": "Blast the nonsense to earn",
        "boss_fight": "Dodge the boss and win",
    }[template]


def _title_case(value: str) -> str:
    return " ".join(part.capitalize() for part in value.split())[:64]

