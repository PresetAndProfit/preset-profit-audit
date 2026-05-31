// ─────────────────────────────────────────────────────────────────────────────
// siteAnalyzer.js
// Turns a real, fetched homepage into EVIDENCE. Every finding it produces is
// backed by something actually observed in the HTML. If we can't observe it,
// we don't claim it. No static checklists, no fabricated competitor data.
//
//   analyzeHtml(html, meta)  -> { ok, signals, findings }   (pure, sync)
//   scanSite(rawUrl)         -> { ok, ... }                 (async, server-only)
//
// analyzeHtml is pure (string/regex only) so it runs anywhere and is testable.
// scanSite performs the network fetch and is only ever called server-side
// (the browser cannot fetch third-party sites — CORS).
// ─────────────────────────────────────────────────────────────────────────────

// ── tiny extraction helpers ──────────────────────────────────────────────────
const firstMatch = (re, s, group = 1) => {
  const m = re.exec(s);
  return m ? (m[group] || "").trim() : null;
};
const countMatches = (re, s) => {
  const m = s.match(re);
  return m ? m.length : 0;
};
const decode = (s = "") =>
  s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
   .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&nbsp;/g, " ").trim();

// Strip tags to approximate the visible text of the page.
function visibleText(html) {
  return decode(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
  );
}

// Collect the text of every <a> and <button> — the page's calls-to-action.
function extractClickables(html) {
  const out = [];
  const re = /<(?:a|button)\b[^>]*>([\s\S]*?)<\/(?:a|button)>/gi;
  let m;
  while ((m = re.exec(html)) && out.length < 400) {
    const t = decode(m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));
    if (t && t.length <= 60) out.push(t);
  }
  return out;
}

