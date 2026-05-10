import type {
  CastSpec,
  CreativeBrief,
  Difficulty,
  EntitySpec,
  GameSpec,
  GameTemplate,
  GenerationMode,
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
  "playing",
  "against",
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

const palettes = ["neon-night", "candy-crisis", "toxic-lime", "sunset-byte", "deep-sea"];

type Pattern = "sports" | "space" | "repair" | "academic" | "food" | "weather" | "romance" | "abstract" | "generic";
type DraftSpec = Omit<GameSpec, "difficulty"> & { difficulty?: Difficulty };

const patternWords: Record<Pattern, string[]> = {
  sports: ["sport", "sports", "team", "ball", "bat", "cricket", "tennis", "football", "goal", "runs"],
  space: ["space", "planet", "earth", "black", "hole", "gravity", "moon", "galaxy", "orbit", "asteroid"],
  repair: ["repair", "landlord", "rent", "boiler", "leak", "broken", "tenant", "heating", "pipes"],
  academic: ["school", "uni", "university", "dissertation", "essay", "exam", "citation", "deadline", "homework"],
  food: ["food", "cooking", "cook", "biryani", "pizza", "cheese", "apple", "pineapple", "strawberry", "chicken"],
  weather: ["weather", "rain", "storm", "wind", "picnic", "cloud", "umbrella", "puddle"],
  romance: ["love", "heart", "lonely", "sad", "romance", "crush", "date"],
  abstract: ["geometry", "shape", "dancing", "rhythm", "cemetery", "ghost", "grave", "abstract"],
  generic: [],
};

export function createFallbackGameSpec(prompt: string, mode: GenerationMode = "normal"): GameSpec {
  const cleanPrompt = sanitizePrompt(prompt || "a bored toaster wants a promotion");
  const rng = mulberry32(hash(`${cleanPrompt}|${mode}`));
  const words = keywords(cleanPrompt);
  const pattern = detectPattern(cleanPrompt, words);
  const spec = builders[pattern](cleanPrompt, words, rng);

  spec.difficulty = pickDifficulty(mode, cleanPrompt, rng);
  if (mode === "weirder" && spec.creativeBrief && spec.presentation) {
    spec.tone = `weird ${spec.tone}`.slice(0, 72);
    spec.creativeBrief.vibe = `weird ${spec.creativeBrief.vibe}`.slice(0, 80);
    spec.presentation.jokeEvents.push({
      time: 34,
      text: "A bonus rule arrives wearing a fake moustache.",
      effect: "spawn_chaos",
    });
  }
  if (mode === "harder" && spec.mechanics) {
    spec.mechanics.targetCount = Math.min(30, spec.mechanics.targetCount + 3);
    spec.mechanics.specialRules.push("hazards escalate faster");
  }
  if (mode === "easier" && spec.mechanics) {
    spec.mechanics.targetCount = Math.max(3, spec.mechanics.targetCount - 2);
    spec.mechanics.playerAbilities.push("mercy shield");
  }

  return validateGameSpec(spec) ?? genericSpec(cleanPrompt, words, rng);
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

  return {
    title: cleanField(data.title, "Snack Panic", 64),
    template: data.template as GameTemplate,
    hero: cleanField(data.hero, "tiny arcade underdog", 48),
    enemy: cleanField(data.enemy, "wobbly excuse cloud", 56),
    collectible: cleanField(data.collectible, "bonus receipt", 48),
    obstacle: cleanField(data.obstacle, "dramatic hazard cube", 48),
    goal: cleanField(data.goal, "complete the tiny nonsense objective", 120),
    tone: cleanField(data.tone, "absurd retro comedy", 72),
    palette: cleanField(data.palette, "neon-night", 32).toLowerCase(),
    difficulty: data.difficulty as Difficulty,
    intro: cleanField(data.intro, "Grab the good stuff and dodge whatever today is throwing at you.", 180),
    creativeBrief: cleanCreativeBrief(data.creativeBrief),
    cast: cleanCast(data.cast, data),
    mechanics: cleanMechanics(data.mechanics),
    presentation: cleanPresentation(data.presentation),
  };
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

const builders: Record<Pattern, (prompt: string, words: string[], rng: () => number) => GameSpec> = {
  sports: sportsSpec,
  space: spaceSpec,
  repair: repairSpec,
  academic: academicSpec,
  food: foodSpec,
  weather: weatherSpec,
  romance: romanceSpec,
  abstract: abstractSpec,
  generic: genericSpec,
};

function sportsSpec(_prompt: string, words: string[], _rng: () => number): GameSpec {
  const cat = words.includes("cat");
  const mouse = words.includes("mouse") || words.includes("mice");
  return baseSpec({
    title: cat && mouse ? "Cat Cricket Mouse League" : "Pocket Sports Riot",
    template: "collector",
    hero: cat ? "bat-swinging cat" : "pocket striker",
    enemy: mouse ? "mouse fielding team" : "tiny rival team",
    collectible: "loose cricket runs",
    obstacle: "sneaky fielders and wild balls",
    goal: "score enough tiny runs before the fielding team turns the pitch into nonsense",
    tone: "sports-chaos arcade farce",
    palette: "toxic-lime",
    intro: "Smack loose balls, grab runs, and dodge the tiny fielders.",
    creativeBrief: {
      vibe: "scrappy playground sports chaos",
      playableMetaphor: "the prompt becomes a miniature match where every pickup is a possible run",
      coreVerb: "score",
      worldRule: "balls ricochet, fielders swarm, and runs appear in risky spaces",
      escalation: "fielders get bolder after every few runs",
      payoff: "win by turning nonsense cricket into a scoreboard miracle",
    },
    cast: {
      player: entity(cat ? "bat-swinging cat" : "pocket striker", "player", cat ? "cat" : "human", "dash between wickets", "scores runs"),
      opponents: [
        entity(mouse ? "mouse fielding team" : "rival fielders", "fielding opponent", mouse ? "mouse" : "human", "chase the player", "steals momentum"),
        entity("wicket squeaker", "opponent", mouse ? "mouse" : "ball", "guards the run zone", "blocks deliveries"),
      ],
      hazards: [
        entity("wild cricket ball", "hazard", "ball", "bounces sideways", "costs a life"),
        entity("cheese boundary trap", "hazard", "food", "sits on tempting lanes", "breaks combos"),
      ],
      helpers: [entity("run token", "score pickup", "ball", "waits near danger", "adds a run"), entity("lucky cricket bat", "helper", "bat", "briefly clears mice", "combo boost")],
      neutralChaos: [entity("yarn pitch marker", "chaos", "abstract_shape", "wiggles", "changes lanes")],
      goalObject: entity("tiny scoreboard", "goal", "paper", "counts runs", "win target"),
    },
    mechanics: mechanics("score_runs", "score the target number of runs", "lose all lives to fielders and wild balls", ["dash", "bat swing"], ["ball ricochet", "fielder pressure"], ["run pickups near opponents are worth more"], 8),
    presentation: presentation(mergeTerms(words, ["pitch lines", "scoreboard", "tiny crowd", "bouncing balls"], 8), [
      { time: 7, text: "The mouse captain appeals for emotional LBW.", effect: "spawn_opponent" },
      { time: 18, text: "A ball politely refuses physics.", effect: "spawn_hazard" },
      { time: 29, text: "The scoreboard adds one run out of pity.", effect: "spawn_helper" },
    ], ["Score runs", "Avoid fielders", "Bat swing clears space"]),
  });
}

function spaceSpec(_prompt: string, words: string[], _rng: () => number): GameSpec {
  return baseSpec({
    title: "Earth Black Hole Orbit Panic",
    template: "boss_fight",
    hero: words.includes("earth") ? "Earth" : "tiny runaway planet",
    enemy: "hungry black hole",
    collectible: "moon slingshot",
    obstacle: "asteroid debris",
    goal: "escape the pull and reach safe orbit",
    tone: "cosmic slapstick survival",
    palette: "deep-sea",
    intro: "Fight gravity, grab slingshots, and escape the black hole.",
    creativeBrief: {
      vibe: "cosmic arcade panic",
      playableMetaphor: "the prompt becomes a gravity tug-of-war",
      coreVerb: "escape",
      worldRule: "the black hole constantly pulls the player inward",
      escalation: "debris starts orbiting closer and faster",
      payoff: "win by reaching a safe orbit instead of defeating space",
    },
    cast: {
      player: entity("Earth", "player", "planet", "orbit boost", "survives pull"),
      opponents: [entity("black hole", "gravity boss", "black_hole", "pulls everything inward", "instant danger zone")],
      hazards: [entity("asteroid debris", "hazard", "asteroid", "orbits the black hole", "chips lives"), entity("gravity wave", "hazard", "abstract_shape", "sweeps across orbit", "pushes player inward")],
      helpers: [entity("moon slingshot", "helper", "planet", "boosts away from pull", "adds escape progress"), entity("rocket crumb", "helper", "tool", "brief speed burst", "escape boost")],
      neutralChaos: [entity("loose satellite", "chaos", "abstract_shape", "wanders", "bounces unpredictably")],
      goalObject: entity("safe orbit ring", "escape zone", "abstract_shape", "glows at screen edge", "win zone"),
    },
    mechanics: mechanics("escape_zone", "fill the escape meter by reaching safe orbit bursts", "get pulled into the black hole or lose all lives", ["dash", "orbit boost"], ["gravity_pull", "orbital_debris"], ["distance from the black hole increases escape progress"], 5),
    presentation: presentation(mergeTerms(words, ["orbit rings", "star flecks", "gravity waves", "debris"], 8), [
      { time: 6, text: "The black hole sends a calendar invite called Lunch.", effect: "gravity_pulse" },
      { time: 17, text: "A moon offers questionable emotional support.", effect: "spawn_helper" },
      { time: 30, text: "Physics has left a voicemail.", effect: "spawn_hazard" },
    ], ["Escape orbit", "Gravity pulls", "Boost away"]),
  });
}

function repairSpec(_prompt: string, words: string[], _rng: () => number): GameSpec {
  return baseSpec({
    title: "Boiler Excuse Repair Dash",
    template: "collector",
    hero: "freezing tenant",
    enemy: "landlord excuses",
    collectible: "repair receipts",
    obstacle: "cold bills and frozen pipes",
    goal: "fill the repair meter before the flat becomes an ice cube",
    tone: "absurd British frustration",
    palette: "neon-night",
    intro: "Collect tools and receipts, dodge excuses, and fix the boiler meter.",
    creativeBrief: {
      vibe: "cold flat paperwork comedy",
      playableMetaphor: "ignored repairs become pickups fighting a repair meter",
      coreVerb: "repair",
      worldRule: "excuses chase the tenant while useful paperwork warms the meter",
      escalation: "cold bills and frozen pipes crowd the room",
      payoff: "win by making the boiler louder than the landlord excuses",
    },
    cast: {
      player: entity("freezing tenant", "player", "human", "slides on cold floor", "fills repair meter"),
      opponents: [entity("landlord excuse", "opponent", "paper", "dodges then charges", "drains progress")],
      hazards: [entity("cold bill", "hazard", "bill", "slides across the room", "costs a life"), entity("frozen pipe", "hazard", "machine", "leaks cold patches", "slows movement")],
      helpers: [entity("repair receipt", "helper", "paper", "fills meter", "repair progress"), entity("tiny wrench", "helper", "tool", "briefly scares excuses", "repair boost")],
      neutralChaos: [entity("cold breath cloud", "chaos", "weather", "drifts", "hides pickups")],
      goalObject: entity("broken boiler", "goal", "machine", "waits to be repaired", "progress meter"),
    },
    mechanics: mechanics("repair_meter", "fill the repair meter", "lose all lives to cold bills and excuses", ["dash", "receipt magnet"], ["slippery_floor", "excuse_waves"], ["tools are worth extra near the boiler"], 6),
    presentation: presentation(mergeTerms(words, ["ice", "rent notices", "repair tools", "cold breath"], 8), [
      { time: 6, text: "Landlord says: I'll check tomorrow.", effect: "spawn_opponent" },
      { time: 16, text: "The boiler coughs like it knows your deposit.", effect: "screen_shake" },
      { time: 28, text: "An engineer appointment appears under three excuses.", effect: "spawn_helper" },
    ], ["Fill repair meter", "Avoid excuses", "Tools help near boiler"]),
  });
}

function academicSpec(_prompt: string, words: string[], _rng: () => number): GameSpec {
  return baseSpec({
    title: "Dissertation Boss Citation Panic",
    template: "boss_fight",
    hero: "overcaffeinated student",
    enemy: "angry dissertation stack",
    collectible: "citations and coffee",
    obstacle: "deadline walls",
    goal: "defeat the paper boss by firing enough citations into it",
    tone: "academic panic comedy",
    palette: "candy-crisis",
    intro: "Shoot citations, grab coffee, and survive the dissertation's feedback attacks.",
    creativeBrief: {
      vibe: "library panic with arcade paper cuts",
      playableMetaphor: "the dissertation becomes a boss made of hostile pages",
      coreVerb: "cite",
      worldRule: "citations damage the paper threat while deadlines fall like bricks",
      escalation: "feedback ghosts appear as the boss loses pages",
      payoff: "win by turning academic dread into a finished chapter",
    },
    cast: {
      player: entity("student", "player", "human", "shoots citations", "finishes work"),
      opponents: [entity("dissertation stack", "paper boss", "paper", "spits feedback", "boss health")],
      hazards: [entity("deadline wall", "hazard", "paper", "falls downward", "costs a life"), entity("feedback ghost", "hazard", "ghost", "wanders sideways", "confuses movement")],
      helpers: [entity("citation", "ammo helper", "paper", "boosts shots", "damages boss"), entity("coffee", "helper", "food", "speeds player briefly", "focus boost")],
      neutralChaos: [entity("missing file", "chaos", "paper", "teleports", "blocks lanes")],
      goalObject: entity("finished chapter", "goal", "paper", "glows after victory", "payoff"),
    },
    mechanics: mechanics("defeat_boss", "reduce the dissertation boss to zero pages", "lose all lives to feedback and deadline attacks", ["citation shot", "coffee dash"], ["deadline_rain", "feedback_waves"], ["coffee makes the next shot stronger"], 10),
    presentation: presentation(mergeTerms(words, ["paper stacks", "red pen marks", "coffee rings", "library static"], 8), [
      { time: 7, text: "Supervisor note: nearly there, just rewrite everything.", effect: "spawn_hazard" },
      { time: 19, text: "A citation briefly believes in you.", effect: "spawn_helper" },
      { time: 31, text: "The appendix starts flapping.", effect: "boss_phase" },
    ], ["Shoot citations", "Grab coffee", "Defeat paper boss"]),
  });
}

function foodSpec(_prompt: string, words: string[], _rng: () => number): GameSpec {
  const combo = words.filter((word) => ["apple", "pineapple", "strawberry", "fruit"].includes(word)).length >= 2 || words.includes("pen");
  return baseSpec({
    title: combo ? "Snack Combo Cabinet" : "Kitchen Orbit Crisis",
    template: "collector",
    hero: words.slice(0, 2).join(" ") || "hungry space chef",
    enemy: "angry ovens",
    collectible: "ingredient combo pieces",
    obstacle: "burnt pans",
    goal: "complete the food combo before the kitchen declares independence",
    tone: "hungry arcade farce",
    palette: "sunset-byte",
    intro: "Collect ingredients in the right spirit and dodge kitchen disasters.",
    creativeBrief: {
      vibe: "kitchen nonsense with snack logic",
      playableMetaphor: "food words become a combo recipe played as pickups",
      coreVerb: "combine",
      worldRule: "ingredients score more when collected as a silly set",
      escalation: "burnt pans and angry ovens crowd the recipe",
      payoff: "win by assembling the prompt into edible nonsense",
    },
    cast: {
      player: entity(words.slice(0, 2).join(" ") || "snack hero", "player", guessArchetype(words[0] ?? "human"), "collects ingredients", "builds combo"),
      opponents: [entity("angry oven", "opponent", "machine", "zigzags", "burns combo")],
      hazards: [entity("burnt pan", "hazard", "food", "slides", "costs a life"), entity("flying onion", "hazard", "food", "drifts", "breaks chain")],
      helpers: [entity(words[0] ?? "ingredient", "combo helper", guessArchetype(words[0] ?? "food"), "collectable", "combo progress"), entity("sparkly plate", "helper", "food", "delivery target", "bonus progress")],
      neutralChaos: [entity("sauce splat", "chaos", "abstract_shape", "pulses", "changes pickup value")],
      goalObject: entity("recipe card", "goal", "paper", "tracks combo", "win target"),
    },
    mechanics: mechanics(combo ? "combo_chain" : "collect_set", "complete the prompt combo set", "lose all lives or break too many chains", ["dash", "magnet"], ["combo_order", "kitchen_bounce"], ["matching prompt objects increase combo progress"], 7),
    presentation: presentation(mergeTerms(words, ["steam", "plates", "sauce splats", "recipe card"], 8), [
      { time: 8, text: "The recipe insists this was always a sport.", effect: "spawn_helper" },
      { time: 18, text: "A pan has achieved villain status.", effect: "spawn_hazard" },
      { time: 30, text: "The combo almost makes sense. Dangerous.", effect: "combo_bonus" },
    ], ["Build combo", "Avoid burnt pans", "Grab matching food"]),
  });
}

function weatherSpec(_prompt: string, words: string[], _rng: () => number): GameSpec {
  return baseSpec({
    title: "Picnic Weather Betrayal",
    template: "collector",
    hero: "optimistic picnic carrier",
    enemy: "sideways rain",
    collectible: "dry sandwiches",
    obstacle: "puddles and umbrella flips",
    goal: "deliver dry picnic items to the blanket",
    tone: "British weather slapstick",
    palette: "deep-sea",
    intro: "Collect dry food, dodge sideways weather, and deliver it to the blanket.",
    creativeBrief: { vibe: "weather betrayal comedy", playableMetaphor: "bad weather becomes a delivery obstacle course", coreVerb: "deliver", worldRule: "wind pushes everything sideways", escalation: "puddles and rain lanes multiply", payoff: "win by keeping one sandwich emotionally dry" },
    cast: { player: entity("picnic carrier", "player", "human", "fights wind", "delivers food"), opponents: [entity("sideways rain", "opponent", "weather", "rushes across", "soaks progress")], hazards: [entity("puddle trap", "hazard", "weather", "sticks to lanes", "slows player")], helpers: [entity("dry sandwich", "helper", "food", "pickup", "delivery progress")], neutralChaos: [entity("inside-out umbrella", "chaos", "weather", "spins", "deflects movement")], goalObject: entity("picnic blanket", "delivery goal", "abstract_shape", "waits at edge", "receives items") },
    mechanics: mechanics("deliver_items", "deliver enough dry picnic items", "lose all lives to weather", ["dash", "umbrella shove"], ["wind_push", "rain_lanes"], ["wind pushes the player sideways"], 5),
    presentation: presentation(mergeTerms(words, ["raindrops", "grey clouds", "flapping blanket"], 8), [
      { time: 7, text: "Weather app says light drizzle. It lied.", effect: "wind_push" },
      { time: 18, text: "A heroic umbrella turns inside out.", effect: "spawn_hazard" },
      { time: 30, text: "One sandwich remains emotionally dry.", effect: "spawn_helper" },
    ], ["Deliver food", "Fight wind", "Avoid puddles"]),
  });
}

function romanceSpec(_prompt: string, words: string[], _rng: () => number): GameSpec {
  const machine = words.includes("machine") || words.includes("washing");
  return baseSpec({
    title: machine ? "Lonely Machine Heart Quest" : "Tiny Heart Delivery",
    template: "collector",
    hero: machine ? "sad washing machine" : "lonely arcade object",
    enemy: "awkward silence",
    collectible: "tiny hearts",
    obstacle: "rejection bubbles",
    goal: "deliver enough hearts to stop the appliance from sighing",
    tone: "melodramatic appliance comedy",
    palette: "candy-crisis",
    intro: "Collect hearts, dodge awkward silence, and deliver affection safely.",
    creativeBrief: { vibe: "silly object romance", playableMetaphor: "loneliness becomes a delivery loop with fragile hearts", coreVerb: "deliver", worldRule: "hearts drift away unless gathered and brought home", escalation: "awkward silence gets louder near success", payoff: "win by giving the sad object a tiny arcade meet-cute" },
    cast: { player: entity(machine ? "sad washing machine" : "lonely object", "player", machine ? "machine" : "heart", "carries hearts", "delivery progress"), opponents: [entity("awkward silence", "opponent", "ghost", "floats closer", "steals hearts")], hazards: [entity("rejection bubble", "hazard", "abstract_shape", "bounces", "costs a life")], helpers: [entity("tiny heart", "helper", "heart", "collectable", "delivery item")], neutralChaos: [entity("mixed signal", "chaos", "paper", "wanders", "changes routes")], goalObject: entity("laundry love letter", "goal", "paper", "receives hearts", "win target") },
    mechanics: mechanics("deliver_items", "deliver enough hearts", "lose all lives to rejection bubbles", ["dash", "heart magnet"], ["heart_drift", "awkward_orbit"], ["carrying hearts makes opponents chase harder"], 5),
    presentation: presentation(mergeTerms(words, ["soap bubbles", "tiny hearts", "love letter"], 8), [
      { time: 8, text: "The spin cycle asks if this is a date.", effect: "spawn_helper" },
      { time: 20, text: "Awkward silence enters the room sideways.", effect: "spawn_opponent" },
      { time: 31, text: "A sock gives surprisingly good advice.", effect: "spawn_helper" },
    ], ["Deliver hearts", "Avoid awkward silence", "Dash when carrying love"]),
  });
}

function abstractSpec(_prompt: string, words: string[], _rng: () => number): GameSpec {
  const fruit = words.find((word) => ["strawberry", "apple", "pineapple"].includes(word));
  return baseSpec({
    title: words.includes("cemetery") ? "Dancing Geometry Cemetery" : "Pattern Nonsense Ritual",
    template: "collector",
    hero: fruit ? `dancing ${fruit}` : "tiny rhythm shape",
    enemy: "geometry ghosts",
    collectible: "pattern beats",
    obstacle: "wrong-angle graves",
    goal: "complete the pattern before the shapes forget the dance",
    tone: "spooky abstract rhythm comedy",
    palette: "neon-night",
    intro: "Collect pattern beats in order while ghost shapes crash the dance.",
    creativeBrief: { vibe: "spooky rhythm geometry", playableMetaphor: "abstract words become a sequence of shapes to collect", coreVerb: "pattern", worldRule: "shapes only count when collected in the cabinet's silly order", escalation: "ghosts rotate faster as the sequence grows", payoff: "win by making nonsense choreography readable" },
    cast: { player: entity(fruit ? `dancing ${fruit}` : "rhythm shape", "player", fruit ? "fruit" : "abstract_shape", "moves between beats", "sequence progress"), opponents: [entity("geometry ghost", "opponent", "ghost", "orbits pattern beats", "breaks sequence")], hazards: [entity("wrong-angle grave", "hazard", "abstract_shape", "slides", "resets combo")], helpers: [entity("triangle beat", "pattern helper", "abstract_shape", "sequence pickup", "pattern progress"), entity("moonlit berry", "helper", "fruit", "bonus pickup", "extra progress")], neutralChaos: [entity("dancing square", "chaos", "abstract_shape", "rotates", "changes order")], goalObject: entity("pattern altar", "goal", "abstract_shape", "tracks sequence", "win target") },
    mechanics: mechanics("complete_pattern", "complete the shape sequence", "lose all lives or break too many patterns", ["dash", "rhythm pulse"], ["orbiting_shapes", "combo_order"], ["matching the visible pattern gives bonus progress"], 6),
    presentation: presentation(mergeTerms(words, ["grave shapes", "dance floor", "moon grid"], 8), [
      { time: 6, text: "A square refuses to clap on beat.", effect: "pattern_shuffle" },
      { time: 17, text: "The cemetery briefly becomes a dance instructor.", effect: "spawn_opponent" },
      { time: 29, text: "The strawberry nails a mathematically spooky twirl.", effect: "spawn_helper" },
    ], ["Complete pattern", "Avoid wrong angles", "Keep the combo"]),
  });
}

function genericSpec(_prompt: string, words: string[], rng: () => number): GameSpec {
  const primary = words[0] ?? "nonsense";
  const secondary = words[1] ?? "button";
  const promptEntities = mergeTerms(words, ["receipt", "panic token", "tiny alarm"], 6);
  return baseSpec({
    title: titleCase(`${primary} Combo Cabinet`),
    template: "collector",
    hero: `tiny ${primary}`,
    enemy: `dramatic ${secondary} swarm`,
    collectible: `${primary} combo piece`,
    obstacle: `${secondary} problem`,
    goal: `assemble the ${primary} combo before the cabinet changes its mind`,
    tone: "absurd retro comedy",
    palette: pick(palettes, rng),
    intro: `Collect the right ${primary} pieces, dodge ${secondary} trouble, and finish the combo.`,
    creativeBrief: { vibe: "nonsense made physical", playableMetaphor: "the prompt becomes an object-combination toy", coreVerb: "combine", worldRule: "prompt objects become pickups, threats, and combo rules", escalation: "wrong objects appear more often as the combo grows", payoff: "win by making the random thought briefly coherent" },
    cast: { player: entity(`tiny ${primary}`, "player", guessArchetype(primary), "collects matching objects", "combo progress"), opponents: [entity(`${secondary} swarm`, "opponent", guessArchetype(secondary), "chases combo pieces", "breaks chain")], hazards: [entity(`wrong ${secondary}`, "hazard", "abstract_shape", "drifts", "breaks combo")], helpers: promptEntities.slice(0, 4).map((word) => entity(word, "combo helper", guessArchetype(word), "collectable", "combo progress")), neutralChaos: [entity("tiny alarm", "chaos", "abstract_shape", "pulses", "shuffles pickups")], goalObject: entity("combo meter", "goal", "paper", "tracks chain", "win target") },
    mechanics: mechanics("combo_chain", "complete the prompt combo chain", "lose all lives or break the chain too often", ["dash", "combo magnet"], ["combo_order", "decoy_pickups"], ["prompt words score more than generic pickups"], 6),
    presentation: presentation(mergeTerms(words, ["combo meter", "neon crumbs", "arcade static"], 8), [
      { time: 7, text: `The ${secondary} problem files a tiny complaint.`, effect: "spawn_opponent" },
      { time: 19, text: `${titleCase(primary)} briefly becomes everyone's responsibility.`, effect: "spawn_hazard" },
      { time: 31, text: "The combo almost explains itself. Stop it.", effect: "combo_bonus" },
    ], ["Build combo", "Avoid decoys", "Prompt words matter"]),
  });
}

function baseSpec(spec: DraftSpec): GameSpec {
  return { difficulty: "medium", ...spec };
}

function entity(name: string, role: string, visualArchetype: VisualArchetype, behavior?: string, effect?: string): EntitySpec {
  return { name, role, visualArchetype, behavior, effect };
}

function mechanics(objectiveType: ObjectiveType, winCondition: string, loseCondition: string, playerAbilities: string[], worldForces: string[], specialRules: string[], targetCount: number): MechanicsSpec {
  return { objectiveType, winCondition, loseCondition, playerAbilities, worldForces, specialRules, targetCount, progressMax: 100 };
}

function presentation(visualMotifs: string[], jokeEvents: PresentationSpec["jokeEvents"], microcopy: string[]): PresentationSpec {
  return { visualMotifs, jokeEvents, microcopy };
}

function cleanCreativeBrief(value: unknown): CreativeBrief | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  return {
    vibe: cleanField(data.vibe, "absurd retro comedy", 80),
    playableMetaphor: cleanField(data.playableMetaphor, "turn the prompt into a tiny arcade situation", 140),
    coreVerb: cleanField(data.coreVerb, "collect", 36),
    worldRule: cleanField(data.worldRule, "everything behaves like arcade nonsense", 140),
    escalation: cleanField(data.escalation, "more chaos appears as progress rises", 140),
    payoff: cleanField(data.payoff, "win by making the joke physically playable", 140),
  };
}

function cleanCast(value: unknown, legacy: Record<string, unknown>): CastSpec {
  const data = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    player: cleanEntity(data.player, cleanField(legacy.hero, "tiny arcade underdog", 48), "player", "human"),
    opponents: cleanEntities(data.opponents, cleanField(legacy.enemy, "wobbly excuse cloud", 56), "opponent", "abstract_shape"),
    hazards: cleanEntities(data.hazards, cleanField(legacy.obstacle, "dramatic hazard cube", 48), "hazard", "abstract_shape"),
    helpers: cleanEntities(data.helpers, cleanField(legacy.collectible, "bonus receipt", 48), "helper", "paper"),
    neutralChaos: cleanEntities(data.neutralChaos, "arcade static", "chaos", "abstract_shape"),
    goalObject: cleanEntity(data.goalObject, "objective marker", "goal", "paper"),
  };
}

