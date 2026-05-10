import type {
  CastSpec,
  CreativeBrief,
  Difficulty,
  EntitySpec,
  GameSpec,
  GameTemplate,
  GenerationMode,
  JokeEvent,
  MechanicsSpec,
  ObjectiveType,
  PresentationSpec,
  VisualArchetype,
} from "../game/types";
import { DIFFICULTY_VALUES, OBJECTIVE_VALUES, TEMPLATE_VALUES, VISUAL_ARCHETYPE_VALUES } from "../game/types";

const STOPWORDS = new Set([
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
  "against",
  "playing",
]);

const IP_REPLACEMENTS: Record<string, string> = {
  mario: "tiny plumber-like jumper",
  "darth vader": "dramatic space helmet villain",
  "star wars": "overdramatic space opera",
  "harry potter": "bespectacled wand-school kid",
  pokemon: "pocket critter league",
  pikachu: "spark mouse mascot",
  zelda: "legendary puzzle princess",
  sonic: "speedy blue-ish blur",
  batman: "brooding cave detective",
  marvel: "cape committee",
  disney: "storybook megacorp castle",
  fortnite: "dance-battle island",
  minecraft: "blocky craft world",
};

interface ThemeProfile {
  key: string;
  match: RegExp;
  titleNoun: string;
  vibe: string;
  template: GameTemplate;
  objectiveType: ObjectiveType;
  player: EntitySpec;
  opponents: EntitySpec[];
  hazards: EntitySpec[];
  helpers: EntitySpec[];
  neutralChaos: EntitySpec[];
  goalObject?: EntitySpec;
  coreVerb: string;
  worldRule: string;
  escalation: string;
  payoff: string;
  winCondition: string;
  loseCondition: string;
  playerAbilities: string[];
  worldForces: string[];
  specialRules: string[];
  visualMotifs: string[];
  microcopy: string[];
  targetCount?: number;
  progressMax?: number;
}

const palettes = ["neon-night", "candy-crisis", "toxic-lime", "sunset-byte", "deep-sea"];
const fallbackNouns = ["receipt", "sandwich", "deadline", "sock", "boiler", "coffee", "elevator", "mood"];
const titleBits = ["Panic", "Dash", "Blaster", "Fiasco", "Emergency", "Rumble", "Meltdown", "Arcade", "Trouble"];

