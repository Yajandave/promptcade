# Promptcade

Promptcade turns any sentence, joke, complaint, mood, or random thought into a tiny playable retro arcade microgame.

It is intentionally not a serious game-development platform. The product idea is an instant playable nonsense machine: type anything, get a silly 30-60 second arcade cabinet.

## Why fixed templates

Promptcade does not ask AI to write executable game code. Gemini only returns a strict `GameSpec` JSON object. The frontend owns the game engine, templates, rules, collisions, scoring, timers, health, and rendering.

That keeps the MVP safer, faster, and more reliable:

- No arbitrary generated JavaScript.
- Every output is validated before play.
- Weird prompts still land inside known playable templates.
- The app can work without an API key through deterministic fallback generation.

## Architecture

```text
User prompt
  -> FastAPI /api/generate-game
  -> safety sanitisation
  -> Gemini structured JSON GameSpec
  -> Pydantic validation and sanitisation
  -> React receives GameSpec
  -> KAPLAY fixed template engine
  -> playable retro microgame

If Gemini is missing, unavailable, or invalid:
User prompt
  -> local fallback generator
  -> valid GameSpec
  -> same KAPLAY template engine
```

## Tech stack

- Frontend: React, Vite, TypeScript
- Game engine: KAPLAY.js
- Sound: jsfxr procedural retro effects
- Backend: FastAPI, Pydantic
- AI: Gemini API structured JSON only
- Database: none for MVP

## Project structure

```text
promptcade/
  backend/
    app/
      main.py
      models.py
      gemini_service.py
      fallback_generator.py
      safety.py
    tests/
    requirements.txt
    .env.example
  frontend/
    src/
      components/
      services/
      game/
        engine.ts
        types.ts
        palettes.ts
        sounds.ts
        templates/
```

## Local setup

### Backend

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload
```

On macOS or Linux, activate the environment with:

```bash
source .venv/bin/activate
```

`GEMINI_API_KEY` is optional for local development. Leave it blank to exercise the deterministic fallback path.

### Frontend

```bash
cd frontend
npm install
copy .env.example .env.local
npm run dev
```

Open `http://localhost:5173`.

On Windows, if `npm` is unavailable from PowerShell or from an agent shell, run the same commands with `npm.cmd`, for example `npm.cmd install`, `npm.cmd run dev`, and `npm.cmd run build`.

## Environment variables

Backend:

```text
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
FRONTEND_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174
ALLOW_ALL_ORIGINS=true
```

Set `GEMINI_API_KEY` only when you want Gemini-generated `GameSpec` ideas. With the key blank, expired, or unavailable, Promptcade still produces playable games through fallback generation.

`ALLOW_ALL_ORIGINS=true` is convenient for local MVP testing because Vite may move to another local port if `5173` is already busy. For production, set it to `false` and configure `FRONTEND_ORIGINS` to your deployed frontend URL.

Frontend:

```text
VITE_API_BASE_URL=http://localhost:8000
```

## How Gemini is used

Gemini receives a cleaned user prompt plus strict instructions to return only a `GameSpec` JSON object:

```json
{
  "title": "Boiler Panic",
  "template": "dodger",
  "hero": "cold tenant",
  "enemy": "flying landlord excuses",
  "collectible": "repair receipt",
  "obstacle": "ice bill",
  "goal": "survive until the engineer arrives",
  "tone": "absurd retro comedy",
  "palette": "neon-night",
  "difficulty": "medium",
  "intro": "Collect receipts before the excuses freeze you out."
}
```

Allowed templates are `dodger`, `collector`, `runner`, `shooter`, and `boss_fight`.

## Fallback behavior

Promptcade works without Gemini. If `GEMINI_API_KEY` is missing, expired, or Gemini returns bad JSON, the backend uses a deterministic fallback generator. If the backend is unreachable, the frontend has its own emergency fallback generator.

Fallback generation extracts keywords, chooses a template, creates safe silly labels, picks a palette, and returns a valid `GameSpec`.

## Current templates

- Dodger: move around, avoid hazards, collect bonuses, survive the timer.
- Collector: grab themed objects, avoid enemies, beat the score target.
- Runner: auto-scrolling jump/dodge survival.
- Shooter: move, fire projectiles, survive or hit the score target.
- Boss Fight: dodge attacks, shoot the boss, drain the health bar.

## Safety and copyright guardrails

- Famous characters and brands are transformed into generic parody-like alternatives.
- Explicit sexual content, graphic violence, hateful content, and unsafe prompts are softened.
- The app uses simple generated shapes, not copied game art.
- Raw JSON or raw AI errors are not shown to players.

## Tests and checks

```bash
cd backend
pytest

cd ../frontend
npm run build
```

## Deployment notes

Frontend can deploy to Vercel or Netlify:

- Build command: `npm run build`
- Publish directory: `frontend/dist`
- Root directory: `frontend`
- Environment: `VITE_API_BASE_URL=https://your-backend.example.com`

Backend can deploy to Render, Railway, or Fly.io:

- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Root directory: `backend`
- Environment: `GEMINI_API_KEY`, `GEMINI_MODEL`, `FRONTEND_ORIGINS`

## Known limitations

- There is no database or persistence yet; generated games are session-local.
- Share links, prompt history, analytics, and rate limiting are not implemented.
- Game visuals use procedural shapes and palettes rather than custom sprite assets.
- Gemini is used only for structured `GameSpec` generation, so gameplay variety is bounded by the fixed templates.
- Public deployment should add production CORS origins, request logging, rate limiting, and secret management before launch.

## GitHub publishing

If you have GitHub CLI authenticated:

```bash
git init
git add .
git commit -m "Initial Promptcade MVP"
gh repo create promptcade --public --source=. --remote=origin --push
```

Without GitHub CLI:

```bash
git init
git add .
git commit -m "Initial Promptcade MVP"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/promptcade.git
git push -u origin main
```

## Next milestones

- Add browser playtest automation with screenshots for each template.
- Add compressed share links that store prompt plus spec version.
- Add per-template tuning data to make each difficulty feel sharper.
- Add tiny generated pixel sprites while keeping the no-copyright-art rule.
- Add backend rate limiting and request logging before public launch.
- Add analytics for template win/loss and remix clicks.
