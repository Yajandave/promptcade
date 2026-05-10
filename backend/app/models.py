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


class EntitySpec(BaseModel):
    model_config = ConfigDict(use_enum_values=True, extra="ignore")

    name: str = Field(..., min_length=1, max_length=48)
    role: str = Field(..., min_length=1, max_length=64)
    visualArchetype: VisualArchetype = VisualArchetype.CUSTOM
    behavior: str | None = Field(default=None, max_length=72)
    effect: str | None = Field(default=None, max_length=72)
    icon: str | None = Field(default=None, max_length=4)

    @field_validator("name", "role", "behavior", "effect", "icon")
    @classmethod
    def compact_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return value
        return " ".join(value.replace("\n", " ").replace("\r", " ").split()).strip()


class JokeEvent(BaseModel):
    model_config = ConfigDict(extra="ignore")

    trigger: Literal["start", "progress", "hit", "pickup", "phase_change", "near_loss", "win"]
    text: str = Field(..., min_length=1, max_length=120)
    effect: str | None = Field(default=None, max_length=48)

    @field_validator("text", "effect")
    @classmethod
    def compact_joke_text(cls, value: str | None) -> str | None:
        if value is None:
            return value
        return " ".join(value.replace("\n", " ").replace("\r", " ").split()).strip()


class CreativeBrief(BaseModel):
    model_config = ConfigDict(extra="ignore")

    vibe: str = Field(..., min_length=2, max_length=72)
    playableMetaphor: str = Field(..., min_length=4, max_length=180)
    coreVerb: str = Field(..., min_length=2, max_length=32)
    worldRule: str = Field(..., min_length=4, max_length=180)
    escalation: str = Field(..., min_length=4, max_length=160)
    payoff: str = Field(..., min_length=4, max_length=160)

    @field_validator("vibe", "playableMetaphor", "coreVerb", "worldRule", "escalation", "payoff")
    @classmethod
    def compact_brief_text(cls, value: str) -> str:
        return " ".join(value.replace("\n", " ").replace("\r", " ").split()).strip()


class CastSpec(BaseModel):
    model_config = ConfigDict(extra="ignore")

    player: EntitySpec
    opponents: list[EntitySpec] = Field(default_factory=list, max_length=5)
    hazards: list[EntitySpec] = Field(default_factory=list, max_length=6)
    helpers: list[EntitySpec] = Field(default_factory=list, max_length=5)
    neutralChaos: list[EntitySpec] = Field(default_factory=list, max_length=4)
    goalObject: EntitySpec | None = None


class MechanicsSpec(BaseModel):
    model_config = ConfigDict(use_enum_values=True, extra="ignore")

    objectiveType: ObjectiveType = ObjectiveType.COLLECT_SET
    winCondition: str = Field(..., min_length=4, max_length=140)
    loseCondition: str = Field(..., min_length=4, max_length=140)
    playerAbilities: list[str] = Field(default_factory=list, max_length=5)
    worldForces: list[str] = Field(default_factory=list, max_length=5)
    specialRules: list[str] = Field(default_factory=list, max_length=5)
    targetCount: int | None = Field(default=None, ge=1, le=99)
    progressMax: int | None = Field(default=None, ge=1, le=999)

    @field_validator("winCondition", "loseCondition")
    @classmethod
    def compact_mechanic_text(cls, value: str) -> str:
        return " ".join(value.replace("\n", " ").replace("\r", " ").split()).strip()


class PresentationSpec(BaseModel):
    model_config = ConfigDict(extra="ignore")

    visualMotifs: list[str] = Field(default_factory=list, max_length=8)
    jokeEvents: list[JokeEvent] = Field(default_factory=list, max_length=8)
    microcopy: list[str] = Field(default_factory=list, max_length=8)


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