const THEMES: ThemeProfile[] = [
  {
    key: "sports-chaos",
    match: /(cat|mouse|mice|cricket|football|tennis|sport|match|team|ball|bat)/i,
    titleNoun: "Cricket",
    vibe: "cute sports chaos",
    template: "collector",
    objectiveType: "score_runs",
    player: entity("cat batter", "player character", "cat", "times shots and protects the stumps", "🐱"),
    opponents: [
      entity("mouse bowler", "main pressure", "mouse", "throws weird balls", "🐭"),
      entity("mouse fielders", "swarm pressure", "mouse", "rush to steal hit balls", "🐁"),
      entity("mouse wicketkeeper", "secondary pressure", "mouse", "steals stumps after mistakes", "🧢"),
    ],
    hazards: [
      entity("cheese trap", "pitch hazard", "food", "slows the player", "🧀"),
      entity("yarn tangle", "movement hazard", "custom", "snags the bat", "🧶"),
      entity("fake cricket ball", "trick hazard", "ball", "punishes bad timing", "●"),
    ],
    helpers: [entity("milk boost", "temporary support", "food", "widens the bat swing", "🥛")],
    neutralChaos: [entity("crowd squeak", "nonsense event", "mouse", "distracts both teams", "!" )],
    goalObject: entity("scoreboard", "objective target", "paper", "tracks runs", "▤"),
    coreVerb: "bat",
    worldRule: "Every good hit makes the mouse team cheat harder.",
    escalation: "More fielders, cheese traps, and fake balls enter after each scoring burst.",
    payoff: "The final shot scatters the mouse team into the scoreboard.",
    winCondition: "Score enough runs before the mice wreck the innings.",
    loseCondition: "Lose all wickets to mouse tricks.",
    playerAbilities: ["bat_swing", "dash", "power_shot"],
    worldForces: ["unfair fielding", "trick bowling", "pitch sabotage"],
    specialRules: ["Boundaries spawn new mouse tactics.", "Milk boosts the next swing."],
    visualMotifs: ["green pitch", "tiny mice", "cheese traps", "scoreboard"],
    microcopy: ["Squeak appeal!", "The ball is cheese now.", "Cat refuses singles."],
    targetCount: 12,
    progressMax: 30,
  },
  {
    key: "gravity-escape",
    match: /(earth|planet|black hole|galaxy|space|moon|orbit|star|cosmic|asteroid)/i,
    titleNoun: "Orbit",
    vibe: "cosmic panic",
    template: "boss_fight",
    objectiveType: "escape_zone",
    player: entity("tiny planet", "player character", "planet", "fights gravity and collects boosts", "🌍"),
    opponents: [entity("black hole", "main world force", "black_hole", "pulls everything inward", "●")],
    hazards: [
      entity("asteroid debris", "orbiting hazard", "asteroid", "circles the gravity well", "◆"),
      entity("gravity wave", "pulse hazard", "abstract_shape", "pushes the player off course", "≈"),
      entity("dead star", "fake pickup", "asteroid", "looks useful but drags harder", "✦"),
    ],
    helpers: [entity("moon slingshot", "temporary support", "planet", "boosts escape speed", "☾")],
    neutralChaos: [entity("warped star", "background chaos", "abstract_shape", "bends nearby movement", "✶")],
    goalObject: entity("safe orbit", "objective target", "abstract_shape", "escape destination", "◎"),
    coreVerb: "escape",
    worldRule: "Everything is constantly pulled toward the black hole.",
    escalation: "The pull strengthens when the planet collects energy.",
    payoff: "The planet slingshots into safe orbit with a tiny victory wobble.",
    winCondition: "Reach safe orbit before gravity consumes the planet.",
    loseCondition: "Fall into the black hole.",
    playerAbilities: ["boost", "orbit_dash", "shield"],
    worldForces: ["gravity_pull", "orbiting_debris", "pull_pulses"],
    specialRules: ["Boosts briefly weaken gravity.", "Asteroids orbit the main threat."],
    visualMotifs: ["stars", "gravity rings", "orbit paths", "space debris"],
    microcopy: ["Gravity whispers: closer.", "A moon offers questionable help.", "Orbit restored."],
    targetCount: 5,
    progressMax: 100,
  },
  {
    key: "repair-chaos",
    match: /(landlord|rent|boiler|repair|leak|tenant|flat|pipe|cold|broken)/i,
    titleNoun: "Repair",
    vibe: "domestic frustration comedy",
    template: "collector",
    objectiveType: "repair_meter",
    player: entity("tenant", "player character", "human", "collects proof and repairs the target", "🙂"),
    opponents: [
      entity("landlord excuses", "main pressure", "paper", "floods the room with delays", "✉"),
      entity("cold bill", "secondary pressure", "bill", "charges across the floor", "£"),
    ],
    hazards: [
      entity("frozen pipe", "movement hazard", "tool", "slides across the room", "▭"),
      entity("damp patch", "floor hazard", "weather", "spreads slowly", "≈"),
    ],
    helpers: [
      entity("repair receipt", "progress pickup", "paper", "fills the repair meter", "▤"),
      entity("wrench", "power pickup", "tool", "boosts repair progress", "🔧"),
    ],
    neutralChaos: [entity("boiler cough", "joke event", "machine", "shakes the room", "▣")],
    goalObject: entity("broken boiler", "objective target", "machine", "must be repaired", "▣"),
    coreVerb: "repair",
    worldRule: "Every excuse makes the flat colder and the floor more slippery.",
    escalation: "Bills, frozen pipes, and excuse waves arrive as the repair meter fills.",
    payoff: "The boiler finally wakes up and the excuses melt.",
    winCondition: "Fill the repair meter.",
    loseCondition: "Lose all warmth to excuse waves.",
    playerAbilities: ["dash", "proof_shield"],
    worldForces: ["slippery_floor", "excuse_waves", "cold_pressure"],
    specialRules: ["Receipts repair the boiler.", "Excuses briefly freeze movement."],
    visualMotifs: ["cold room", "paper excuses", "pipes", "boiler"],
    microcopy: ["I'll check tomorrow.", "The boiler coughs dramatically.", "Receipt acquired."],
    targetCount: 10,
    progressMax: 100,
  },
  {
    key: "academic-attack",
    match: /(dissertation|essay|exam|university|school|citation|deadline|reference|homework)/i,
    titleNoun: "Deadline",
    vibe: "academic monster panic",
    template: "boss_fight",
    objectiveType: "defeat_boss",
    player: entity("student", "player character", "human", "throws citations and dodges feedback", "🙂"),
    opponents: [entity("angry dissertation", "main boss", "paper", "spits references and deadlines", "▤")],
    hazards: [
      entity("deadline ghost", "chasing hazard", "ghost", "rushes at the player", "👻"),
      entity("missing file", "fake pickup", "paper", "steals progress", "?")
    ],
    helpers: [entity("coffee", "focus pickup", "food", "speeds attacks", "☕")],
    neutralChaos: [entity("Reviewer 2", "nonsense pressure", "ghost", "adds surprise comments", "!!")],
    goalObject: entity("final draft", "objective target", "paper", "must survive", "▤"),
    coreVerb: "finish",
    worldRule: "Every citation hit makes the dissertation split into stranger feedback.",
    escalation: "Feedback ghosts multiply as the boss weakens.",
    payoff: "The final draft stamps itself submitted.",
    winCondition: "Defeat the paper boss with citations.",
    loseCondition: "Lose all focus to deadline ghosts.",
    playerAbilities: ["citation_shot", "coffee_dash"],
    worldForces: ["deadline_pressure", "feedback_swarms"],
    specialRules: ["Coffee speeds the next three citation shots."],
    visualMotifs: ["papers", "coffee", "ghost notes", "red comments"],
    microcopy: ["Reference needed!", "Reviewer 2 has entered the room.", "Submitted!"],
    targetCount: 18,
    progressMax: 100,
  },
];

