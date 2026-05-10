import hashlib
import random
import re
from typing import Any

from app.models import GameSpec
from app.safety import sanitize_prompt, sanitize_spec


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
    "playing",
    "against",
}

PATTERNS: list[tuple[str, set[str]]] = [
    ("sports", {"sport", "sports", "team", "ball", "bat", "cricket", "tennis", "football", "goal", "runs"}),
    ("space", {"space", "planet", "earth", "black", "hole", "gravity", "moon", "galaxy", "orbit", "asteroid"}),
    ("repair", {"repair", "landlord", "rent", "boiler", "leak", "broken", "tenant", "heating", "pipes"}),
    ("academic", {"school", "uni", "university", "dissertation", "essay", "exam", "citation", "deadline", "homework"}),
    ("food", {"food", "cooking", "cook", "biryani", "pizza", "cheese", "apple", "pineapple", "strawberry", "chicken"}),
    ("weather", {"weather", "rain", "storm", "wind", "picnic", "cloud", "umbrella", "puddle"}),
    ("romance", {"love", "heart", "lonely", "sad", "romance", "crush", "date"}),
    ("abstract", {"geometry", "shape", "dancing", "rhythm", "cemetery", "ghost", "grave", "abstract"}),
]


def generate_fallback_spec(prompt: str, mode: str = "normal") -> GameSpec:
    clean_prompt, _warnings = sanitize_prompt(prompt)
    rng = random.Random(_stable_seed(clean_prompt, mode))
    words = _keywords(clean_prompt)
    pattern = _detect_pattern(clean_prompt, words)

    builders = {
        "sports": _sports_spec,
        "space": _space_spec,
        "repair": _repair_spec,
        "academic": _academic_spec,
        "food": _food_spec,
        "weather": _weather_spec,
        "romance": _romance_spec,
        "abstract": _abstract_spec,
        "generic": _generic_spec,
    }
    data = builders.get(pattern, _generic_spec)(clean_prompt, words, rng)
    data["difficulty"] = _difficulty_for(mode, clean_prompt, rng)

    if mode == "weirder":
        data["tone"] = f"weird {data['tone']}"[:72]
        data["creativeBrief"]["vibe"] = f"weird {data['creativeBrief']['vibe']}"[:80]
        data["presentation"]["jokeEvents"].append(
            {"time": 34, "text": "A bonus rule arrives wearing a fake moustache.", "effect": "spawn_chaos"}
        )

    if mode == "harder":
        data["mechanics"]["targetCount"] = min(30, int(data["mechanics"]["targetCount"]) + 3)
        data["mechanics"]["specialRules"].append("hazards escalate faster")
    elif mode == "easier":
        data["mechanics"]["targetCount"] = max(3, int(data["mechanics"]["targetCount"]) - 2)
        data["mechanics"]["playerAbilities"].append("mercy shield")

    spec = GameSpec.model_validate(data)
    sanitized, _ = sanitize_spec(spec, mode=mode)
    return sanitized