function cleanMechanics(value: unknown): MechanicsSpec {
  const data = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const objective = OBJECTIVE_VALUES.includes(data.objectiveType as ObjectiveType) ? (data.objectiveType as ObjectiveType) : "collect_set";
  return {
    objectiveType: objective,
    winCondition: cleanField(data.winCondition, "complete the objective", 120),
    loseCondition: cleanField(data.loseCondition, "lose all lives", 120),
    playerAbilities: cleanStringList(data.playerAbilities, 5),
    worldForces: cleanStringList(data.worldForces, 6),
    specialRules: cleanStringList(data.specialRules, 6),
    targetCount: clampNumber(data.targetCount, 6, 1, 30),
    progressMax: clampNumber(data.progressMax, 100, 10, 500),
  };
}

function cleanPresentation(value: unknown): PresentationSpec {
  const data = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    visualMotifs: cleanStringList(data.visualMotifs, 8),
    jokeEvents: Array.isArray(data.jokeEvents)
      ? data.jokeEvents.slice(0, 6).map((event, index) => {
          const item = event && typeof event === "object" ? (event as Record<string, unknown>) : {};
          return {
            time: clampNumber(item.time, 8 + index * 8, 0, 60),
            text: cleanField(item.text, "The arcade makes a suspicious noise.", 120),
            effect: cleanField(item.effect, "spawn_chaos", 40),
          };
        })
      : [],
    microcopy: cleanStringList(data.microcopy, 8),
  };
}