export function createFallbackGameSpec(prompt: string, mode: GenerationMode = "normal"): GameSpec {
  const cleanPrompt = sanitizePrompt(prompt || "a bored toaster wants a promotion");
  const rng = mulberry32(hash(`${cleanPrompt}|${mode}`));
  const words = keywords(cleanPrompt);
  const profile = pickTheme(cleanPrompt, rng, words);
  const difficulty = pickDifficulty(mode, cleanPrompt, rng);
  const template = mode === "weirder" && rng() > 0.7 ? pick([...TEMPLATE_VALUES], rng) : profile.template;
  const palette = pickPalette(profile, rng);
  const title = titleCase(`${profile.titleNoun} ${pick(titleBits, rng)}`);
  const primaryOpponent = profile.opponents[0] ?? entity("arcade problem", "main pressure", "custom", "gets in the way", "!");
  const primaryHelper = profile.helpers[0] ?? entity("useful sparkle", "pickup", "abstract_shape", "helps a little", "✦");
  const primaryHazard = profile.hazards[0] ?? entity("wobbly hazard", "danger", "abstract_shape", "bumps the player", "◆");

  return {
    title,
    template,
    hero: profile.player.name,
    enemy: primaryOpponent.name,
    collectible: primaryHelper.name,
    obstacle: primaryHazard.name,
    goal: profile.winCondition,
    tone: mode === "weirder" ? `${profile.vibe} with extra nonsense`.slice(0, 72) : profile.vibe,
    palette,
    difficulty,
    intro: `${profile.creativeIntro ?? "Play the prompt"}`,
    creativeBrief: createBrief(profile, cleanPrompt),
    cast: createCast(profile),
    mechanics: createMechanics(profile, difficulty),
    presentation: createPresentation(profile),
  };
}

export function validateGameSpec(value: unknown): GameSpec | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const data = value as Record<string, unknown>;
  if (!TEMPLATE_VALUES.includes(data.template as GameTemplate)) {
    return null;
  }
  if (!DIFFICULTY_VALUES.includes(data.difficulty as Difficulty)) {
    return null;
  }

  const legacy = legacyFrom(data);
  const cast = parseCast(data.cast, legacy);
  const mechanics = parseMechanics(data.mechanics);
  const presentation = parsePresentation(data.presentation);

  const spec: GameSpec = {
    ...legacy,
    template: data.template as GameTemplate,
    palette: cleanField(data.palette, "neon-night", 32).toLowerCase(),
    difficulty: data.difficulty as Difficulty,
    creativeBrief: parseCreativeBrief(data.creativeBrief, legacy),
    cast,
    mechanics,
    presentation,
  };
  return spec;
}