// ── the analyzer ─────────────────────────────────────────────────────────────
export function analyzeHtml(html, meta = {}) {
  if (!html || typeof html !== "string") {
    return { ok: false, error: "empty document", signals: {}, findings: [] };
  }

  const lower = html.toLowerCase();
  const text = visibleText(html);
  const clickables = extractClickables(html);
  const bytes = meta.bytes ?? html.length;
  const secure = meta.secure !== false; // default optimistic only if unknown

  // ── raw observations ────────────────────────────────────────────────────────
  const title = decode(firstMatch(/<title[^>]*>([\s\S]*?)<\/title>/i, html) || "");
  const ogSiteName = firstMatch(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i, html);
  const metaDesc = firstMatch(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i, html)
                || firstMatch(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i, html);
  const h1 = decode((firstMatch(/<h1[^>]*>([\s\S]*?)<\/h1>/i, html) || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));
  const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(html);

  const telLinks = (html.match(/href=["']tel:([^"']+)["']/gi) || [])
    .map(s => firstMatch(/tel:([^"']+)/i, s)).filter(Boolean);
  const mailtoLinks = (html.match(/href=["']mailto:([^"']+)["']/gi) || [])
    .map(s => firstMatch(/mailto:([^"']+)/i, s)).filter(Boolean);
  // Require a real phone shape (NANP 3-3-4, optional country/area parens) so we
  // don't false-match years, version numbers, or prices.
  const phoneTextMatch = text.match(/(\+?1[\s.\-]?)?\(?\d{3}\)?[\s.\-]\d{3}[\s.\-]\d{4}\b/);
  const hasForm = /<form[\s\S]*?<\/form>/i.test(html) || /<input[^>]+type=["'](?:email|tel|text)["']/i.test(html);

  // booking providers / intent
  const bookingProviders = [
    ["Calendly", /calendly\.com/i], ["Acuity", /acuityscheduling\.com|squarespace-scheduling/i],
    ["Square Appointments", /squareup\.com\/appointments|book\.squareup/i], ["Booksy", /booksy\.com/i],
    ["Vagaro", /vagaro\.com/i], ["Mindbody", /mindbody(online)?\.(io|com)/i],
    ["Setmore", /setmore\.com/i], ["Schedulicity", /schedulicity\.com/i],
    ["Jane", /jane\.app|janeapp\.com/i], ["OpenTable", /opentable\.com/i],
    ["Resy", /resy\.com/i], ["Housecall Pro", /housecallpro\.com/i],
  ].find(([, re]) => re.test(html));
  const bookingKeyword = /\b(book\s?(now|online|appointment|a\s?(table|room|call))|schedule\s?(online|now|a\s?(call|consultation)|your)|reserve\s?(online|now|a\s?table))\b/i.test(text)
    || clickables.some(c => /\b(book|schedule|reserve)\b/i.test(c));

  // reviews / ratings
  const aggRating = firstMatch(/"aggregateRating"[\s\S]{0,200}?"ratingValue"\s*:\s*"?([\d.]+)"?/i, html);
  const aggCount = firstMatch(/"aggregateRating"[\s\S]{0,300}?"(?:reviewCount|ratingCount)"\s*:\s*"?(\d+)"?/i, html);
  const reviewWidget = [
    ["Google reviews", /google.{0,15}review|reviewsonmywebsite|elfsight.*review/i],
    ["Yelp", /yelp\.com\/biz|yelp.{0,10}widget/i],
    ["Trustpilot", /trustpilot\.com|trustbox/i],
    ["Birdeye", /birdeye\.com/i],
  ].find(([, re]) => re.test(html));

  // live chat widgets
  const chatWidget = [
    ["Intercom", /intercom\.io|intercomcdn/i], ["Tawk.to", /tawk\.to/i],
    ["Drift", /drift\.com|driftt\.com/i], ["Tidio", /tidio\.co/i],
    ["Crisp", /crisp\.chat/i], ["LiveChat", /livechatinc\.com|livechat\.com/i],
    ["HubSpot Chat", /js\.hs-scripts\.com|hubspot.*conversations/i],
    ["Facebook Messenger", /facebook.*customerchat|fb-customerchat/i],
    ["Zendesk", /zopim|zendesk.*widget|static\.zdassets/i],
  ].find(([, re]) => re.test(html));

  const scriptCount = countMatches(/<script\b/gi, html);
  const imgCount = countMatches(/<img\b/gi, html);

  // detected business name (best effort, for the "we read your site" confirmation)
  const detectedName = ogSiteName
    || (title ? decode(title.split(/[|\-–—·•]/)[0]) : null);

  // candidate services from nav + sub-headings
  const headingTexts = (html.match(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi) || [])
    .map(s => decode(s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")))
    .filter(t => t && t.length >= 3 && t.length <= 40);
  const services = [...new Set(headingTexts)].slice(0, 6);

  // ── richer commerce/hospitality/contact signals (evidence for classification
  //    and for industry-specific findings) ──────────────────────────────────
  // Online ordering / delivery platforms (restaurant + retail).
  const orderingProvider = [
    ["Toast", /toasttab\.com|toastted/i], ["Square Online", /square\.online|squareup\.com\/(store|online)/i],
    ["ChowNow", /chownow\.com/i], ["Olo", /olo\.com/i], ["Slice", /slicelife\.com/i],
    ["DoorDash", /doordash\.com/i], ["Uber Eats", /ubereats\.com/i], ["Grubhub", /grubhub\.com/i],
    ["Clover", /clover\.com\/online-ordering/i],
  ].find(([, re]) => re.test(html));
  // Reservation/waitlist platforms (hospitality).
  const reservationProvider = [
    ["OpenTable", /opentable\.com/i], ["Resy", /resy\.com/i], ["Yelp Reservations", /yelp\.com\/reservations/i],
    ["Tock", /exploretock\.com/i], ["SevenRooms", /sevenrooms\.com/i], ["Waitlist", /waitlist|join the line/i],
  ].find(([, re]) => re.test(html));
  // E-commerce platforms / cart.
  const ecommercePlatform = [
    ["Shopify", /cdn\.shopify\.com|myshopify\.com/i], ["WooCommerce", /woocommerce/i],
    ["BigCommerce", /bigcommerce\.com/i], ["Squarespace Commerce", /squarespace.*commerce/i],
    ["Wix Stores", /wixstores|ecom\.wix/i],
  ].find(([, re]) => re.test(html));
  const hasCart = ecommercePlatform != null
    || /add to cart|add to bag|view cart|checkout|shopping cart/i.test(text)
    || clickables.some(c => /\b(add to (cart|bag)|checkout|shop now|buy now)\b/i.test(c));
  // Menu (hospitality) — a link or nav item to a menu, or a menu heading.
  const hasMenu = /href=["'][^"']*menu[^"']*["']/i.test(html)
    || clickables.some(c => /\b(view|see|our)?\s*menu\b/i.test(c))
    || /\bour menu\b|\bdinner menu\b|\blunch menu\b|\bfood menu\b/i.test(text);
  // Catering / events / private dining — the ONE case where a restaurant
  // legitimately has a "consultation"/quote-style conversion path.
  const hasCateringEvents = /\b(catering|private dining|private events?|event space|book(ing)? (an )?event|host your)\b/i.test(text);
  // Visible pricing (prices on the page, or a pricing/menu price pattern).
  const priceMatches = (text.match(/\$\s?\d{1,5}(?:[.,]\d{2})?/g) || []).length;
  const pricingVisible = priceMatches >= 3 || /\bpricing\b|\bprice list\b|\brates?\b/i.test(text);
  // Opening hours.
  const hasHours = /\b(mon|tue|wed|thu|fri|sat|sun)(day)?\b[\s\S]{0,40}?\d{1,2}\s?(am|pm|:\d{2})/i.test(text)
    || /\b(hours|open(ing)? hours|hours of operation)\b/i.test(text);
  // Physical address / service location (schema PostalAddress or a street line).
  const hasAddress = /"@type"\s*:\s*"PostalAddress"/i.test(html)
    || /\b\d{1,6}\s+[A-Za-z0-9.\s]{3,40}\b(st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|way|suite|ste)\b/i.test(text);
  // Social profiles.
  const social = [
    ["Instagram", /instagram\.com\//i], ["Facebook", /facebook\.com\//i],
    ["TikTok", /tiktok\.com\//i], ["Yelp", /yelp\.com\/biz/i], ["YouTube", /youtube\.com\/(c|channel|@)/i],
  ].filter(([, re]) => re.test(html)).map(([n]) => n);
  // The most prominent action words actually present on the page (deduped).
  const ctaTexts = [...new Set(clickables
    .filter(c => c.length >= 2 && c.length <= 32 && /[a-z]/i.test(c))
    .map(c => c.trim()))].slice(0, 20);

  const signals = {
    requestedUrl: meta.requestedUrl || null,
    finalUrl: meta.finalUrl || meta.requestedUrl || null,
    fetchMs: meta.fetchMs ?? null,
    httpStatus: meta.httpStatus ?? null,
    secure,
    detectedName,
    title: title || null,
    metaDescription: metaDesc || null,
    h1: h1 || null,
    hasViewport,
    phone: telLinks[0] || (phoneTextMatch ? phoneTextMatch[0].trim() : null),
    phoneClickable: telLinks.length > 0,
    email: mailtoLinks[0] || null,
    hasForm,
    booking: bookingProviders ? bookingProviders[0] : (bookingKeyword ? "booking link" : null),
    rating: aggRating ? Number(aggRating) : null,
    reviewCount: aggCount ? Number(aggCount) : null,
    reviewWidget: reviewWidget ? reviewWidget[0] : null,
    chat: chatWidget ? chatWidget[0] : null,
    scriptCount,
    imgCount,
    bytes,
    services,
    // commerce / hospitality / contact evidence (for classification + findings)
    ordering: orderingProvider ? orderingProvider[0] : null,
    reservation: reservationProvider ? reservationProvider[0] : null,
    ecommercePlatform: ecommercePlatform ? ecommercePlatform[0] : null,
    hasCart,
    hasMenu,
    hasCateringEvents,
    pricingVisible,
    priceCount: priceMatches,
    hasHours,
    hasAddress,
    social,
    ctaTexts,
  };

  // ── evidence findings ─────────────────────────────────────────────────────
  const findings = [];
  let n = 0;
  const add = (area, status, f) => findings.push({ id: `f${++n}`, area, status, ...f });

  // SECURITY
  if (!secure) {
    add("website", "bad", {
      label: "Your site isn't served securely (no HTTPS)",
      what: "The homepage loads over an insecure http:// connection.",
      why: "Browsers stamp insecure sites with a “Not secure” warning, and Google ranks them lower. Many visitors leave the moment they see it.",
      proof: `We loaded ${signals.finalUrl} and the connection stayed on http:// — it never redirected to a secure https:// address.`,
      fix: "Install a free SSL certificate (most hosts offer one in one click) and force all traffic to https://.",
      impact: "Removes the browser warning that turns away first-time visitors before they read a word.",
    });
  } else {
    add("website", "good", {
      label: "Your site loads over a secure connection",
      what: "The homepage is served securely over HTTPS.",
      why: "Visitors and Google both treat HTTPS as a baseline trust signal.",
      proof: `${signals.finalUrl} responded over a valid https:// connection (status ${signals.httpStatus ?? "200"}).`,
      fix: "Nothing needed — keep the certificate from expiring.",
      impact: "No “Not secure” warning scaring off visitors.",
    });
  }

  // MOBILE VIEWPORT
  if (!hasViewport) {
    add("website", "bad", {
      label: "Your site isn't set up for mobile screens",
      what: "There's no mobile viewport configured, so phones render a shrunken desktop layout.",
      why: "The majority of local searches happen on a phone. Without a viewport tag, text is tiny and buttons are unusable, and most people leave.",
      proof: 'We scanned your page\'s <head> and found no <meta name="viewport"> tag.',
      fix: 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> and use a responsive theme.',
      impact: "Makes the site usable for the phone visitors who make up most local traffic.",
    });
  } else {
    add("website", "good", {
      label: "Your site is built for phones",
      what: "The page declares a responsive mobile viewport.",
      why: "Most local customers visit on a phone — this is what lets the layout adapt.",
      proof: "We found a responsive viewport meta tag in your page's <head>.",
      fix: "Nothing needed here.",
      impact: "The layout adapts properly to the phones most visitors use.",
    });
  }

  // META DESCRIPTION (search appearance)
  if (!metaDesc) {
    add("website", "warn", {
      label: "Your pages show no description in Google results",
      what: "The homepage has no meta description.",
      why: "Google prints the meta description under your link in search results. With none, it shows random scraped text — or nothing — and people skip your result for one that reads cleanly.",
      proof: 'No <meta name="description"> tag was present in the HTML we fetched.',
      fix: "Add a 150–160 character description summarising what you do and the area you serve.",
      impact: "A clear search snippet typically lifts click-through from Google by 5–10%.",
    });
  } else {
    add("website", "good", {
      label: "Your Google search snippet is set up",
      what: "The homepage has a meta description that controls how it looks in search.",
      why: "This is the sentence people read under your link before deciding to click.",
      proof: `Found this description in your HTML: “${metaDesc.slice(0, 140)}${metaDesc.length > 140 ? "…" : ""}”`,
      fix: "Keep it under ~160 characters and lead with what you do + where.",
      impact: "Controls the first impression in Google search results.",
    });
  }

  // TAP-TO-CALL
  if (telLinks.length) {
    add("leads", "good", {
      label: "Customers can tap to call you",
      what: "Your phone number is a tap-to-call link.",
      why: "On a phone, one tap dials you — zero friction for someone ready to call.",
      proof: `Found a tap-to-call link on the page: tel:${telLinks[0]}.`,
      fix: "Nothing needed — make sure it's near the top on mobile too.",
      impact: "Captures ready-to-buy callers the instant they decide.",
    });
  } else if (phoneTextMatch) {
    add("leads", "warn", {
      label: "Your phone number isn't tap-to-callable",
      what: "A phone number appears as plain text, not a clickable link.",
      why: "On a phone, a number that isn't a link forces people to memorise or copy it by hand. A meaningful share give up instead.",
      proof: `We found a phone number in your page text (“${phoneTextMatch[0].trim()}”) but it isn't wrapped in a clickable tel: link.`,
      fix: 'Wrap the number in <a href="tel:+1XXXXXXXXXX"> so one tap dials it.',
      impact: "Tap-to-call removes friction for the most ready-to-buy visitors.",
    });
  } else {
    add("leads", "bad", {
      label: "No phone number we could find on the page",
      what: "We couldn't locate a phone number or tap-to-call link on the homepage.",
      why: "Many local customers want to call before they buy. If they can't find a number fast, they call a competitor.",
      proof: "No tel: link and no phone-number pattern were found in the homepage we fetched.",
      fix: "Add a clickable phone number in the header where it's visible on every screen size.",
      impact: "Recovers callers who currently can't find a way to reach you.",
    });
  }

  // ONLINE BOOKING
  if (signals.booking) {
    add("leads", "good", {
      label: "Visitors can book online",
      what: "The site offers an online booking / scheduling option.",
      why: "Most people prefer to book themselves — including evenings and weekends when no one answers the phone.",
      proof: bookingProviders
        ? `Detected ${bookingProviders[0]} on your page.`
        : "Found a booking link / scheduling call-to-action on your page.",
      fix: "Make sure the booking button is above the fold on mobile.",
      impact: "Captures after-hours bookings that a phone-only business loses.",
    });
  } else {
    add("leads", "warn", {
      label: "No online booking — people must call to book",
      what: "We found no scheduling widget or booking link on the homepage.",
      why: "A large share of bookings happen outside business hours. Phone-only booking quietly sends those people to a competitor who lets them self-serve.",
      proof: "We checked for the common booking tools (Calendly, Acuity, Square, Booksy, Vagaro, Mindbody, etc.) and booking call-to-actions, and found none on the homepage.",
      fix: "Add an online booking button connected to your calendar.",
      impact: "Businesses adding online booking commonly fill 15–25% more appointments.",
    });
  }

  // CTA QUALITY
  const strongCTA = clickables.find(c =>
    /\b(book|schedule|reserve|call|quote|estimate|appointment|consultation|get started|start now|free)\b/i.test(c));
  const weakCTAs = [...new Set(clickables.filter(c =>
    /^(submit|send|contact us|contact|learn more|read more|click here|more info)$/i.test(c.trim())))];
  if (strongCTA) {
    add("leads", "good", {
      label: "You have a clear, action-oriented button",
      what: "At least one button tells people exactly what to do next.",
      why: "Specific, action-led buttons convert far better than vague ones.",
      proof: `Found an action button on your page: “${strongCTA}”.`,
      fix: "Repeat that button at the top and bottom of every page.",
      impact: "Action-specific buttons keep visitors moving toward contacting you.",
    });
  } else if (weakCTAs.length) {
    add("leads", "warn", {
      label: "Your buttons don't tell people what to do",
      what: "The clearest calls-to-action on the page are generic.",
      why: "“Submit” or “Contact Us” asks for effort without offering a reason. Action-specific buttons consistently outperform them.",
      proof: `The most prominent buttons we found were generic: ${weakCTAs.slice(0, 4).map(c => `“${c}”`).join(", ")}.`,
      fix: 'Rename them to the action + payoff, e.g. “Book a Free Consultation” or “Get My Quote”.',
      impact: "Clear, benefit-led buttons typically lift clicks 20–30% over generic ones.",
    });
  }

  // REVIEWS / SOCIAL PROOF
  if (aggRating) {
    add("leads", "good", {
      label: "Your reviews are on your website",
      what: "The page exposes a star rating to Google via structured data.",
      why: "Social proof at the moment of decision is one of the strongest trust levers for a local business — and rating markup can show stars in search.",
      proof: `Found a ${aggRating}★ rating${aggCount ? ` from ${aggCount} reviews` : ""} in your page's structured data (schema.org aggregateRating).`,
      fix: "Keep it fresh — feed new reviews in automatically.",
      impact: "Star ratings in search and on-page lift both click-through and conversion.",
    });
  } else if (reviewWidget) {
    add("leads", "good", {
      label: "You're showing reviews on the page",
      what: "A reviews widget is embedded on the homepage.",
      why: "Visible social proof reassures first-time visitors at the point of decision.",
      proof: `Detected a ${reviewWidget[0]} reviews element on your page.`,
      fix: "Place reviews on service pages too, where decisions are made.",
      impact: "Reviews at the decision point measurably increase enquiries.",
    });
  } else {
    add("leads", "warn", {
      label: "We couldn't find reviews on your homepage",
      what: "No star rating or reviews element was detected on the page.",
      why: "Without visible reviews, first-time visitors have nothing reassuring them at the moment they decide whether to trust you.",
      proof: "We checked for rating markup (schema.org aggregateRating) and the common review widgets (Google, Yelp, Trustpilot, Birdeye) and found none on the homepage.",
      fix: "Embed your Google reviews on the homepage and service pages.",
      impact: "Reviews shown at the decision point commonly lift conversion 10–15%.",
    });
  }

  // LIVE CHAT
  if (chatWidget) {
    add("leads", "good", {
      label: "You can capture visitors with live chat",
      what: "A chat widget is installed on the site.",
      why: "Chat catches questions (and leads) from people who won't call or fill a form, including after hours.",
      proof: `Detected ${chatWidget[0]} on your page.`,
      fix: "Make sure it has auto-replies for nights and weekends.",
      impact: "Captures enquiries that would otherwise leave without contacting you.",
    });
  } else {
    add("leads", "warn", {
      label: "No live chat to catch after-hours visitors",
      what: "No chat widget was detected on the homepage.",
      why: "Many visitors arrive when you're closed and won't call or fill a form. With no chat, those enquiries simply leave.",
      proof: "We scanned for the common chat tools (Intercom, Tawk, Drift, Tidio, Crisp, Zendesk, Messenger) and found none in your page code.",
      fix: "Add a chat widget with after-hours auto-replies that can answer FAQs and book.",
      impact: "Captures the after-hours visitors a phone-only business misses.",
    });
  }

  // PAGE WEIGHT (only claimed when the numbers actually warrant it)
  if (bytes > 1_500_000 || scriptCount > 35) {
    add("website", "warn", {
      label: "Your homepage is heavy and likely slow on phones",
      what: "The homepage carries a lot of weight before content appears.",
      why: "Heavy pages are slow on phones and mobile networks. Slow pages lose visitors and rank lower in Google.",
      proof: `Your homepage HTML is ${Math.round(bytes / 1024)} KB and references ${scriptCount} scripts and ${imgCount} images.`,
      fix: "Compress and lazy-load images, defer non-critical scripts, and enable caching.",
      impact: "Faster load reduces bounce and is a direct Google ranking factor.",
    });
  }

  return { ok: true, signals, findings };
}

// ── network wrapper (server-only) ─────────────────────────────────────────────
function normalizeUrl(raw) {
  let u = (raw || "").trim();
  if (!u) return null;
  if (!/^https?:\/\//i.test(u)) u = "https://" + u;
  try { return new URL(u).toString(); } catch { return null; }
}

async function fetchOnce(url, timeoutMs = 9000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  const started = Date.now();
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PresetProfitAuditBot/1.0; +https://presetandprofit.com)",
        "Accept": "text/html,application/xhtml+xml",
      },
    });
    const raw = await res.text();
    const html = raw.length > 800_000 ? raw.slice(0, 800_000) : raw;
    return {
      ok: res.ok, status: res.status, finalUrl: res.url || url,
      secure: (res.url || url).startsWith("https://"),
      html, bytes: raw.length, fetchMs: Date.now() - started,
    };
  } finally {
    clearTimeout(t);
  }
}

// `fetchPage` is injected by the server callers (api/analyze-site.js and the
// Vite dev middleware) as the SSRF-guarded safeFetchPage. It defaults to the
// plain fetchOnce only so the function stays runnable in isolation/tests — in
// production the guarded fetcher is ALWAYS supplied.
export async function scanSite(rawUrl, { fetchPage = fetchOnce } = {}) {
  const requestedUrl = normalizeUrl(rawUrl);
  if (!requestedUrl) return { ok: false, error: "invalid-url", requestedUrl: rawUrl || null };

  let resp;
  try {
    resp = await fetchPage(requestedUrl);
  } catch (e1) {
    // A blocked private address is a hard stop — never fall back or retry it.
    if (String(e1?.message || e1).startsWith("ssrf-blocked")) {
      return { ok: false, error: "blocked-url", requestedUrl };
    }
    // https failed — try http:// once (the site may not support TLS)
    const httpUrl = requestedUrl.replace(/^https:\/\//i, "http://");
    if (httpUrl !== requestedUrl) {
      try { resp = await fetchPage(httpUrl); }
      catch (e2) {
        if (String(e2?.message || e2).startsWith("ssrf-blocked")) {
          return { ok: false, error: "blocked-url", requestedUrl };
        }
        return { ok: false, error: "unreachable", detail: String(e2), requestedUrl };
      }
    } else {
      return { ok: false, error: "unreachable", detail: String(e1), requestedUrl };
    }
  }

  if (!resp.html || resp.html.length < 200) {
    return { ok: false, error: "empty-response", httpStatus: resp.status, requestedUrl, finalUrl: resp.finalUrl };
  }

  // Don't analyze bot-block / error pages as if they were the real site — that
  // produces garbage findings and nonsense like a detected name of "Access Denied".
  const head = resp.html.slice(0, 5000).toLowerCase();
  const blockSig = /access denied|request unsuccessful|attention required|are you a (human|robot)|enable javascript and cookies|cf-browser-verification|just a moment\.{0,3}<|please verify you are (a )?human|unusual traffic|bot detection|captcha-delivery/i;
  if (resp.status >= 400 || blockSig.test(head)) {
    return { ok: false, error: resp.status >= 400 ? `http-${resp.status}` : "blocked", httpStatus: resp.status, requestedUrl, finalUrl: resp.finalUrl };
  }

  const analysis = analyzeHtml(resp.html, {
    requestedUrl,
    finalUrl: resp.finalUrl,
    secure: resp.secure,
    httpStatus: resp.status,
    fetchMs: resp.fetchMs,
    bytes: resp.bytes,
  });

  return { ...analysis, scannedAt: new Date().toISOString() };
}