function cleanEntity(value: unknown, fallbackName: string, fallbackRole: string, fallbackArchetype: VisualArchetype): EntitySpec {
  const data = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const archetype = VISUAL_ARCHETYPE_VALUES.includes(data.visualArchetype as VisualArchetype)
    ? (data.visualArchetype as VisualArchetype)
    : fallbackArchetype;
  return {
    name: cleanField(data.name, fallbackName, 56),
    role: cleanField(data.role, fallbackRole, 48),
    visualArchetype: archetype,
    behavior: typeof data.behavior === "string" ? cleanField(data.behavior, "", 64) : undefined,
    effect: typeof data.effect === "string" ? cleanField(data.effect, "", 64) : undefined,
    icon: typeof data.icon === "string" ? cleanField(data.icon, "", 8) : undefined,
  };
}

function cleanEntities(value: unknown, fallbackName: string, fallbackRole: string, fallbackArchetype: VisualArchetype): EntitySpec[] {
  if (!Array.isArray(value) || value.length === 0) {
    return [cleanEntity(null, fallbackName, fallbackRole, fallbackArchetype)];
  }
  return value.slice(0, 8).map((item) => cleanEntity(item, fallbackName, fallbackRole, fallbackArchetype));
}

function cleanStringList(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map((item) => cleanField(item, "", 120)).filter(Boolean))).slice(0, limit);
}

