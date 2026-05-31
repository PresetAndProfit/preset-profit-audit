// src/lib/industryProfiles.js — business ARCHETYPES.
//
// Archetypes drive VOCABULARY and RECOMMENDATION SHAPE only — the actual
// findings are derived from the scraped website (see api/_lib/aiFindings.js).
// This file is the single place that knows a restaurant takes "reservations"
// and "online orders" while a plumber takes "quote requests" and "emergency
// calls". It is consumed by:
//   • the LLM prompt (injected so the consultant uses the right words), and
//   • the deterministic fallback engine (auditEngine.js) when the LLM/scrape
//     is unavailable, and
//   • the validation guardrails (forbidden terms per archetype).
//
// Every INDUSTRY from src/lib/constants.js maps to exactly one archetype below.

export const ARCHETYPES = {
  appointment_services: {
    id: "appointment_services",
    label: "Appointment-based service business",
    customerNoun: "client",
    conversionActions: ["book an appointment", "schedule a visit", "request a callback"],
    channels: [
      "online booking / scheduling",
      "tap-to-call from mobile",
      "Google Business Profile + reviews",
      "automated appointment reminders",
    ],
    // Topics a credible audit of this business SHOULD address when relevant.
    mustMention: ["online booking", "appointment reminders", "reviews", "mobile call button", "service pages"],
    // Vocabulary that is WRONG for this archetype and should never appear.
    forbidden: ["menu", "online ordering", "reservations", "add to cart", "checkout", "shipping"],
  },
  quote_trades: {
    id: "quote_trades",
    label: "Quote-based trade / home-services business",
    customerNoun: "customer",
    conversionActions: ["request a free quote", "book a service call", "get an estimate"],
    channels: [
      "quote / estimate request form",
      "emergency tap-to-call",
      "Google Local Services Ads + reviews",
      "service-area pages",
      "financing options",
    ],
    mustMention: ["quote / estimate requests", "emergency call button", "service areas", "reviews", "financing"],
    forbidden: ["menu", "online ordering", "reservations", "add to cart", "checkout"],
  },
  hospitality: {
    id: "hospitality",
    label: "Restaurant / hospitality business",
    customerNoun: "guest",
    conversionActions: ["make a reservation", "order online", "view the menu"],
    channels: [
      "online menu",
      "reservations (OpenTable/Resy) or waitlist",
      "online ordering / delivery (Toast, DoorDash, Uber Eats)",
      "Google & Yelp reviews",
      "hours, location & directions",
    ],
    mustMention: ["menu", "reservations or online ordering", "delivery / takeout", "reviews", "hours & location"],
    // A restaurant must NOT be told to offer a "free consultation/quote/estimate"
    // or "book an appointment" — unless it genuinely sells catering/events
    // (detected from the site, handled in validation).
    forbidden: ["free consultation", "free quote", "free estimate", "book an appointment", "service call"],
  },
  retail_ecommerce: {
    id: "retail_ecommerce",
    label: "Retail / e-commerce business",
    customerNoun: "shopper",
    conversionActions: ["shop the products", "add to cart and check out", "visit the store"],
    channels: [
      "product pages with clear pricing",
      "frictionless checkout",
      "abandoned-cart email/SMS recovery",
      "trust badges, shipping & returns policy",
      "product reviews",
    ],
    mustMention: ["products", "checkout friction", "abandoned cart", "shipping & returns", "trust badges"],
    forbidden: ["book an appointment", "free consultation", "reservations", "no-show"],
  },
  high_ticket_advisory: {
    id: "high_ticket_advisory",
    label: "High-ticket advisory / consideration-led business",
    customerNoun: "client",
    conversionActions: ["book a consultation", "schedule a tour", "request information"],
    channels: [
      "consultation / tour booking",
      "lead capture + long-term nurture",
      "case studies & testimonials",
      "tap-to-call",
      "Google reviews",
    ],
    mustMention: ["consultation / tour booking", "lead capture", "nurture follow-up", "testimonials", "reviews"],
    forbidden: ["menu", "online ordering", "add to cart", "checkout"],
  },
};

// INDUSTRY (from constants.js) → archetype id. Keep keys in sync with INDUSTRIES.
export const INDUSTRY_ARCHETYPE = {
  Dental: "appointment_services",
  Chiropractic: "appointment_services",
  "Med Spa": "appointment_services",
  Healthcare: "appointment_services",
  Barbershop: "appointment_services",
  "Beauty & Salon": "appointment_services",
  Fitness: "appointment_services",
  Plumbing: "quote_trades",
  Roofing: "quote_trades",
  HVAC: "quote_trades",
  Electrician: "quote_trades",
  "Home Services": "quote_trades",
  Restaurant: "hospitality",
  Retail: "retail_ecommerce",
  Automotive: "retail_ecommerce",
  Legal: "high_ticket_advisory",
  "Real Estate": "high_ticket_advisory",
  Finance: "high_ticket_advisory",
  Education: "high_ticket_advisory",
  Childcare: "high_ticket_advisory",
};

export const ARCHETYPE_IDS = Object.keys(ARCHETYPES);

// Resolve an archetype from an industry label, defaulting sensibly.
export function archetypeForIndustry(industry) {
  const id = INDUSTRY_ARCHETYPE[industry] || "appointment_services";
  return ARCHETYPES[id];
}

export function getArchetype(id) {
  return ARCHETYPES[id] || ARCHETYPES.appointment_services;
}