def _sports_spec(prompt: str, words: list[str], rng: random.Random) -> dict[str, Any]:
    player_arch = "cat" if "cat" in words else "human"
    opponent_arch = "mouse" if any(word in words for word in ["mouse", "mice"]) else "human"
    player_name = "bat-swinging cat" if player_arch == "cat" else _phrase(words, "pocket striker")
    opponent_name = "mouse fielding team" if opponent_arch == "mouse" else "tiny rival team"
    return _base(
        title="Cat Cricket Mouse League" if player_arch == "cat" and opponent_arch == "mouse" else "Pocket Sports Riot",
        template="collector",
        hero=player_name,
        enemy=opponent_name,
        collectible="loose cricket runs",
        obstacle="sneaky fielders and wild balls",
        goal="score enough tiny runs before the fielding team turns the pitch into nonsense",
        tone="sports-chaos arcade farce",
        palette="toxic-lime",
        intro="Smack loose balls, grab runs, and dodge the tiny fielders.",
        creative={
            "vibe": "scrappy playground sports chaos",
            "playableMetaphor": "the prompt becomes a miniature match where every pickup is a possible run",
            "coreVerb": "score",
            "worldRule": "balls ricochet, fielders swarm, and runs appear in risky spaces",
            "escalation": "fielders get bolder after every few runs",
            "payoff": "win by turning nonsense cricket into a scoreboard miracle",
        },
        cast={
            "player": entity(player_name, "player", player_arch, "dash between wickets", "scores runs"),
            "opponents": [
                entity(opponent_name, "fielding opponent", opponent_arch, "chase the player", "steals momentum"),
                entity("wicket squeaker", "opponent", opponent_arch, "guards the run zone", "blocks deliveries"),
            ],
            "hazards": [
                entity("wild cricket ball", "hazard", "ball", "bounces sideways", "costs a life"),
                entity("cheese boundary trap", "hazard", "food", "sits on tempting lanes", "breaks combos"),
            ],
            "helpers": [
                entity("run token", "score pickup", "ball", "waits near danger", "adds a run"),
                entity("lucky cricket bat", "helper", "bat", "briefly clears mice", "combo boost"),
            ],
            "neutralChaos": [entity("yarn pitch marker", "chaos", "abstract_shape", "wiggles", "changes lanes")],
            "goalObject": entity("tiny scoreboard", "goal", "paper", "counts runs", "win target"),
        },
        mechanics={
            "objectiveType": "score_runs",
            "winCondition": "score the target number of runs",
            "loseCondition": "lose all lives to fielders and wild balls",
            "playerAbilities": ["dash", "bat swing"],
            "worldForces": ["ball ricochet", "fielder pressure"],
            "specialRules": ["run pickups near opponents are worth more"],
            "targetCount": 8,
            "progressMax": 100,
        },
        presentation={
            "visualMotifs": _merge(words, ["pitch lines", "scoreboard", "tiny crowd", "bouncing balls"], 8),
            "jokeEvents": [
                {"time": 7, "text": "The mouse captain appeals for emotional LBW.", "effect": "spawn_opponent"},
                {"time": 18, "text": "A ball politely refuses physics.", "effect": "spawn_hazard"},
                {"time": 29, "text": "The scoreboard adds one run out of pity.", "effect": "spawn_helper"},
            ],
            "microcopy": ["Score runs", "Avoid fielders", "Bat swing clears space"],
        },
    )


def _space_spec(prompt: str, words: list[str], rng: random.Random) -> dict[str, Any]:
    earth = "earth" in words or "planet" in words
    return _base(
        title="Earth Black Hole Orbit Panic" if earth else "Gravity Escape Panic",
        template="boss_fight",
        hero="Earth" if earth else "tiny runaway planet",
        enemy="hungry black hole",
        collectible="moon slingshot",
        obstacle="asteroid debris",
        goal="escape the pull and reach safe orbit",
        tone="cosmic slapstick survival",
        palette="deep-sea",
        intro="Fight gravity, grab slingshots, and escape the black hole.",
        creative={
            "vibe": "cosmic arcade panic",
            "playableMetaphor": "the prompt becomes a gravity tug-of-war",
            "coreVerb": "escape",
            "worldRule": "the black hole constantly pulls the player inward",
            "escalation": "debris starts orbiting closer and faster",
            "payoff": "win by reaching a safe orbit instead of defeating space",
        },
        cast={
            "player": entity("Earth", "player", "planet", "orbit boost", "survives pull"),
            "opponents": [entity("black hole", "gravity boss", "black_hole", "pulls everything inward", "instant danger zone")],
            "hazards": [
                entity("asteroid debris", "hazard", "asteroid", "orbits the black hole", "chips lives"),
                entity("gravity wave", "hazard", "abstract_shape", "sweeps across orbit", "pushes player inward"),
            ],
            "helpers": [
                entity("moon slingshot", "helper", "planet", "boosts away from pull", "adds escape progress"),
                entity("rocket crumb", "helper", "tool", "brief speed burst", "escape boost"),
            ],
            "neutralChaos": [entity("loose satellite", "chaos", "abstract_shape", "wanders", "bounces unpredictably")],
            "goalObject": entity("safe orbit ring", "escape zone", "abstract_shape", "glows at screen edge", "win zone"),
        },
        mechanics={
            "objectiveType": "escape_zone",
            "winCondition": "fill the escape meter by reaching safe orbit bursts",
            "loseCondition": "get pulled into the black hole or lose all lives",
            "playerAbilities": ["dash", "orbit boost"],
            "worldForces": ["gravity_pull", "orbital_debris"],
            "specialRules": ["distance from the black hole increases escape progress"],
            "targetCount": 5,
            "progressMax": 100,
        },
        presentation={
            "visualMotifs": _merge(words, ["orbit rings", "star flecks", "gravity waves", "debris"], 8),
            "jokeEvents": [
                {"time": 6, "text": "The black hole sends a calendar invite called Lunch.", "effect": "gravity_pulse"},
                {"time": 17, "text": "A moon offers questionable emotional support.", "effect": "spawn_helper"},
                {"time": 30, "text": "Physics has left a voicemail.", "effect": "spawn_hazard"},
            ],
            "microcopy": ["Escape orbit", "Gravity pulls", "Boost away"],
        },
    )


