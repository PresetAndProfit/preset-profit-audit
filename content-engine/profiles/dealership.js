// profiles/dealership.js — Automotive dealership. Edit name/handle/hashtags.
import { makeSimpleProfile } from "./_base.js";

export default makeSimpleProfile({
  id: "dealership",
  name: "Your Dealership",
  handle: "@yourdealership",
  niche: "Automotive dealership",
  subjectFallback: "this vehicle",
  emoji: ["🚗", "🔑", "✅", "🙌"],
  bannedPhrases: ["best deal ever", "won't last long!!!"],
  voiceProfile: `Automotive dealership voice: trustworthy, helpful, and excited about the inventory without being pushy. Highlight value, condition, and key features. Always make the next step (test drive / financing) clear.`,
  fbLead: (ctx) => `Now available at our lot: ${[ctx.descriptor, ctx.subject].filter(Boolean).join(" ")}.`,
  cta: (ctx) => `Book a test drive — DM us or call today.\nFinancing & trade-ins welcome.\nVisit us to see ${ctx.subject} in person.`,
  pools: {
    opener: [
      "Just landed on the lot: {descriptor} {subject}.",
      "New arrival — this {descriptor} {subject} won't be here long.",
      "Say hello to your next car: {descriptor} {subject}.",
      "Fresh inventory: {subject} in {descriptor}, ready to roll.",
      "This {descriptor} {subject} checks every box.",
      "Shopping for {subject}? We've got a clean {descriptor} one ready.",
    ],
    details: ["Loaded with {details}.", "Highlights: {details}.", "Comes equipped with {details}.", "Standout features: {details}."],
    style: ["Inspected, detailed, and ready to drive home today.", "Clean and ready for its next owner.", "Priced to move and built to last."],
    closer: [
      "Book your test drive — DM us or call today.",
      "Financing options available. Stop by {brand} this week.",
      "Trade-ins welcome — let's get you behind the wheel.",
      "Message us to lock it in before it's gone.",
    ],
    story: ["Just arrived 🚗", "New on the lot", "{subject} available now", "Your next ride?", "Test drive today"],
    questions: ["Would this be your daily? 👇", "What's your must-have feature in a {subject}?", "Tag someone car shopping right now. 👇", "Finance or trade-in — how do you buy? 👇"],
  },
  tags: {
    core: ["#YourDealership"],
    priority: ["#CarsForSale", "#NewArrival", "#CarDealership", "#TestDrive", "#Financing"],
    filler: ["#UsedCars", "#CarShopping", "#AutoSales", "#CarsOfInstagram", "#DreamCar", "#CarBuying", "#CarDealer", "#DriveHome", "#CertifiedPreOwned", "#CarLife", "#CarOfTheDay", "#ForSale", "#CarGoals", "#NewWheels"],
  },
});