export function sanitizePrompt(prompt: string): string {
  let cleaned = prompt.replace(/[\u0000-\u001f{}<>`$]/g, " ").replace(/\s+/g, " ").trim();
  for (const [name, replacement] of Object.entries(IP_REPLACEMENTS)) {
    cleaned = cleaned.replace(new RegExp(escapeRegExp(name), "gi"), replacement);
  }
  if (/\b(porn|explicit sex|genitals?|rape|gore|graphic violence|slur)\b/i.test(cleaned)) {
    return "awkward arcade nonsense";
  }
  return cleaned.slice(0, 500) || "a bored toaster wants a promotion";
}

function pickTheme(prompt: string, rng: () => number, words: string[]): ThemeProfile {
  const found = THEMES.find((theme) => theme.match.test(prompt));
  if (found) return found;
  return genericTheme(prompt, rng, words);
}

function genericTheme(prompt: string, rng: () => number, words: string[]): ThemeProfile {
  const main = pick(words.length ? words : fallbackNouns, rng);
  const side = pick(words.filter((word) => word !== main).length ? words.filter((word) => word !== main) : fallbackNouns, rng);
  const archetype = inferArchetype(main);
  const objective = pick(["combo_chain", "collect_set", "escape_zone", "clear_waves", "complete_pattern"] as ObjectiveType[], rng);
  const template = objective === "clear_waves" ? "shooter" : objective === "escape_zone" ? "runner" : "collector";
  const player = entity(`${main} champion`, "player character", archetype, "turns nonsense into motion", iconFor(archetype));
  const opponent = entity(`${side} pressure`, "main pressure", inferArchetype(side), "interrupts the weird rule", iconFor(inferArchetype(side)));
  const helper = entity(`${main} spark`, "useful pickup", archetype, "builds progress", "✦");
  const hazard = entity(`wrong ${side}`, "hazard", inferArchetype(side), "breaks the combo", "◆");
  return {
    key: "generic-nonsense",
    match: /.*/,
    titleNoun: main,
    vibe: pick(["surreal arcade nonsense", "tiny chaos fable", "dreamy object panic", "neon toybox weirdness"], rng),
    template,
    objectiveType: objective,
    player,
    opponents: [opponent, entity(`${side} echo`, "secondary pressure", "abstract_shape", "copies your last move", "◇")],
    hazards: [hazard, entity("rule glitch", "environment hazard", "abstract_shape", "changes safe space", "!")],
    helpers: [helper],
    neutralChaos: [entity("stray idea", "neutral chaos", "abstract_shape", "can help or hurt", "?")],
    goalObject: entity(`${main}-${side} machine`, "objective target", "machine", "waits for the pattern", "▣"),
    coreVerb: pick(["combine", "escape", "collect", "transform", "untangle"], rng),
    worldRule: `The ${main} only scores when it interacts with ${side} in the right order.`,
    escalation: `Each success makes the ${side} pressure stranger and faster.`,
    payoff: `The ${main} turns the nonsense into a tiny victory machine.`,
    winCondition: objective === "escape_zone" ? `Reach the exit before ${side} pressure catches up.` : `Complete the ${main} objective before the weird rule collapses.`,
    loseCondition: `Lose all chances to wrong ${side} collisions.`,
    playerAbilities: ["dash", "combine", "shield"],
    worldForces: ["pattern_pressure", "moving_hazards", "rule_glitches"],
    specialRules: [`Wrong ${side} pickups create hazards.`, `Combos briefly empower the ${main}.`],
    visualMotifs: [main, side, "neon symbols", "arcade sparks"],
    microcopy: [`${main} enters nonsense mode.`, `${side} refuses the rules.`, "Combo makes no sense. Perfect."],
    targetCount: 8,
    progressMax: 100,
  };
}

function createBrief(profile: ThemeProfile, prompt: string): CreativeBrief {
  return {
    vibe: profile.vibe,
    playableMetaphor: `"${prompt}" becomes ${profile.worldRule.toLowerCase()}`,
    coreVerb: profile.coreVerb,
    worldRule: profile.worldRule,
    escalation: profile.escalation,
    payoff: profile.payoff,
  };
}

function createCast(profile: ThemeProfile): CastSpec {
  return {
    player: profile.player,
    opponents: profile.opponents,
    hazards: profile.hazards,
    helpers: profile.helpers,
    neutralChaos: profile.neutralChaos,
    goalObject: profile.goalObject,
  };
}

function createMechanics(profile: ThemeProfile, difficulty: Difficulty): MechanicsSpec {
  const multiplier = difficulty === "hard" ? 1.25 : difficulty === "easy" ? 0.8 : 1;
  return {
    objectiveType: profile.objectiveType,
    winCondition: profile.winCondition,
    loseCondition: profile.loseCondition,
    playerAbilities: profile.playerAbilities,
    worldForces: profile.worldForces,
    specialRules: profile.specialRules,
    targetCount: Math.max(4, Math.round((profile.targetCount ?? 8) * multiplier)),
    progressMax: profile.progressMax ?? 100,
  };
}

function createPresentation(profile: ThemeProfile): PresentationSpec {
  return {
    visualMotifs: profile.visualMotifs,
    jokeEvents: profile.microcopy.map((text, index) => ({
      trigger: index === 0 ? "start" : index === profile.microcopy.length - 1 ? "win" : "progress",
      text,
      effect: index === 1 ? "shake" : "caption",
    })),
    microcopy: profile.microcopy,
  };
}

function legacyFrom(data: Record<string, unknown>) {
  return {
    title: cleanField(data.title, "Snack Panic", 64),
    hero: cleanField(data.hero, "tiny arcade underdog", 48),
    enemy: cleanField(data.enemy, "wobbly excuse cloud", 56),
    collectible: cleanField(data.collectible, "bonus receipt", 48),
    obstacle: cleanField(data.obstacle, "dramatic hazard cube", 48),
    goal: cleanField(data.goal, "complete the tiny arcade objective", 120),
    tone: cleanField(data.tone, "absurd retro comedy", 72),
    intro: cleanField(data.intro, "Grab the good stuff and dodge whatever today is throwing at you.", 180),
  };
}

function parseCreativeBrief(value: unknown, legacy: ReturnType<typeof legacyFrom>): CreativeBrief {
  if (!value || typeof value !== "object") {
    return {
      vibe: legacy.tone,
      playableMetaphor: legacy.intro,
      coreVerb: "play",
      worldRule: "The prompt becomes a tiny arcade rule.",
      escalation: "The arcade gets stranger as progress rises.",
      payoff: legacy.goal,
    };
  }
  const data = value as Record<string, unknown>;
  return {
    vibe: cleanField(data.vibe, legacy.tone, 72),
    playableMetaphor: cleanField(data.playableMetaphor, legacy.intro, 180),
    coreVerb: cleanField(data.coreVerb, "play", 32),
    worldRule: cleanField(data.worldRule, "The prompt becomes a tiny arcade rule.", 180),
    escalation: cleanField(data.escalation, "The arcade gets stranger as progress rises.", 160),
    payoff: cleanField(data.payoff, legacy.goal, 160),
  };
}

function parseCast(value: unknown, legacy: ReturnType<typeof legacyFrom>): CastSpec {
  if (!value || typeof value !== "object") {
    return {
      player: entity(legacy.hero, "player character", inferArchetype(legacy.hero), "moves through the prompt", iconFor(inferArchetype(legacy.hero))),
      opponents: [entity(legacy.enemy, "main pressure", inferArchetype(legacy.enemy), "gets in the way", iconFor(inferArchetype(legacy.enemy)))],
      hazards: [entity(legacy.obstacle, "hazard", inferArchetype(legacy.obstacle), "hurts the player", iconFor(inferArchetype(legacy.obstacle)))],
      helpers: [entity(legacy.collectible, "pickup", inferArchetype(legacy.collectible), "adds progress", iconFor(inferArchetype(legacy.collectible)))],
      neutralChaos: [],
    };
  }
  const data = value as Record<string, unknown>;
  return {
    player: parseEntity(data.player, entity(legacy.hero, "player character", inferArchetype(legacy.hero))),
    opponents: parseEntityList(data.opponents, [entity(legacy.enemy, "main pressure", inferArchetype(legacy.enemy))], 5),
    hazards: parseEntityList(data.hazards, [entity(legacy.obstacle, "hazard", inferArchetype(legacy.obstacle))], 6),
    helpers: parseEntityList(data.helpers, [entity(legacy.collectible, "pickup", inferArchetype(legacy.collectible))], 5),
    neutralChaos: parseEntityList(data.neutralChaos, [], 4),
    goalObject: data.goalObject ? parseEntity(data.goalObject, entity("goal", "objective target", "custom")) : undefined,
  };
}

function parseMechanics(value: unknown): MechanicsSpec {
  if (!value || typeof value !== "object") {
    return {
      objectiveType: "collect_set",
      winCondition: "Complete the objective.",
      loseCondition: "Lose all lives.",
      playerAbilities: ["dash"],
      worldForces: ["arcade pressure"],
      specialRules: ["The prompt changes the arena."],
      targetCount: 8,
      progressMax: 100,
    };
  }
  const data = value as Record<string, unknown>;
  return {
    objectiveType: OBJECTIVE_VALUES.includes(data.objectiveType as ObjectiveType) ? (data.objectiveType as ObjectiveType) : "collect_set",
    winCondition: cleanField(data.winCondition, "Complete the objective.", 140),
    loseCondition: cleanField(data.loseCondition, "Lose all lives.", 140),
    playerAbilities: cleanList(data.playerAbilities, 5),
    worldForces: cleanList(data.worldForces, 5),
    specialRules: cleanList(data.specialRules, 5),
    targetCount: clampNumber(data.targetCount, 1, 99, 8),
    progressMax: clampNumber(data.progressMax, 1, 999, 100),
  };
}

function parsePresentation(value: unknown): PresentationSpec {
  if (!value || typeof value !== "object") {
    return { visualMotifs: [], jokeEvents: [], microcopy: [] };
  }
  const data = value as Record<string, unknown>;
  return {
    visualMotifs: cleanList(data.visualMotifs, 8),
    jokeEvents: parseJokeEvents(data.jokeEvents),
    microcopy: cleanList(data.microcopy, 8),
  };
}

function parseEntity(value: unknown, fallback: EntitySpec): EntitySpec {
  if (!value || typeof value !== "object") return fallback;
  const data = value as Record<string, unknown>;
  const archetype = VISUAL_ARCHETYPE_VALUES.includes(data.visualArchetype as VisualArchetype)
    ? (data.visualArchetype as VisualArchetype)
    : inferArchetype(String(data.name ?? fallback.name));
  return {
    name: cleanField(data.name, fallback.name, 48),
    role: cleanField(data.role, fallback.role, 64),
    visualArchetype: archetype,
    behavior: typeof data.behavior === "string" ? cleanField(data.behavior, fallback.behavior ?? "moves", 72) : fallback.behavior,
    effect: typeof data.effect === "string" ? cleanField(data.effect, fallback.effect ?? "", 72) : fallback.effect,
    icon: typeof data.icon === "string" ? cleanField(data.icon, fallback.icon ?? iconFor(archetype), 4) : fallback.icon ?? iconFor(archetype),
  };
}

function parseEntityList(value: unknown, fallback: EntitySpec[], max: number): EntitySpec[] {
  if (!Array.isArray(value)) return fallback;
  return value.slice(0, max).map((item, index) => parseEntity(item, fallback[index] ?? entity("arcade thing", "game force", "custom")));
}

function parseJokeEvents(value: unknown): JokeEvent[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 8).map((item): JokeEvent | null => {
    if (!item || typeof item !== "object") return null;
    const data = item as Record<string, unknown>;
    const trigger = ["start", "progress", "hit", "pickup", "phase_change", "near_loss", "win"].includes(String(data.trigger))
      ? (String(data.trigger) as JokeEvent["trigger"])
      : "progress";
    return { trigger, text: cleanField(data.text, "The arcade gets stranger.", 120), effect: cleanField(data.effect, "caption", 48) };
  }).filter(Boolean) as JokeEvent[];
}

function entity(name: string, role: string, visualArchetype: VisualArchetype, behavior?: string, icon?: string): EntitySpec {
  return { name, role, visualArchetype, behavior, icon: icon ?? iconFor(visualArchetype) };
}

function keywords(prompt: string): string[] {
  return Array.from(
    new Set(
      (prompt.toLowerCase().match(/[a-z][a-z0-9'-]{2,}/g) ?? [])
        .map((word) => word.replace(/^'+|'+$/g, ""))
        .filter((word) => !STOPWORDS.has(word)),
    ),
  ).slice(0, 8);
}

function inferArchetype(value: string): VisualArchetype {
  const lower = value.toLowerCase();
  if (/(cat|kitten)/.test(lower)) return "cat";
  if (/(mouse|mice|rat)/.test(lower)) return "mouse";
  if (/(earth|planet|moon|orbit)/.test(lower)) return "planet";
  if (/(black hole|gravity)/.test(lower)) return "black_hole";
  if (/(ball|cricket|football|tennis)/.test(lower)) return "ball";
  if (/(paper|receipt|essay|dissertation|citation|letter|note|excuse)/.test(lower)) return "paper";
  if (/(bill|invoice|fee|rent|money|bank|refund)/.test(lower)) return "bill";
  if (/(ghost|haunt|spirit|cemetery|grave)/.test(lower)) return "ghost";
  if (/(apple|strawberry|fruit|pineapple|banana)/.test(lower)) return "fruit";
  if (/(machine|washer|washing|boiler|printer|kettle|elevator)/.test(lower)) return "machine";
  if (/(asteroid|meteor|rock)/.test(lower)) return "asteroid";
  if (/(tool|wrench|hammer|repair)/.test(lower)) return "tool";
  if (/(heart|love|romance)/.test(lower)) return "heart";
  if (/(food|biryani|pizza|sandwich|cheese|milk|fish)/.test(lower)) return "food";
  if (/(rain|weather|storm|cloud|wind)/.test(lower)) return "weather";
  if (/(triangle|square|circle|geometry|shape)/.test(lower)) return "abstract_shape";
  if (/(person|tenant|student|landlord|manager|friend|human)/.test(lower)) return "human";
  return "custom";
}

function iconFor(archetype: VisualArchetype): string {
  return {
    human: "🙂",
    cat: "🐱",
    mouse: "🐭",
    planet: "🌍",
    black_hole: "●",
    ball: "●",
    bat: "▰",
    paper: "▤",
    bill: "£",
    ghost: "👻",
    fruit: "🍓",
    machine: "▣",
    asteroid: "◆",
    tool: "🔧",
    heart: "♥",
    food: "●",
    weather: "☁",
    abstract_shape: "△",
    custom: "◆",
  }[archetype];
}

function pickPalette(profile: ThemeProfile, rng: () => number): string {
  if (profile.key === "gravity-escape") return "deep-sea";
  if (profile.key === "repair-chaos") return "neon-night";
  if (profile.key === "sports-chaos") return "toxic-lime";
  return pick(palettes, rng);
}

function pickDifficulty(mode: GenerationMode, prompt: string, rng: () => number): Difficulty {
  if (mode === "harder") return "hard";
  if (mode === "easier") return "easy";
  if (/(impossible|angry|panic|chaos|black hole)/i.test(prompt)) return "hard";
  return pick(["easy", "medium", "medium", "hard"] as Difficulty[], rng);
}

function cleanList(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, max).map((item) => cleanField(item, "arcade nonsense", 72)).filter(Boolean);
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.round(number)));
}

function pick<T>(items: T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)] ?? items[0];
}

function cleanField(value: unknown, fallback: string, maxLength: number): string {
  if (typeof value !== "string") return fallback;
  return sanitizePrompt(value).slice(0, maxLength) || fallback;
}

function titleCase(value: string): string {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ")
    .slice(0, 64);
}

function hash(value: string): number {
  let h = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    h ^= value.charCodeAt(index);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  return () => {
    seed += 0x6d2b79f5;
    let next = seed;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