def _repair_spec(prompt: str, words: list[str], rng: random.Random) -> dict[str, Any]:
    return _base(
        title="Boiler Excuse Repair Dash",
        template="collector",
        hero="freezing tenant",
        enemy="landlord excuses",
        collectible="repair receipts",
        obstacle="cold bills and frozen pipes",
        goal="fill the repair meter before the flat becomes an ice cube",
        tone="absurd British frustration",
        palette="neon-night",
        intro="Collect tools and receipts, dodge excuses, and fix the boiler meter.",
        creative={
            "vibe": "cold flat paperwork comedy",
            "playableMetaphor": "ignored repairs become pickups fighting a repair meter",
            "coreVerb": "repair",
            "worldRule": "excuses chase the tenant while useful paperwork warms the meter",
            "escalation": "cold bills and frozen pipes crowd the room",
            "payoff": "win by making the boiler louder than the landlord excuses",
        },
        cast={
            "player": entity("freezing tenant", "player", "human", "slides on cold floor", "fills repair meter"),
            "opponents": [entity("landlord excuse", "opponent", "paper", "dodges then charges", "drains progress")],
            "hazards": [
                entity("cold bill", "hazard", "bill", "slides across the room", "costs a life"),
                entity("frozen pipe", "hazard", "machine", "leaks cold patches", "slows movement"),
            ],
            "helpers": [
                entity("repair receipt", "helper", "paper", "fills meter", "repair progress"),
                entity("tiny wrench", "helper", "tool", "briefly scares excuses", "repair boost"),
            ],
            "neutralChaos": [entity("cold breath cloud", "chaos", "weather", "drifts", "hides pickups")],
            "goalObject": entity("broken boiler", "goal", "machine", "waits to be repaired", "progress meter"),
        },
        mechanics={
            "objectiveType": "repair_meter",
            "winCondition": "fill the repair meter",
            "loseCondition": "lose all lives to cold bills and excuses",
            "playerAbilities": ["dash", "receipt magnet"],
            "worldForces": ["slippery_floor", "excuse_waves"],
            "specialRules": ["tools are worth extra near the boiler"],
            "targetCount": 6,
            "progressMax": 100,
        },
        presentation={
            "visualMotifs": _merge(words, ["ice", "rent notices", "repair tools", "cold breath"], 8),
            "jokeEvents": [
                {"time": 6, "text": "Landlord says: I'll check tomorrow.", "effect": "spawn_opponent"},
                {"time": 16, "text": "The boiler coughs like it knows your deposit.", "effect": "screen_shake"},
                {"time": 28, "text": "An engineer appointment appears under three excuses.", "effect": "spawn_helper"},
            ],
            "microcopy": ["Fill repair meter", "Avoid excuses", "Tools help near boiler"],
        },
    )


