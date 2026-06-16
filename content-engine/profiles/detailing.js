// profiles/detailing.js — Auto detailing shop. Edit name/handle/hashtags.
import { makeSimpleProfile } from "./_base.js";

export default makeSimpleProfile({
  id: "detailing",
  name: "Your Detail Shop",
  handle: "@yourdetailshop",
  niche: "Auto detailing shop",
  subjectFallback: "this car",
  emoji: ["✨", "🧼", "💧", "🔥"],
  voiceProfile: `Auto detailing voice: proud craftsperson energy. Show the transformation, name the services, and convey care and protection. Satisfying, clean, results-driven — never salesy spam.`,
  fbLead: (ctx) => `Fresh out of the bay: ${[ctx.descriptor, ctx.subject].filter(Boolean).join(" ")}, fully detailed.`,
  cta: (ctx) => `Book your detail — slots fill fast.\nDM to reserve your spot.\nCeramic & paint correction packages available.`,
  pools: {
    opener: [
      "Before and after speaks for itself — {descriptor} {subject}, fully detailed.",
      "Paint correction complete on this {descriptor} {subject}.",
      "Came in tired, left showroom-fresh: {descriptor} {subject}.",
      "Gloss for days. {subject} after a full detail.",
      "Another one out the door looking better than new: {descriptor} {subject}.",
    ],
    details: ["Services done: {details}.", "We handled {details}.", "On the menu for this one: {details}.", "Included in this detail: {details}."],
    style: ["Swirl-free, sealed, and protected.", "Deep gloss you can see your reflection in.", "Every panel decontaminated and refined."],
    closer: [
      "Book your detail — slots fill fast. DM to reserve.",
      "Treat your car to the same. Link in bio to book.",
      "Ceramic coating packages available — message us for a quote.",
      "Your car deserves this. Tap to book {brand}.",
    ],
    story: ["Freshly detailed ✨", "Paint correction done", "Gloss restored", "Booked out this week", "Before → after"],
    questions: ["Coating or wax — what's your pick? 👇", "How often do you detail your ride?", "Tag someone whose car needs this. 👇", "Rate this finish, 1 to 10."],
  },
  tags: {
    core: ["#YourDetailShop"],
    priority: ["#AutoDetailing", "#PaintCorrection", "#CeramicCoating", "#CarDetailing", "#DetailingWorld"],
    filler: ["#CarCare", "#Detailer", "#MobileDetailing", "#CarWash", "#Gloss", "#ShowroomShine", "#CarsOfInstagram", "#DetailAddicts", "#ProDetailing", "#AutoSpa", "#SwirlFree", "#CleanCar", "#CarLife", "#DetailingLife"],
  },
});
