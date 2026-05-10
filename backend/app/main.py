import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.fallback_generator import generate_fallback_spec
from app.gemini_service import generate_with_gemini
from app.models import GenerateGameRequest, GenerateGameResponse
from app.safety import sanitize_prompt

load_dotenv(override=True)

app = FastAPI(
    title="Promptcade API",
    description="Generates validated Promptcade GameSpec JSON for fixed arcade templates.",
    version="0.1.0",
)

origins = [
    origin.strip()
    for origin in os.getenv(
        "FRONTEND_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174",
    ).split(",")
    if origin.strip()
]
allow_all_origins = os.getenv("ALLOW_ALL_ORIGINS", "true").lower() == "true"

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if allow_all_origins else origins,
    allow_credentials=not allow_all_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/generate-game", response_model=GenerateGameResponse)
def generate_game(request: GenerateGameRequest) -> GenerateGameResponse:
    prompt, warnings = sanitize_prompt(request.prompt)
    mode = request.mode.value if hasattr(request.mode, "value") else str(request.mode)

    try:
        spec = generate_with_gemini(prompt, mode=mode)
        return GenerateGameResponse(gameSpec=spec, source="gemini", warnings=warnings)
    except Exception:
        warnings.append("Gemini was unavailable or returned an invalid spec, so Promptcade used the local fallback.")
        spec = generate_fallback_spec(prompt, mode=mode)
        return GenerateGameResponse(gameSpec=spec, source="fallback", warnings=warnings)