def _academic_spec(prompt: str, words: list[str], rng: random.Random) -> dict[str, Any]:
    return _base(
        title="Dissertation Boss Citation Panic",
        template="boss_fight",
        hero="overcaffeinated student",
        enemy="angry dissertation stack",
        collectible="citations and coffee",
        obstacle="deadline walls",
        goal="defeat the paper boss by firing enough citations into it",
        tone="academic panic comedy",
        palette="candy-crisis",
        intro="Shoot citations, grab coffee, and survive the dissertation's feedback attacks.",
        creative={
            "vibe": "library panic with arcade paper cuts",
            "playableMetaphor": "the dissertation becomes a boss made of hostile pages",
            "coreVerb": "cite",
            "worldRule": "citations damage the paper threat while deadlines fall like bricks",
            "escalation": "feedback ghosts appear as the boss loses pages",
            "payoff": "win by turning academic dread into a finished chapter",
        },
        cast={
            "player": entity("student", "player", "human", "shoots citations", "finishes work"),
            "opponents": [entity("dissertation stack", "paper boss", "paper", "spits feedback", "boss health")],
            "hazards": [
                entity("deadline wall", "hazard", "paper", "falls downward", "costs a life"),
                entity("feedback ghost", "hazard", "ghost", "wanders sideways", "confuses movement"),
            ],
            "helpers": [
                entity("citation", "ammo helper", "paper", "boosts shots", "damages boss"),
                entity("coffee", "helper", "food", "speeds player briefly", "focus boost"),
            ],
            "neutralChaos": [entity("missing file", "chaos", "paper", "teleports", "blocks lanes")],
            "goalObject": entity("finished chapter", "goal", "paper", "glows after victory", "payoff"),
        },
        mechanics={
            "objectiveType": "defeat_boss",
            "winCondition": "reduce the dissertation boss to zero pages",
            "loseCondition": "lose all lives to feedback and deadline attacks",
            "playerAbilities": ["citation shot", "coffee dash"],
            "worldForces": ["deadline_rain", "feedback_waves"],
            "specialRules": ["coffee makes the next shot stronger"],
            "targetCount": 10,
            "progressMax": 100,
        },
        presentation={
            "visualMotifs": _merge(words, ["paper stacks", "red pen marks", "coffee rings", "library static"], 8),
            "jokeEvents": [
                {"time": 7, "text": "Supervisor note: nearly there, just rewrite everything.", "effect": "spawn_hazard"},
                {"time": 19, "text": "A citation briefly believes in you.", "effect": "spawn_helper"},
                {"time": 31, "text": "The appendix starts flapping.", "effect": "boss_phase"},
            ],
            "microcopy": ["Shoot citations", "Grab coffee", "Defeat paper boss"],
        },
    )


