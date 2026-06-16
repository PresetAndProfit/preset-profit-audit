// profiles/realestate.js — Real estate agent. Edit name/handle/hashtags.
import { makeSimpleProfile } from "./_base.js";

export default makeSimpleProfile({
  id: "realestate",
  name: "Your Realty",
  handle: "@youragent",
  niche: "Real estate agent",
  subjectFallback: "this home",
  emoji: ["🏡", "🔑", "🌿", "✨"],
  bannedPhrases: ["dream home of a lifetime", "must see!!!"],
  voiceProfile: `Real estate voice: warm, aspirational, and trustworthy. Paint the lifestyle, name the standout features, and respect the buyer. Confident and polished — never hypey or salesy.`,
  fbLead: (ctx) => `Just listed: ${[ctx.subject, ctx.descriptor && `in ${ctx.descriptor}`].filter(Boolean).join(" ")}.`,
  cta: (ctx) => `Schedule your private showing — DM or call today.\nAsk us about financing and next steps.\nTap the link to book a tour of ${ctx.subject}.`,
  pools: {
    opener: [
      "Just listed: {subject} in {descriptor}.",
      "New on the market — {subject}, and it shows beautifully.",
      "Welcome home. This {subject} in {descriptor} is ready for its next chapter.",
      "Open house this weekend: {subject}.",
      "Say hello to {subject} — the one you've been waiting for.",
      "The search might end here: {subject} in {descriptor}.",
    ],
    details: ["Featuring {details}.", "Highlights include {details}.", "Inside you'll find {details}.", "Step in to {details}."],
    style: ["Move-in ready and full of natural light.", "Location, layout, and lifestyle — it has all three.", "Thoughtfully updated and ready to enjoy."],
    closer: [
      "Schedule your private showing — DM or call today.",
      "Serious about this one? Let's talk timing and financing.",
      "Tap the link to book a tour with {brand}.",
      "Tag someone house-hunting in the area. 👇",
    ],
    story: ["Just listed 🏡", "Open house Sat", "{subject} available", "Your next home?", "Book a tour"],
    questions: ["Could you see yourself here? 👇", "What's your #1 must-have in a home?", "Tag someone house-hunting. 👇", "Move-in ready or fixer-upper — which do you prefer?"],
  },
  tags: {
    core: ["#YourRealty"],
    priority: ["#JustListed", "#RealEstate", "#ForSale", "#OpenHouse", "#DreamHome"],
    filler: ["#HomeForSale", "#Realtor", "#NewListing", "#HouseHunting", "#HomeSweetHome", "#PropertyForSale", "#RealEstateAgent", "#HomeGoals", "#MovingDay", "#FirstTimeHomeBuyer", "#LuxuryHomes", "#HomeTour", "#RealEstateLife", "#HouseGoals"],
  },
});
