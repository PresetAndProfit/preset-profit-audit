// profiles/barbershop.js — Barber shop. Edit name/handle/hashtags.
import { makeSimpleProfile, DEFAULT_LIMITS } from "./_base.js";

export default makeSimpleProfile({
  id: "barbershop",
  name: "Your Barbershop",
  handle: "@yourbarbershop",
  niche: "Barber shop",
  subjectFallback: "this cut",
  emoji: ["💈", "✂️", "🔥", "🙌"],
  limits: { ...DEFAULT_LIMITS, instagram: 180 }, // tighter, punchy captions
  platformStyle: "Instagram Reels + Stories first; quick, high-energy",
  voiceProfile: `Barbershop voice: confident neighborhood craftsperson. Hype the cut and the client without arrogance. Talk fades, lineups, and clean finishes. Energetic but never corny.`,
  fbLead: (ctx) => `Fresh in the chair: ${[ctx.descriptor, ctx.subject].filter(Boolean).join(" ")}.`,
  cta: (ctx) => `Book your chair — link in bio.\nWalk-ins welcome when slots open.\nDM to lock your spot this week.`,
  pools: {
    opener: [
      "Crisp lineup, clean finish — {subject} done right.",
      "This {subject} speaks for itself.",
      "Sharp from every angle: {subject}.",
      "Walked in, leveled up — {subject}.",
      "Detail work you can see up close: {subject}.",
      "Fresh fade, sharper confidence. {subject}.",
    ],
    details: ["Dialed in: {details}.", "The work: {details}.", "Finished with {details}."],
    style: ["Skin-tight fade, knife-sharp line.", "Clean enough to skip the mirror check.", "Texture on top, precision on the sides."],
    closer: [
      "Book your chair — link in bio.",
      "Walk-ins welcome, but appointments move faster. DM us.",
      "Tag someone who's overdue for a cut. 👇",
      "Come see {brand} — first cut, you'll be back.",
    ],
    story: ["Fresh fade 💈", "Booked solid", "Walk-ins open", "Lineup on point", "Next level"],
    questions: ["Fade or scissor cut — what's your go-to? 👇", "Rate this lineup, 1 to 10.", "Tag your barber-needing friend. 👇", "Who's due for a fresh one this week?"],
  },
  tags: {
    core: ["#YourBarbershop"],
    priority: ["#Barber", "#Fade", "#Barbershop", "#FreshCut", "#BarberLife"],
    filler: ["#Haircut", "#MensGrooming", "#BarberShopConnect", "#Lineup", "#SkinFade", "#BarberLove", "#Grooming", "#FreshFade", "#BarbersInc", "#CleanCut", "#MensHair", "#BarberGang", "#Taper", "#BarberNation"],
  },
});