def _food_spec(prompt: str, words: list[str], rng: random.Random) -> dict[str, Any]:
    fruit_words = [word for word in words if word in {"apple", "pineapple", "strawberry", "banana", "fruit"}]
    combo = len(fruit_words) >= 2 or "pen" in words
    return _base(
        title="Snack Combo Cabinet" if combo else "Kitchen Orbit Crisis",
        template="collector",
        hero=_phrase(words, "hungry space chef"),
        enemy="angry ovens",
        collectible="ingredient combo pieces",
        obstacle="burnt pans",
        goal="complete the food combo before the kitchen declares independence",
        tone="hungry arcade farce",
        palette="sunset-byte",
        intro="Collect ingredients in the right spirit and dodge kitchen disasters.",
        creative={
            "vibe": "kitchen nonsense with snack logic",
            "playableMetaphor": "food words become a combo recipe played as pickups",
            "coreVerb": "combine",
            "worldRule": "ingredients score more when collected as a silly set",
            "escalation": "burnt pans and angry ovens crowd the recipe",
            "payoff": "win by assembling the prompt into edible nonsense",
        },
        cast={
            "player": entity(_phrase(words, "snack hero"), "player", _guess_archetype(words[0]) if words else "human", "collects ingredients", "builds combo"),
            "opponents": [entity("angry oven", "opponent", "machine", "zigzags", "burns combo")],
            "hazards": [
                entity("burnt pan", "hazard", "food", "slides", "costs a life"),
                entity("flying onion", "hazard", "food", "drifts", "breaks chain"),
            ],
            "helpers": [
                entity(fruit_words[0] if fruit_words else "ingredient", "combo helper", "fruit", "collectable", "combo progress"),
                entity("sparkly plate", "helper", "food", "delivery target", "bonus progress"),
            ],
            "neutralChaos": [entity("sauce splat", "chaos", "abstract_shape", "pulses", "changes pickup value")],
            "goalObject": entity("recipe card", "goal", "paper", "tracks combo", "win target"),
        },
        mechanics={
            "objectiveType": "combo_chain" if combo else "collect_set",
            "winCondition": "complete the prompt combo set",
            "loseCondition": "lose all lives or break too many chains",
            "playerAbilities": ["dash", "magnet"],
            "worldForces": ["combo_order", "kitchen_bounce"],
            "specialRules": ["matching prompt objects increase combo progress"],
            "targetCount": 7,
            "progressMax": 100,
        },
        presentation={
            "visualMotifs": _merge(words, ["steam", "plates", "sauce splats", "recipe card"], 8),
            "jokeEvents": [
                {"time": 8, "text": "The recipe insists this was always a sport.", "effect": "spawn_helper"},
                {"time": 18, "text": "A pan has achieved villain status.", "effect": "spawn_hazard"},
                {"time": 30, "text": "The combo almost makes sense. Dangerous.", "effect": "combo_bonus"},
            ],
            "microcopy": ["Build combo", "Avoid burnt pans", "Grab matching food"],
        },
    )


def _weather_spec(prompt: str, words: list[str], rng: random.Random) -> dict[str, Any]:
    return _base(
        title="Picnic Weather Betrayal",
        template="collector",
        hero="optimistic picnic carrier",
        enemy="sideways rain",
        collectible="dry sandwiches",
        obstacle="puddles and umbrella flips",
        goal="deliver dry picnic items to the blanket",
        tone="British weather slapstick",
        palette="deep-sea",
        intro="Collect dry food, dodge sideways weather, and deliver it to the blanket.",
        creative={
            "vibe": "weather betrayal comedy",
            "playableMetaphor": "bad weather becomes a delivery obstacle course",
            "coreVerb": "deliver",
            "worldRule": "wind pushes everything sideways",
            "escalation": "puddles and rain lanes multiply",
            "payoff": "win by keeping one sandwich emotionally dry",
        },
        cast={
            "player": entity("picnic carrier", "player", "human", "fights wind", "delivers food"),
            "opponents": [entity("sideways rain", "opponent", "weather", "rushes across", "soaks progress")],
            "hazards": [entity("puddle trap", "hazard", "weather", "sticks to lanes", "slows player")],
            "helpers": [entity("dry sandwich", "helper", "food", "pickup", "delivery progress")],
            "neutralChaos": [entity("inside-out umbrella", "chaos", "weather", "spins", "deflects movement")],
            "goalObject": entity("picnic blanket", "delivery goal", "abstract_shape", "waits at edge", "receives items"),
        },
        mechanics={
            "objectiveType": "deliver_items",
            "winCondition": "deliver enough dry picnic items",
            "loseCondition": "lose all lives to weather",
            "playerAbilities": ["dash", "umbrella shove"],
            "worldForces": ["wind_push", "rain_lanes"],
            "specialRules": ["wind pushes the player sideways"],
            "targetCount": 5,
            "progressMax": 100,
        },
        presentation={
            "visualMotifs": _merge(words, ["raindrops", "grey clouds", "flapping blanket"], 8),
            "jokeEvents": [
                {"time": 7, "text": "Weather app says light drizzle. It lied.", "effect": "wind_push"},
                {"time": 18, "text": "A heroic umbrella turns inside out.", "effect": "spawn_hazard"},
                {"time": 30, "text": "One sandwich remains emotionally dry.", "effect": "spawn_helper"},
            ],
            "microcopy": ["Deliver food", "Fight wind", "Avoid puddles"],
        },
    )