function detectPattern(prompt: string, words: string[]): Pattern {
  const lower = prompt.toLowerCase();
  let best: { pattern: Pattern; score: number } = { pattern: "generic", score: 0 };
  for (const [pattern, keys] of Object.entries(patternWords) as Array<[Pattern, string[]]>) {
    const score = keys.reduce((total, key) => total + (words.includes(key) || lower.includes(key) ? 1 : 0), 0);
    if (score > best.score) best = { pattern, score };
  }
  return best.pattern;
}

function keywords(prompt: string): string[] {
  return Array.from(new Set((prompt.toLowerCase().match(/[a-z][a-z0-9'-]{2,}/g) ?? []).map((word) => word.replace(/^'+|'+$/g, "")).filter((word) => !STOPWORDS.has(word)))).slice(0, 10);
}

function guessArchetype(word: string): VisualArchetype {
  if (["cat", "kitten"].includes(word)) return "cat";
  if (["mouse", "mice"].includes(word)) return "mouse";
  if (["earth", "planet", "moon"].includes(word)) return "planet";
  if (["black", "hole"].includes(word)) return "black_hole";
  if (["ball", "cricket", "football", "tennis"].includes(word)) return "ball";
  if (["paper", "essay", "dissertation", "citation", "deadline"].includes(word)) return "paper";
  if (["bill", "rent", "invoice"].includes(word)) return "bill";
  if (["ghost", "cemetery", "grave"].includes(word)) return "ghost";
  if (["apple", "pineapple", "strawberry", "fruit"].includes(word)) return "fruit";
  if (["boiler", "machine", "washing"].includes(word)) return "machine";
  if (["asteroid", "rock"].includes(word)) return "asteroid";
  if (["tool", "wrench", "pen"].includes(word)) return "tool";
  if (["love", "heart"].includes(word)) return "heart";
  if (["food", "biryani", "chicken", "pizza", "cheese"].includes(word)) return "food";
  if (["rain", "weather", "storm", "wind", "cloud"].includes(word)) return "weather";
  return "abstract_shape";
}

function pickDifficulty(mode: GenerationMode, prompt: string, rng: () => number): Difficulty {
  if (mode === "harder") return "hard";
  if (mode === "easier") return "easy";
  if (/(attacking|panic|chaos|ruined|black hole)/i.test(prompt)) return "hard";
  return pick(["easy", "medium", "medium", "hard"] as Difficulty[], rng);
}

function mergeTerms(primary: string[], secondary: string[], limit: number): string[] {
  const merged: string[] = [];
  for (const term of [...primary, ...secondary]) {
    const clean = term.trim();
    if (clean && !merged.includes(clean)) merged.push(clean);
  }
  return merged.slice(0, limit);
}

function pick<T>(items: T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)] ?? items[0];
}

function cleanField(value: unknown, fallback: string, maxLength: number): string {
  if (typeof value !== "string") return fallback;
  return sanitizePrompt(value).slice(0, maxLength) || fallback;
}

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const number = typeof value === "number" ? value : Number.parseInt(String(value), 10);
  return Math.max(min, Math.min(max, Number.isFinite(number) ? number : fallback));
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
