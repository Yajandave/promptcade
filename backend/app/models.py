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