def _romance_spec(prompt: str, words: list[str], rng: random.Random) -> dict[str, Any]:
    machine = "machine" in words or "washing" in words
    return _base(
        title="Lonely Machine Heart Quest" if machine else "Tiny Heart Delivery",
        template="collector",
        hero="sad washing machine" if machine else _phrase(words, "lonely arcade object"),
        enemy="awkward silence",
        collectible="tiny hearts",
        obstacle="rejection bubbles",
        goal="deliver enough hearts to stop the appliance from sighing",
        tone="melodramatic appliance comedy",
        palette="candy-crisis",
        intro="Collect hearts, dodge awkward silence, and deliver affection safely.",
        creative={
            "vibe": "silly object romance",
            "playableMetaphor": "loneliness becomes a delivery loop with fragile hearts",
            "coreVerb": "deliver",
            "worldRule": "hearts drift away unless gathered and brought home",
            "escalation": "awkward silence gets louder near success",
            "payoff": "win by giving the sad object a tiny arcade meet-cute",
        },
        cast={
            "player": entity("sad washing machine" if machine else "lonely object", "player", "machine" if machine else "heart", "carries hearts", "delivery progress"),
            "opponents": [entity("awkward silence", "opponent", "ghost", "floats closer", "steals hearts")],
            "hazards": [entity("rejection bubble", "hazard", "abstract_shape", "bounces", "costs a life")],
            "helpers": [entity("tiny heart", "helper", "heart", "collectable", "delivery item")],
            "neutralChaos": [entity("mixed signal", "chaos", "paper", "wanders", "changes routes")],
            "goalObject": entity("laundry love letter", "goal", "paper", "receives hearts", "win target"),
        },
        mechanics={
            "objectiveType": "deliver_items",
            "winCondition": "deliver enough hearts",
            "loseCondition": "lose all lives to rejection bubbles",
            "playerAbilities": ["dash", "heart magnet"],
            "worldForces": ["heart_drift", "awkward_orbit"],
            "specialRules": ["carrying hearts makes opponents chase harder"],
            "targetCount": 5,
            "progressMax": 100,
        },
        presentation={
            "visualMotifs": _merge(words, ["soap bubbles", "tiny hearts", "love letter"], 8),
            "jokeEvents": [
                {"time": 8, "text": "The spin cycle asks if this is a date.", "effect": "spawn_helper"},
                {"time": 20, "text": "Awkward silence enters the room sideways.", "effect": "spawn_opponent"},
                {"time": 31, "text": "A sock gives surprisingly good advice.", "effect": "spawn_helper"},
            ],
            "microcopy": ["Deliver hearts", "Avoid awkward silence", "Dash when carrying love"],
        },
    )


