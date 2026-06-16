// profiles/b7squad.js — the default profile. Audi A4 B7 / RS4 / S4 community.
// This is the original engine's brain, expressed as a profile: a real
// automotive build analyzer plus deep, varied sentence pools.
import { atHandle, humanList, has, tags20, DEFAULT_LIMITS } from "./_base.js";
import { readVision, visionToParts } from "../src/vision.js";

const ENGINES = {
  RS4: { long: "the high-revving 4.2 FSI V8", note: "V8" },
  S4: { long: "the 4.2 V8", note: "V8" },
  A4: { long: "the B7 four-pot", note: "motor" },
};

const LEXICON = {
  ride: {
    air: ["bag", "air ride", "airride", "air lift", "airlift", "accuair"],
    coilovers: ["coilover", "coils", " kw ", "kw v", "bilstein", "ohlins", "öhlins", "bc racing", "fortune auto", "st coil"],
    springs: ["spring", "h&r", "hr lowering", "eibach", "lowering springs", "neuspeed"],
    slammed: ["slammed", "static", "tucked", "laid out", "on the floor"],
  },
  wheels: {
    sizes: /(\d{2})\s?(?:in\b|inch|")/gi,
    brands: ["ch-r", "chr", "rs4 rep", "rs4 reps", "peeler", "speedline", "bbs", "hre", "rotiform", "vmr", "avant garde", "niche", "apex", "ronal", "volk", "te37", "3sdm", "ispiri", "fifteen52", "work wheels", "ccw", "vossen", "enkei", "japan racing"],
  },
  power: {
    supercharger: ["supercharger", "blower", "dts", "vf engineering", "vf eng", "stage 2 pulley", "rotrex"],
    tune: ["tune", "stage 1", "stage 2", "stage 3", "ecu", "flash", "giac", "apr", "jhm tune"],
    intake: ["intake", "cold air", "cai", "carbonio"],
    exhaust: ["exhaust", "catback", "cat-back", "milltek", "downpipe", "headers", "test pipe", "x-pipe", "resonator delete", "valved"],
    swap: ["rs4 swap", "engine swap", "2.7t swap", "k04", "turbo swap"],
  },
};

const POOLS = {
  opener: [
    "{descriptor} over a {subject} — proof the B7 never really went out of style.",
    "Some silhouettes just age right. This {descriptor} {model} is exhibit A.",
    "The B7 {model} hits different in {descriptor}.",
    "Still one of the cleanest shapes Ingolstadt ever drew, and this {descriptor} {model} earns it.",
    "{subject} in {descriptor}, sitting pretty and meaning every inch of it.",
    "You don't catch a {descriptor} {model} this tidy every day.",
    "Two decades on and the {model} keeps quietly owning the lane.",
    "{descriptor} {model}. Understated until you actually know what you're looking at.",
    "This is the kind of {model} that makes people rethink the whole B7 platform.",
    "Restraint and intent in equal measure — {descriptor} {model}, done properly.",
  ],
  openerEngine: [
    "Quattro grip, {engine}, and {descriptor} paint — the B7 recipe at its best.",
    "{engine} up front, {descriptor} over the arches. The {model} formula still works.",
    "There's a reason people chase the {model}: {engine} and a chassis that backs it up.",
  ],
  wheels: [
    "Those {wheels} tuck into the arches exactly right.",
    "Wheel choice carries it — {wheels} with fitment dialed.",
    "{wheels} doing a lot of the talking here, and they're saying the right things.",
    "Hard to look past the {wheels} sitting flush under those fenders.",
  ],
  rideAir: [
    "Bagged and laid out for the photo, back up for the drive home.",
    "Air ride means it lays frame at a show and still clears the speed bumps.",
    "On air, so the stance is a choice it makes every single morning.",
  ],
  rideCoilovers: [
    "Dropped on coilovers, fender gap deleted without wrecking the daily.",
    "Coiled to that exact sweet spot — low, planted, still drivable.",
    "Coilovers set with patience, not just slammed and called done.",
  ],
  rideSprings: ["A measured drop on springs that nails the rake.", "Springs only, but the stance reads way more expensive than that."],
  power: [
    "And the go matches the show: {details}.",
    "{details} doing work under the hood — this one isn't parked-only.",
    "Mods where they count: {details}.",
    "It earns the look too — {details} backing it up.",
  ],
  exhaust: ["That {engineNote} clearing its throat is worth the price of admission.", "Cold-start on that {engineNote} would wake the whole street, and we're here for it."],
  styleStance: ["Pure stance, zero excess.", "Every line points at the ground and it works."],
  stylePerformance: ["Built to be driven hard, not just photographed.", "A sleeper energy that rewards the people who know."],
  styleOem: ["OEM+ to the core — every change has to earn its place.", "Factory-correct restraint, just executed better than factory."],
  styleClean: ["No wasted details, just a B7 wearing taste well.", "Subtle, deliberate, and exactly the right amount of everything."],
  closer: [
    "This is exactly the kind of build the B7Squad lives for.",
    "Owners like this keep the whole B7 community strong.",
    "Hats off to the owner — tag a B7 fan who needs to see this.",
    "Builds like this are why we run this page.",
    "Save this one for the next person who calls the B7 dated.",
    "Drop a 🔥 if this is your kind of B7.",
  ],
  // Vision-aware pools (Phase 1) — only used when the photo was analyzed.
  sceneOpener: [
    "{descriptor} {model} catching {lighting} against {environment}.",
    "Shot in {lighting}, this {descriptor} {model} earns every frame.",
    "{environment}, {lighting}, and a {descriptor} {model} that owns the shot.",
    "{descriptor} {model} sitting in {lighting} like it was planned that way.",
  ],
  vStance: ["Sitting {stanceWord} over {wheelDesc}.", "{stanceWord} on {wheelDesc}, and the proportions are spot on.", "Tucked {stanceWord} over {wheelDesc} with the fitment dialed."],
  vStanceNoWheel: ["Sitting {stanceWord}, gaps gone, nothing overdone.", "{stanceWord} and planted — exactly the right amount."],
  vScene: ["Reflections rolling across the quarter panel in that {lighting}.", "Set against {environment}, it reads even cleaner.", "That {lighting} doing the paint every favor."],
  vBuild: ["An aggressive {buildStyle} read, executed with restraint.", "Pure {buildStyle} energy without a wasted detail.", "A {buildStyle} build that knows exactly what it is."],
  story: ["{descriptor} {model}.", "B7 {model}, done right.", "Arches full. Rake on point.", "{model} season is open.", "Ingolstadt's finest.", "{descriptor} and composed.", "Quattro and quiet confidence.", "Featured: {model}.", "The B7 still hits."],
  storyStance: ["Sitting {stanceWord}.", "{stanceWord} and clean."],
  storyLight: ["{lighting} hits different.", "Caught in {lighting}."],
  qRide: ["Air or coils on a B7 — where do you land?", "How low is too low on a {model}? Settle it below. 👇"],
  qWheels: ["What wheels would you bolt onto this {model}?", "Right wheel spec or would you change them? 👇"],
  qPower: ["OEM+ or send it — how far would you take this {model}?", "RS4 power numbers or keep it streetable? 👇"],
  qGeneric: ["Rate this {model} build, 1 to 10. 👇", "What's the first thing you'd change, if anything?", "Could you daily this in {descriptor}?", "Tag the owner this {model} reminds you of. 👇"],
};

function analyze(sub) {
  const hay = ` ${[sub.car_model, sub.mods, sub.color, sub.caption_original].join(" ").toLowerCase()} `;
  const modelHay = ` ${(sub.car_model || "").toLowerCase()} `;
  const detect = (s) => (/rs\s?4/.test(s) ? "RS4" : /\bs\s?4\b/.test(s) ? "S4" : /\ba\s?4\b/.test(s) ? "A4" : null);
  const model = detect(modelHay) || detect(hay) || "A4";
  const modelLong = sub.car_model?.trim() || `Audi ${model} B7`;
  const engine = ENGINES[model];

  let ride = null;
  if (has(hay, LEXICON.ride.air)) ride = "air";
  else if (has(hay, LEXICON.ride.coilovers)) ride = "coilovers";
  else if (has(hay, LEXICON.ride.springs)) ride = "springs";
  const slammed = has(hay, LEXICON.ride.slammed);

  const vision = readVision(sub);

  const sizes = [...(sub.mods || "").matchAll(LEXICON.wheels.sizes)].map((m) => `${m[1]}in`);
  const brand = LEXICON.wheels.brands.find((b) => hay.includes(b)) || (vision.wheels && LEXICON.wheels.brands.find((b) => vision.wheels.toLowerCase().includes(b)));
  let brandLabel = "";
  let wheels = "";
  if (brand || sizes.length) {
    brandLabel = brand ? brand.replace("ch-r", "CH-R").replace(/\brs4 reps?\b/, "RS4 reps").replace(/\b(\w)/g, (c) => c.toUpperCase()) : "";
    wheels = [sizes[0], brandLabel].filter(Boolean).join(" ").trim();
  } else if (vision.wheels) {
    wheels = vision.wheels;
    brandLabel = vision.wheels;
  }

  const powerKeys = [];
  for (const [label, kws] of Object.entries(LEXICON.power)) if (has(hay, kws)) powerKeys.push(label);
  const exhaust = powerKeys.includes("exhaust");
  const powerMap = { supercharger: "supercharged", tune: "an ECU tune", intake: "a cold-air intake", exhaust: "a full exhaust", swap: "an engine swap" };

  let style = "clean";
  if (ride === "air" || slammed) style = "stance";
  else if (powerKeys.some((p) => ["supercharger", "tune", "swap"].includes(p))) style = "performance";
  else if (/oem|stock|debadged|factory/.test(hay)) style = "oem";

  // --- Vision-derived context (Phase 1) ---
  const vs = (vision.stance || "").toLowerCase();
  let stanceWord = "";
  if (/slam|laid|floor|bag/.test(vs) || ride === "air" || slammed) stanceWord = "slammed";
  else if (/low/.test(vs) || ride === "coilovers") stanceWord = "sitting low";
  else if (/drop/.test(vs) || ride === "springs") stanceWord = "dropped just right";
  else if (/factory|stock|stand/.test(vs)) stanceWord = "at a clean factory height";
  else stanceWord = vs;

  const wheelColor = (vision.wheel_color || "").toLowerCase();
  let wheelDesc = [wheelColor, brandLabel].filter(Boolean).join(" ") || wheels;
  if (brandLabel && wheelDesc && !/s$/i.test(wheelDesc)) wheelDesc += "s";

  const styleLabel = { stance: "stance", performance: "performance", oem: "OEM+", clean: "clean OEM+" }[style];
  const buildStyle = (vision.build_style || "").replace(/build$/i, "").trim() || styleLabel;
  const visionParts = visionToParts(vision);

  return {
    user: atHandle(sub.instagram_username),
    subject: modelLong,
    descriptor: (sub.color || vision.color || "").trim() || "the right color",
    model,
    engine: engine.long,
    engineNote: engine.note,
    hasEngine: model !== "A4",
    ride,
    wheels,
    hasWheels: Boolean(wheels),
    detail: humanList(powerKeys.map((p) => powerMap[p] || p)),
    details: humanList([...powerKeys.map((p) => powerMap[p] || p), ...visionParts]),
    hasPower: powerKeys.length > 0,
    exhaust,
    style,
    // vision context
    stanceWord,
    hasStance: Boolean(stanceWord),
    wheelDesc,
    hasWheelDesc: Boolean(wheelDesc),
    lighting: vision.lighting || "",
    hasLighting: Boolean(vision.lighting),
    environment: vision.environment || "",
    hasEnvironment: Boolean(vision.environment),
    buildStyle,
    visionBodyMods: visionParts.length > 0,
  };
}

function sections(ctx) {
  const details = [];
  if (ctx.hasWheels) details.push(...POOLS.wheels);
  if (ctx.ride === "air") details.push(...POOLS.rideAir);
  else if (ctx.ride === "coilovers") details.push(...POOLS.rideCoilovers);
  else if (ctx.ride === "springs") details.push(...POOLS.rideSprings);
  if (ctx.hasPower) details.push(...POOLS.power);
  if (ctx.exhaust) details.push(...POOLS.exhaust);
  // Vision-derived detail lines (Phase 1).
  if (ctx.hasStance && ctx.hasWheelDesc) details.push(...POOLS.vStance);
  else if (ctx.hasStance) details.push(...POOLS.vStanceNoWheel);
  if (ctx.hasLighting || ctx.hasEnvironment) details.push(...POOLS.vScene);
  if (ctx.buildStyle) details.push(...POOLS.vBuild);

  // Openers: lean on the photo's scene when lighting + environment are known.
  const openers = [...(ctx.hasEngine ? [...POOLS.opener, ...POOLS.openerEngine] : POOLS.opener)];
  if (ctx.hasLighting && ctx.hasEnvironment) openers.push(...POOLS.sceneOpener, ...POOLS.sceneOpener); // weight scene openers

  const story = [...POOLS.story];
  if (ctx.hasStance) story.push(...POOLS.storyStance);
  if (ctx.hasLighting) story.push(...POOLS.storyLight);

  const style = { stance: POOLS.styleStance, performance: POOLS.stylePerformance, oem: POOLS.styleOem, clean: POOLS.styleClean }[ctx.style];
  const questions = ctx.ride ? POOLS.qRide : ctx.hasPower ? POOLS.qPower : ctx.hasWheels ? POOLS.qWheels : POOLS.qGeneric;

  return { openers, details, style, closers: POOLS.closer, story, questions };
}

function hashtags(ctx, rng) {
  const feature = [];
  if (ctx.style === "stance" || ctx.ride === "air") feature.push("#StanceNation", "#Bagged", "#Stanceworks");
  if (ctx.hasWheels) feature.push("#WheelGame", "#Fitment");
  if (ctx.hasPower) feature.push("#BoostedAudi", "#AudiPower");
  if (ctx.model === "RS4") feature.push("#RS4", "#V8Power");
  if (ctx.model === "S4") feature.push("#S4Life");
  return tags20(
    {
      core: ["#B7Squad", "#AudiB7", "#AudiA4", "#A4B7", "#B7A4"],
      priority: ["#AudiRS4", "#RS4B7", "#AudiS4", "#S4B7", "#B7RS4", "#4point2V8", ...feature],
      filler: ["#AudiGang", "#AudiLove", "#AudiNation", "#QuattroGmbH", "#Quattro", "#AudiSport", "#AudiOwnersClub", "#EuroCars", "#GermanEngineering", "#StanceAudi", "#AudiMods", "#AudiBuild", "#FourRings", "#AudiDaily"],
    },
    rng,
  );
}

export default {
  id: "b7squad",
  name: "B7Squad",
  handle: "@b7squad",
  niche: "Audi A4 B7 / RS4 / S4 community",
  multiDetail: true, // detail lines describe distinct aspects (wheels/ride/power)
  limits: DEFAULT_LIMITS,
  emoji: ["🔥", "🖤", "🏁", "🤌"],
  platformStyle: "Instagram-first (feed + stories), Facebook community secondary",
  avoid: ["#carsofinstagram spam energy", "excessive emojis", "clichés like 'whip' or 'beast mode'", "fake hype or ALL CAPS"],
  bannedPhrases: ["sitting exactly how it should", "clean b7 energy", "beast mode", "whip"],
  voiceProfile: `B7Squad voice profile:
- An Audi enthusiast who actually knows the B7 platform (8E A4, B7 S4, B7 RS4 — 2005-2008).
- Community-focused: celebrate the OWNER and the build, never brag on behalf of the brand.
- Premium but never cringe: confident, specific, a little dry.
- Reference real B7 knowledge (Quattro, the 4.2 V8 in the RS4/S4, FSI, Avant vs sedan, OEM+ restraint).`,
  fbLead: (ctx) => `Featured build — ${ctx.user}'s ${[ctx.descriptor, ctx.subject].filter((x) => x && x !== "the right color").join(" ")}.`,
  creditBlock: (sub, ctx) => `📸 Build & photo: ${ctx.user}\nFollow @b7squad for the cleanest B7s daily.\nDM or tag #B7Squad to get featured.`,
  aiContext: (sub, ctx) =>
    `- Credit (use this handle): ${ctx.user}\n- Model: ${ctx.subject} (${ctx.model}, ${ctx.engine})\n- Color: ${ctx.descriptor}\n- Wheels: ${ctx.wheelDesc || ctx.wheels || "not specified"}\n- Stance: ${ctx.stanceWord || ctx.ride || "stock"}\n- Power mods: ${ctx.details || "none"}\n- Build style: ${ctx.buildStyle}\n- VISION — lighting: ${ctx.lighting || "n/a"}; environment: ${ctx.environment || "n/a"} (weave these visual details in naturally)`,
  analyze,
  sections,
  hashtags,
};
