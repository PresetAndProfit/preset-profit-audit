// profiles/restaurant.js — Restaurant. Edit name/handle/hashtags.
import { makeSimpleProfile } from "./_base.js";

export default makeSimpleProfile({
  id: "restaurant",
  name: "Your Restaurant",
  handle: "@yourrestaurant",
  niche: "Restaurant",
  subjectFallback: "today's special",
  emoji: ["🍽️", "😋", "🔥", "✨"],
  voiceProfile: `Restaurant voice: mouth-watering, warm, and inviting. Make the food the star, evoke flavor and freshness, and welcome people in. Appetizing and genuine — never spammy.`,
  fbLead: (ctx) => `On the menu: ${[ctx.descriptor, ctx.subject].filter(Boolean).join(" ")}.`,
  cta: (ctx) => `Reserve your table — link in bio.\nDine in or order online tonight.\nCome taste ${ctx.subject} this week.`,
  pools: {
    opener: [
      "Today's reason to come in: {subject}.",
      "Fresh out of the kitchen — {subject}.",
      "{descriptor} and unforgettable: our {subject}.",
      "This is the {subject} everyone's been asking about.",
      "Hungry yet? Meet the {subject}.",
      "New on the menu: {subject}.",
    ],
    details: ["Made with {details}.", "Layered with {details}.", "Served with {details}.", "Built on {details}."],
    style: ["Made fresh, made to order.", "The kind of plate you photograph before the first bite.", "Comfort and craft on one plate."],
    closer: [
      "Reserve your table — link in bio.",
      "Dine in or order online tonight. DM to book.",
      "Swing by {brand} this week before it's gone.",
      "Tag your dinner date. 👇",
    ],
    story: ["On the menu 🍽️", "Fresh today", "{subject} 😋", "Book a table", "Order tonight"],
    questions: ["Who are you bringing to try this? 👇", "Rate this plate, 1 to 10.", "Dine in or takeout? 👇", "What should we feature next?"],
  },
  tags: {
    core: ["#YourRestaurant"],
    priority: ["#Foodie", "#FoodPorn", "#EatLocal", "#OnTheMenu", "#FreshFood"],
    filler: ["#InstaFood", "#FoodStagram", "#Delicious", "#Yum", "#FoodLover", "#DinnerTime", "#ChefLife", "#LocalEats", "#FoodPhotography", "#SupportLocal", "#Brunch", "#FoodGram", "#NomNom", "#TastyTuesday"],
  },
});