def _abstract_spec(prompt: str, words: list[str], rng: random.Random) -> dict[str, Any]:
    has_fruit = any(word in words for word in ["strawberry", "apple", "pineapple"])
    return _base(
        title="Dancing Geometry Cemetery" if "cemetery" in words else "Pattern Nonsense Ritual",
        template="collector",
        hero="dancing strawberry" if has_fruit else _phrase(words, "tiny rhythm shape"),
        enemy="geometry ghosts",
        collectible="pattern beats",
        obstacle="wrong-angle graves",
        goal="complete the pattern before the shapes forget the dance",
        tone="spooky abstract rhythm comedy",
        palette="neon-night",
        intro="Collect pattern beats in order while ghost shapes crash the dance.",
        creative={
            "vibe": "spooky rhythm geometry",
            "playableMetaphor": "abstract words become a sequence of shapes to collect",
            "coreVerb": "pattern",
            "worldRule": "shapes only count when collected in the cabinet's silly order",
            "escalation": "ghosts rotate faster as the sequence grows",
            "payoff": "win by making nonsense choreography readable",
        },
        cast={
            "player": entity("dancing strawberry" if has_fruit else "rhythm shape", "player", "fruit" if has_fruit else "abstract_shape", "moves between beats", "sequence progress"),
            "opponents": [entity("geometry ghost", "opponent", "ghost", "orbits pattern beats", "breaks sequence")],
            "hazards": [entity("wrong-angle grave", "hazard", "abstract_shape", "slides", "resets combo")],
            "helpers": [
                entity("triangle beat", "pattern helper", "abstract_shape", "sequence pickup", "pattern progress"),
                entity("moonlit berry", "helper", "fruit", "bonus pickup", "extra progress"),
            ],
            "neutralChaos": [entity("dancing square", "chaos", "abstract_shape", "rotates", "changes order")],
            "goalObject": entity("pattern altar", "goal", "abstract_shape", "tracks sequence", "win target"),
        },
        mechanics={
            "objectiveType": "complete_pattern",
            "winCondition": "complete the shape sequence",
            "loseCondition": "lose all lives or break too many patterns",
            "playerAbilities": ["dash", "rhythm pulse"],
            "worldForces": ["orbiting_shapes", "combo_order"],
            "specialRules": ["matching the visible pattern gives bonus progress"],
            "targetCount": 6,
            "progressMax": 100,
        },
        presentation={
            "visualMotifs": _merge(words, ["grave shapes", "dance floor", "moon grid"], 8),
            "jokeEvents": [
                {"time": 6, "text": "A square refuses to clap on beat.", "effect": "pattern_shuffle"},
                {"time": 17, "text": "The cemetery briefly becomes a dance instructor.", "effect": "spawn_opponent"},
                {"time": 29, "text": "The strawberry nails a mathematically spooky twirl.", "effect": "spawn_helper"},
            ],
            "microcopy": ["Complete pattern", "Avoid wrong angles", "Keep the combo"],
        },
    )


def _generic_spec(prompt: str, words: list[str], rng: random.Random) -> dict[str, Any]:
    primary = words[0] if words else "nonsense"
    secondary = words[1] if len(words) > 1 else "button"
    prompt_entities = _merge(words, ["receipt", "panic token", "tiny alarm"], 6)
    return _base(
        title=_title_case(f"{primary} Combo Cabinet"),
        template="collector",
        hero=f"tiny {primary}",
        enemy=f"dramatic {secondary} swarm",
        collectible=f"{primary} combo piece",
        obstacle=f"{secondary} problem",
        goal=f"assemble the {primary} combo before the cabinet changes its mind",
        tone="absurd retro comedy",
        palette=rng.choice(PALETTES),
        intro=f"Collect the right {primary} pieces, dodge {secondary} trouble, and finish the combo.",
        creative={
            "vibe": "nonsense made physical",
            "playableMetaphor": "the prompt becomes an object-combination toy",
            "coreVerb": "combine",
            "worldRule": "prompt objects become pickups, threats, and combo rules",
            "escalation": "wrong objects appear more often as the combo grows",
            "payoff": "win by making the random thought briefly coherent",
        },
        cast={
            "player": entity(f"tiny {primary}", "player", _guess_archetype(primary), "collects matching objects", "combo progress"),
            "opponents": [entity(f"{secondary} swarm", "opponent", _guess_archetype(secondary), "chases combo pieces", "breaks chain")],
            "hazards": [entity(f"wrong {secondary}", "hazard", "abstract_shape", "drifts", "breaks combo")],
            "helpers": [entity(word, "combo helper", _guess_archetype(word), "collectable", "combo progress") for word in prompt_entities[:4]],
            "neutralChaos": [entity("tiny alarm", "chaos", "abstract_shape", "pulses", "shuffles pickups")],
            "goalObject": entity("combo meter", "goal", "paper", "tracks chain", "win target"),
        },
        mechanics={
            "objectiveType": "combo_chain",
            "winCondition": "complete the prompt combo chain",
            "loseCondition": "lose all lives or break the chain too often",
            "playerAbilities": ["dash", "combo magnet"],
            "worldForces": ["combo_order", "decoy_pickups"],
            "specialRules": ["prompt words score more than generic pickups"],
            "targetCount": 6,
            "progressMax": 100,
        },
        presentation={
            "visualMotifs": _merge(words, ["combo meter", "neon crumbs", "arcade static"], 8),
            "jokeEvents": [
                {"time": 7, "text": f"The {secondary} problem files a tiny complaint.", "effect": "spawn_opponent"},
                {"time": 19, "text": f"{primary.capitalize()} briefly becomes everyone's responsibility.", "effect": "spawn_hazard"},
                {"time": 31, "text": "The combo almost explains itself. Stop it.", "effect": "combo_bonus"},
            ],
            "microcopy": ["Build combo", "Avoid decoys", "Prompt words matter"],
        },
    )


