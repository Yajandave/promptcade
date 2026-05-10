from app.fallback_generator import generate_fallback_spec
from app.models import GameSpec
from app.safety import sanitize_prompt


def test_fallback_generator_returns_valid_spec():
    spec = generate_fallback_spec("my boiler is screaming again", mode="normal")

    assert isinstance(spec, GameSpec)
    assert spec.template in {"dodger", "collector", "runner", "shooter", "boss_fight"}
    assert spec.difficulty in {"easy", "medium", "hard"}
    assert spec.title
    assert spec.intro
    assert spec.creativeBrief
    assert spec.cast
    assert spec.cast.player
    assert spec.mechanics
    assert spec.presentation


def test_sports_prompt_creates_cat_mouse_score_game():
    spec = generate_fallback_spec("Cat playing cricket against the team of mouse", mode="normal")

    assert spec.template == "collector"
    assert spec.mechanics
    assert spec.mechanics.objectiveType == "score_runs"
    assert spec.cast
    assert spec.cast.player
    assert spec.cast.player.visualArchetype == "cat"
    assert any(opponent.visualArchetype == "mouse" for opponent in spec.cast.opponents)


def test_space_prompt_creates_black_hole_escape_game():
    spec = generate_fallback_spec("Earth vs Black hole", mode="normal")

    assert spec.template == "boss_fight"
    assert spec.mechanics
    assert spec.mechanics.objectiveType == "escape_zone"
    assert spec.cast
    assert spec.cast.player
    assert spec.cast.player.visualArchetype == "planet"
    assert any(opponent.visualArchetype == "black_hole" for opponent in spec.cast.opponents)


def test_safety_transforms_famous_ip_names():
    prompt, warnings = sanitize_prompt("Mario fights Darth Vader in Star Wars")

    assert "Mario" not in prompt
    assert "Darth Vader" not in prompt
    assert "Star Wars" not in prompt
    assert warnings
