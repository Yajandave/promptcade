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


def test_safety_transforms_famous_ip_names():
    prompt, warnings = sanitize_prompt("Mario fights Darth Vader in Star Wars")

    assert "Mario" not in prompt
    assert "Darth Vader" not in prompt
    assert "Star Wars" not in prompt
    assert warnings