def _base(
    *,
    title: str,
    template: str,
    hero: str,
    enemy: str,
    collectible: str,
    obstacle: str,
    goal: str,
    tone: str,
    palette: str,
    intro: str,
    creative: dict[str, Any],
    cast: dict[str, Any],
    mechanics: dict[str, Any],
    presentation: dict[str, Any],
) -> dict[str, Any]:
    return {
        "title": title,
        "template": template,
        "hero": hero,
        "enemy": enemy,
        "collectible": collectible,
        "obstacle": obstacle,
        "goal": goal,
        "tone": tone,
        "palette": palette,
        "difficulty": "medium",
        "intro": intro,
        "creativeBrief": creative,
        "cast": cast,
        "mechanics": mechanics,
        "presentation": presentation,
    }


def entity(
    name: str,
    role: str,
    visual_archetype: str,
    behavior: str | None = None,
    effect: str | None = None,
    icon: str | None = None,
) -> dict[str, Any]:
    return {
        "name": name,
        "role": role,
        "visualArchetype": visual_archetype,
        "behavior": behavior,
        "effect": effect,
        "icon": icon,
    }


def _detect_pattern(prompt: str, words: list[str]) -> str:
    lower = prompt.lower()
    word_set = set(words)
    best = ("generic", 0)
    for name, keys in PATTERNS:
        score = len(word_set & keys) + sum(1 for key in keys if key in lower)
        if name == "space" and "black hole" in lower:
            score += 3
        if score > best[1]:
            best = (name, score)
    return best[0] if best[1] > 0 else "generic"


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
    return deduped[:10]


def _difficulty_for(mode: str, prompt: str, rng: random.Random) -> str:
    if mode == "harder":
        return "hard"
    if mode == "easier":
        return "easy"
    if any(word in prompt.lower() for word in ["attacking", "panic", "chaos", "ruined", "black hole"]):
        return "hard"
    return rng.choice(["easy", "medium", "medium", "hard"])


def _guess_archetype(word: str) -> str:
    if word in {"cat", "kitten"}:
        return "cat"
    if word in {"mouse", "mice"}:
        return "mouse"
    if word in {"earth", "planet", "moon"}:
        return "planet"
    if word in {"black", "hole"}:
        return "black_hole"
    if word in {"ball", "cricket", "football", "tennis"}:
        return "ball"
    if word in {"paper", "essay", "dissertation", "citation", "deadline"}:
        return "paper"
    if word in {"bill", "rent", "invoice"}:
        return "bill"
    if word in {"ghost", "cemetery", "grave"}:
        return "ghost"
    if word in {"apple", "pineapple", "strawberry", "fruit"}:
        return "fruit"
    if word in {"boiler", "machine", "washing"}:
        return "machine"
    if word in {"asteroid", "rock"}:
        return "asteroid"
    if word in {"tool", "wrench", "pen"}:
        return "tool"
    if word in {"love", "heart"}:
        return "heart"
    if word in {"food", "biryani", "chicken", "pizza", "cheese"}:
        return "food"
    if word in {"rain", "weather", "storm", "wind", "cloud"}:
        return "weather"
    if word in {"shape", "geometry", "triangle", "square"}:
        return "abstract_shape"
    return "abstract_shape"


def _merge(primary: list[str], secondary: list[str], limit: int) -> list[str]:
    merged: list[str] = []
    for term in primary + secondary:
        clean = str(term).strip()
        if clean and clean not in merged:
            merged.append(clean)
    return merged[:limit]


def _phrase(words: list[str], fallback: str) -> str:
    return " ".join(words[:2]) if words else fallback


def _title_case(value: str) -> str:
    return " ".join(part.capitalize() for part in value.split())[:64]
