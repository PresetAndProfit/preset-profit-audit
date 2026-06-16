// profiles/photographer.js — Photographer. Edit name/handle/hashtags.
// Uses vision lighting/environment when available (Phase 1).
import { makeSimpleProfile, DEFAULT_LIMITS } from "./_base.js";

export default makeSimpleProfile({
  id: "photographer",
  name: "Your Studio",
  handle: "@yourphotographer",
  niche: "Photographer",
  subjectFallback: "this frame",
  emoji: ["📷", "✨", "🎞️", "🌅"],
  limits: { ...DEFAULT_LIMITS, instagram: 240 },
  platformStyle: "Instagram grid-first; carousel-friendly, portfolio tone",
  voiceProfile: `Photographer voice: artful and observational. Talk light, mood, composition, and the story in the frame. Confident and tasteful — let the image lead, keep it humble.`,
  fbLead: (ctx) => `New work: ${[ctx.descriptor, ctx.subject].filter(Boolean).join(" ")}.`,
  cta: (ctx) => `Booking sessions now — DM to inquire.\nPrints & full galleries available.\nTap the link to see more from ${ctx.subject}.`,
  pools: {
    opener: [
      "Chasing light again — {subject}.",
      "Some frames just hold still. {subject}.",
      "{subject}, exactly as the moment looked.",
      "A quiet one from the latest set: {subject}.",
      "Composition first, everything else follows — {subject}.",
    ],
    details: ["Details that made it: {details}.", "What pulled the frame together: {details}.", "Featuring {details}."],
    // vision-aware lines, included only when detected
    lighting: ["Shot in {lighting}, and it carries the whole frame.", "That {lighting} did most of the work here.", "All about the {lighting} on this one."],
    environment: ["Set against {environment}.", "{environment} gave it the depth.", "Framed by {environment}."],
    style: ["Mood over everything.", "Negative space doing the talking.", "Patience for the right light pays off."],
    closer: [
      "Booking sessions now — DM to inquire.",
      "Prints available — link in bio.",
      "Tag someone who'd love this frame. 👇",
      "More from this set on {brand}'s feed.",
    ],
    story: ["New work 📷", "From the latest set", "Chasing light", "Booking now", "Frame of the day"],
    questions: ["Which edit hits harder — warm or cool? 👇", "What would you title this frame?", "Save this for inspiration? 👇", "Golden hour or blue hour — your pick?"],
  },
  tags: {
    core: ["#YourStudio"],
    priority: ["#Photography", "#PortraitPhotography", "#NaturalLight", "#PhotoOfTheDay", "#Photographer"],
    filler: ["#Portrait", "#PhotographyLovers", "#GoldenHour", "#MoodyGrams", "#FilmLook", "#ShotOnLocation", "#VisualsCollective", "#CreativePortraits", "#LightAndShadow", "#PhotoArt", "#StorytellingPhotography", "#FrameOfMind", "#PhotographySoul", "#BehindTheLens"],
  },
});
