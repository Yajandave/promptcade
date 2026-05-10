from __future__ import annotations

from enum import Enum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class GameTemplate(str, Enum):
    DODGER = "dodger"
    COLLECTOR = "collector"
    RUNNER = "runner"
    SHOOTER = "shooter"
    BOSS_FIGHT = "boss_fight"


class Difficulty(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class GenerationMode(str, Enum):
    NORMAL = "normal"
    WEIRDER = "weirder"
    HARDER = "harder"
    EASIER = "easier"


class ObjectiveType(str, Enum):
    SCORE_RUNS = "score_runs"
    REPAIR_METER = "repair_meter"
    ESCAPE_ZONE = "escape_zone"
    DEFEAT_BOSS = "defeat_boss"
    COLLECT_SET = "collect_set"
    COMPLETE_PATTERN = "complete_pattern"
    PROTECT_OBJECT = "protect_object"
    DELIVER_ITEMS = "deliver_items"
    COMBO_CHAIN = "combo_chain"
    CLEAR_WAVES = "clear_waves"


class VisualArchetype(str, Enum):
    HUMAN = "human"
    CAT = "cat"
    MOUSE = "mouse"
    PLANET = "planet"
    BLACK_HOLE = "black_hole"
    BALL = "ball"
    BAT = "bat"
    PAPER = "paper"
    BILL = "bill"
    GHOST = "ghost"
    FRUIT = "fruit"
    MACHINE = "machine"
    ASTEROID = "asteroid"
    TOOL = "tool"
    HEART = "heart"
    FOOD = "food"
    WEATHER = "weather"
    ABSTRACT_SHAPE = "abstract_shape"
    CUSTOM = "custom"


class JokeEvent(BaseModel):
    model_config = ConfigDict(use_enum_values=True, extra="ignore")

    time: int = Field(default=8, ge=0, le=60)
    text: str = Field(..., min_length=2, max_length=120)
    effect: str = Field(default="spawn_chaos", max_length=40)

    @field_validator("text", "effect")
    @classmethod
    def compact_text(cls, value: str) -> str:
        return " ".join(value.replace("\n", " ").replace("\r", " ").split()).strip()


class CreativeBrief(BaseModel):
    vibe: str = Field(default="absurd retro comedy", max_length=80)
    playableMetaphor: str = Field(default="turn the prompt into a tiny arcade situation", max_length=140)
    coreVerb: str = Field(default="collect", max_length=36)
    worldRule: str = Field(default="everything behaves like arcade nonsense", max_length=140)
    escalation: str = Field(default="more chaos appears as progress rises", max_length=140)
    payoff: str = Field(default="win by making the joke physically playable", max_length=140)

    @field_validator("*")
    @classmethod
    def compact_text(cls, value: str) -> str:
        return " ".join(value.replace("\n", " ").replace("\r", " ").split()).strip()


class EntitySpec(BaseModel):
    model_config = ConfigDict(use_enum_values=True, extra="ignore")

    name: str = Field(..., min_length=1, max_length=56)
    role: str = Field(default="thing", max_length=48)
    visualArchetype: VisualArchetype = VisualArchetype.ABSTRACT_SHAPE
    behavior: str | None = Field(default=None, max_length=64)
    effect: str | None = Field(default=None, max_length=64)
    icon: str | None = Field(default=None, max_length=8)

    @field_validator("name", "role", "behavior", "effect", "icon")
    @classmethod
    def compact_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return " ".join(value.replace("\n", " ").replace("\r", " ").split()).strip()


class CastSpec(BaseModel):
    player: EntitySpec | None = None
    opponents: list[EntitySpec] = Field(default_factory=list, max_length=6)
    hazards: list[EntitySpec] = Field(default_factory=list, max_length=8)
    helpers: list[EntitySpec] = Field(default_factory=list, max_length=8)
    neutralChaos: list[EntitySpec] = Field(default_factory=list, max_length=6)
    goalObject: EntitySpec | None = None


class MechanicsSpec(BaseModel):
    model_config = ConfigDict(use_enum_values=True, extra="ignore")

    objectiveType: ObjectiveType = ObjectiveType.COLLECT_SET
    winCondition: str = Field(default="complete the objective", max_length=120)
    loseCondition: str = Field(default="lose all lives", max_length=120)
    playerAbilities: list[str] = Field(default_factory=list, max_length=5)
    worldForces: list[str] = Field(default_factory=list, max_length=6)
    specialRules: list[str] = Field(default_factory=list, max_length=6)
    targetCount: int = Field(default=6, ge=1, le=30)
    progressMax: int = Field(default=100, ge=10, le=500)

    @field_validator("winCondition", "loseCondition")
    @classmethod
    def compact_text(cls, value: str) -> str:
        return " ".join(value.replace("\n", " ").replace("\r", " ").split()).strip()

    @field_validator("playerAbilities", "worldForces", "specialRules")
    @classmethod
    def compact_list(cls, value: list[str]) -> list[str]:
        cleaned: list[str] = []
        for item in value:
            text = " ".join(str(item).replace("\n", " ").replace("\r", " ").split()).strip()[:64]
            if text and text not in cleaned:
                cleaned.append(text)
        return cleaned[:6]


class PresentationSpec(BaseModel):
    visualMotifs: list[str] = Field(default_factory=list, max_length=8)
    jokeEvents: list[JokeEvent] = Field(default_factory=list, max_length=6)
    microcopy: list[str] = Field(default_factory=list, max_length=8)

    @field_validator("visualMotifs", "microcopy")
    @classmethod
    def compact_list(cls, value: list[str]) -> list[str]:
        cleaned: list[str] = []
        for item in value:
            text = " ".join(str(item).replace("\n", " ").replace("\r", " ").split()).strip()[:120]
            if text and text not in cleaned:
                cleaned.append(text)
        return cleaned[:8]


class GameSpec(BaseModel):
    model_config = ConfigDict(use_enum_values=True, extra="ignore")

    title: str = Field(..., min_length=2, max_length=64)
    template: GameTemplate
    hero: str = Field(..., min_length=2, max_length=48)
    enemy: str = Field(..., min_length=2, max_length=56)
    collectible: str = Field(..., min_length=2, max_length=48)
    obstacle: str = Field(..., min_length=2, max_length=48)
    goal: str = Field(..., min_length=6, max_length=120)
    tone: str = Field(..., min_length=4, max_length=72)
    palette: str = Field(default="neon-night", min_length=3, max_length=32)
    difficulty: Difficulty = Difficulty.MEDIUM
    intro: str = Field(..., min_length=8, max_length=180)
    creativeBrief: CreativeBrief | None = None
    cast: CastSpec | None = None
    mechanics: MechanicsSpec | None = None
    presentation: PresentationSpec | None = None

    @field_validator(
        "title",
        "hero",
        "enemy",
        "collectible",
        "obstacle",
        "goal",
        "tone",
        "palette",
        "intro",
    )
    @classmethod
    def compact_text(cls, value: str) -> str:
        value = " ".join(value.replace("\n", " ").replace("\r", " ").split())
        return value.strip()


class GenerateGameRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=500)
    mode: GenerationMode = GenerationMode.NORMAL


class GenerateGameResponse(BaseModel):
    gameSpec: GameSpec
    source: Literal["gemini", "fallback"]
    warnings: list[str] = Field(default_factory=list)
