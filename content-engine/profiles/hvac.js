// profiles/hvac.js — HVAC company. Edit name/handle/hashtags.
import { makeSimpleProfile, DEFAULT_LIMITS } from "./_base.js";

export default makeSimpleProfile({
  id: "hvac",
  name: "Your HVAC Co",
  handle: "@yourhvac",
  niche: "HVAC company",
  subjectFallback: "this install",
  emoji: ["❄️", "🔧", "🌡️", "✅"],
  limits: { ...DEFAULT_LIMITS, facebook: 360 }, // FB-heavy local audience
  platformStyle: "Facebook-first local reach; Instagram secondary",
  voiceProfile: `HVAC voice: trustworthy local expert. Emphasize comfort, reliability, energy savings, and clean professional work. Reassuring and clear — never gimmicky.`,
  fbLead: (ctx) => `Job done right: ${[ctx.descriptor, ctx.subject].filter(Boolean).join(" ")}.`,
  cta: (ctx) => `Free estimates — call or DM today.\nSame-week scheduling available.\nKeep your home comfortable year-round with ${ctx.subject ? "us" : "our team"}.`,
  pools: {
    opener: [
      "Another comfortable home: {subject} complete.",
      "Clean install, cooler summers — {subject}.",
      "Done right the first time: {subject}.",
      "Comfort restored. {subject} wrapped up today.",
      "Quality work you won't have to think about: {subject}.",
    ],
    details: ["Scope of work: {details}.", "Today's job included {details}.", "We handled {details}."],
    style: ["Tidy lines, proper airflow, zero shortcuts.", "Energy-efficient and built to last.", "Left the space cleaner than we found it."],
    closer: [
      "Free estimates — call or DM today.",
      "Same-week scheduling available. Message us.",
      "Tag a neighbor who needs their system checked. 👇",
      "Stay comfortable year-round with {brand}.",
    ],
    story: ["Install complete ❄️", "Comfort restored", "Free estimates", "Booked this week", "Job done right"],
    questions: ["Heat pump or furnace — what's in your home? 👇", "When did you last service your AC?", "Tag someone whose system is struggling. 👇", "Too hot or too cold at home? Let's fix it."],
  },
  tags: {
    core: ["#YourHVAC"],
    priority: ["#HVAC", "#HVACLife", "#AirConditioning", "#Heating", "#HomeComfort"],
    filler: ["#HVACContractor", "#Furnace", "#HeatPump", "#ACRepair", "#IndoorAirQuality", "#HVACInstall", "#EnergyEfficiency", "#LocalBusiness", "#HomeServices", "#Cooling", "#HVACtech", "#Comfort", "#HVACpros", "#Ductwork"],
  },
});
