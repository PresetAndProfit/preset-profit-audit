export const STORAGE_KEY = "pp_audits_v2";

export const INDUSTRIES = [
  // Common local trades first — owners should see THEIR business, not a bucket.
  "Dental","Chiropractic","Plumbing","Roofing","HVAC","Electrician",
  "Barbershop","Med Spa","Healthcare","Legal","Real Estate","Home Services",
  "Restaurant","Automotive","Retail","Fitness","Finance","Education",
  "Beauty & Salon","Childcare",
];

export const GOALS = [
  "More Leads","More Appointments","Better Follow-Up","More Reviews","Save Staff Time",
];

export const STATUS_COLORS = { hot:"#ff4757", warm:"#f5a623", cold:"#4a9eff" };
export const EFFORT_COLOR   = { low:"#00d68f", medium:"#f5a623", high:"#ff4757" };
export const SEV_COLOR      = { critical:"#ff4757", high:"#f5a623", medium:"#4a9eff" };
export const CONF_COLOR     = { high:"#00d68f", medium:"#f5a623", low:"#6b6b85" };

export const SERVICE_PACKAGES = [
  {
    name:"Starter Report", price:"$97", priceNote:"one-time",
    color:"#6b6b85", tag:"GET STARTED", highlight:false, cta:"Order Report",
    deliverables:[
      "Full business report with scores and findings",
      "Top 3 ways to get more customers",
      "What your local competitors are doing that you're not",
      "A clear 30-day action plan",
      "Report delivered within 24 hours",
    ],
  },
  {
    name:"Done-For-You Setup", price:"$497+", priceNote:"per system",
    color:"#f5a623", tag:"MOST POPULAR", highlight:true, cta:"Book Strategy Call",
    deliverables:[
      "Everything in Starter Report",
      "We build and set up the system for you",
      "Chat window or online booking on your website",
      "Automatic follow-up messages to new enquiries",
      "30 days of support while you get started",
      "Monthly check-in to make sure it's working",
    ],
  },
  {
    name:"Full Growth Package", price:"$997+", priceNote:"per month",
    color:"#4a9eff", tag:"FULL SERVICE", highlight:false, cta:"Apply Now",
    deliverables:[
      "Report plus full setup of all systems",
      "Everything running on autopilot",
      "Automatic Google review requests after every job",
      "Monthly reporting on results",
      "Priority phone and text support",
      "Quarterly review of what's working",
    ],
  },
];

export const INDUSTRY_REV = {
  Dental:[3000,9000], Chiropractic:[1500,6000], Plumbing:[2000,8000],
  Roofing:[6000,25000], HVAC:[4000,15000], Electrician:[2500,9000],
  Barbershop:[600,2500], "Med Spa":[3000,12000],
  Healthcare:[3000,8000], Legal:[4000,10000], "Real Estate":[2000,7000],
  "Home Services":[1500,5000], Restaurant:[800,3000], Automotive:[1000,4000],
  Retail:[1200,4000], Fitness:[800,3000], Finance:[3000,8000],
  Education:[1000,4000], "Beauty & Salon":[600,2500], Childcare:[800,3000],
};

export const RECOMMENDATIONS = {
  "More Leads":{
    name:"Never Miss an Enquiry",
    description:"We add a chat window to your website, fix your missed-call response, and make sure every person who shows interest gets a follow-up. None of them quietly go to a competitor.",
    benefit:"You stop losing the customers who tried to reach you but couldn't get through.",
    package:"Done-For-You Setup", price:"$497+",
  },
  "More Appointments":{
    name:"Fill Your Calendar Without Phone Calls",
    description:"We add online booking to your website, set up automatic reminders before every appointment, and send a follow-up to anyone who cancels. Your team saves up to 15 hours of phone calls every week.",
    benefit:"Your calendar fills itself and your staff stops spending all day on the phone.",
    package:"Done-For-You Setup", price:"$497+",
  },
  "Better Follow-Up":{
    name:"Automatic Follow-Up That Never Forgets",
    description:"Every person who contacts you gets a friendly series of texts and emails over the next few weeks — automatically. Your team does nothing extra. It keeps going until they book or say they're not interested.",
    benefit:"You never lose a customer just because no one remembered to call them back.",
    package:"Full Growth Package", price:"$997+",
  },
  "More Reviews":{
    name:"5-Star Reviews on Autopilot",
    description:"After every job, your customer gets a quick text asking for a Google review. New reviews are automatically posted to your social media. Your reputation builds itself without anyone on your team doing a thing.",
    benefit:"You show up higher in Google searches and new customers trust you before they've even called.",
    package:"Done-For-You Setup", price:"$497+",
  },
  "Save Staff Time":{
    name:"Stop Doing the Same Things Over and Over",
    description:"We connect your website, booking, customer messages, and reviews so everything runs by itself. Your team stops doing the same tasks every single day and can focus on the work that actually makes you money.",
    benefit:"Your staff gets hours back every week without you needing to hire anyone new.",
    package:"Full Growth Package", price:"$997+",
  },
};

export const LEAD_FINDINGS_POOL = [
  {label:"No chat window on your website",status:"bad",
   detail:"Most people look for services outside of business hours. Without a chat window, they leave and go elsewhere."},
  {label:"No clear 'book now' or 'call us' button at the top of your page",status:"bad",
   detail:"People on phones don't scroll to find your contact button. If it's not right at the top, they leave."},
  {label:"No free offer to get people to contact you",status:"bad",
   detail:"Your competitors offer free quotes or consultations upfront. People choose them because the first step feels easier."},
  {label:"Phone number is hard to find on your website",status:"bad",
   detail:"If your phone number isn't easy to spot straight away, people who want to call will give up and call someone else."},
  {label:"No way for people to book online",status:"bad",
   detail:"Making people call to book turns many of them away. Most people prefer to book themselves at any time of day."},
  {label:"No automatic follow-up when someone contacts you",status:"bad",
   detail:"When someone contacts you but doesn't book, nothing happens automatically. Most of the time they never hear from you again."},
  {label:"Your contact button says something vague like 'Submit' or 'Contact Us'",status:"warn",
   detail:"Buttons that say 'Book a Free Estimate' or 'Get a Quote' get 30–40% more clicks than ones that just say 'Submit'."},
  {label:"Your reviews only appear on the homepage",status:"warn",
   detail:"People looking at your individual service pages don't see your reviews — and that's where most decisions are made."},
  {label:"Nothing stops people from leaving your website without contacting you",status:"warn",
   detail:"When people are about to leave your site, a small pop-up with a simple offer can bring some of them back."},
  {label:"Booking confirmations are sent manually",status:"warn",
   detail:"Your team has to manually send each booking confirmation. This takes time and sometimes gets missed."},
  {label:"Your contact form is too far down the page",status:"warn",
   detail:"Most people use phones and won't scroll to the bottom of your page. Your contact form needs to be near the top."},
  {label:"People can reach you by phone, email, and a contact form",status:"good",
   detail:"Phone, email, and a form — people can contact you the way they prefer, right when they're ready."},
  {label:"It's clear what you do and why people should choose you",status:"good",
   detail:"People can tell right away what you do and why you're the right choice. That's one of the most important things."},
  {label:"People can book online directly from your website",status:"good",
   detail:"Customers can book themselves without calling. No one on your team needs to do anything."},
  {label:"Your reviews are shown where people are making decisions",status:"good",
   detail:"Your reviews are placed where people are deciding whether to book. That's exactly where they need to be."},
  {label:"Every page has an easy way for people to get in touch",status:"good",
   detail:"Every page on your site has an easy way for people to reach out or book. Nothing gets in their way."},
];

export const WEBSITE_FINDINGS_POOL = [
  {label:"Your website loads too slowly on phones",status:"bad",
   detail:"Slow websites lose visitors fast — especially on phones. People click away before your site even finishes loading."},
  {label:"Your website is hard to use on a phone",status:"bad",
   detail:"Most people search for local businesses on their phone. If your site is hard to use on a phone, the majority of potential customers just leave."},
  {label:"Your Google business listing isn't set up",status:"bad",
   detail:"When people search for your type of business nearby, they see a map with local results. Without a Google listing, your business doesn't show up there."},
  {label:"Your website pages don't show a preview in Google search results",status:"bad",
   detail:"When your page shows up in Google, there's no description underneath the link. People skip past it and click results that have one."},
  {label:"Your website is not marked as secure",status:"bad",
   detail:"Google shows a 'Not Secure' warning on your website. That scares people away before they've read a single word."},
  {label:"Your website images are too large — it makes the site slow",status:"warn",
   detail:"Large image files make your site slow to load. Every extra second of loading time costs you potential customers."},
  {label:"Your website hasn't been updated in over 6 months",status:"warn",
   detail:"Google quietly moves outdated websites down in search results. Regular visitors also see the same old content every time."},
  {label:"Google can't show your hours or reviews directly in search results",status:"warn",
   detail:"With a simple fix, Google can show your opening hours, star rating, and common questions right in search results — before anyone even clicks your site."},
  {label:"Your website doesn't show enough signs that you can be trusted",status:"warn",
   detail:"Adding certifications, industry memberships, or trust badges to your site can increase the number of people who contact you by 20–30%."},
  {label:"No videos on your service pages",status:"warn",
   detail:"A short video on your service pages keeps visitors on your site longer and makes them more likely to book."},
  {label:"Your site works well on phones",status:"good",
   detail:"Your site looks good and works well on phones — great news, since that's how most people will find you."},
  {label:"Your website looks professional and consistent",status:"good",
   detail:"People who visit for the first time get a good impression. That matters more than most business owners realise."},
  {label:"Your website is secure",status:"good",
   detail:"Your site shows as secure to visitors and to Google. Both see this as a sign you're a trustworthy business."},
  {label:"Your Google business listing is active",status:"good",
   detail:"Your Google listing is set up and showing in local searches. People nearby can find you easily."},
  {label:"Your website loads quickly",status:"good",
   detail:"Your site loads fast. People don't click away before it loads, and Google rewards you for it in search rankings."},
];

export const AUTOMATION_POOL = [
  {
    name:"Missed Call Text Back",
    category:"Get More Customers",
    effort:"low", timesSaved:"8 hrs/wk", confidence:"high",
    presetService:"Done-For-You Setup $497+",
    description:"When someone calls and you miss it, they get a friendly text message back within 60 seconds. Most people who can't get through will just call the next business — this stops that from happening.",
    profitAngle:"Every missed call is a customer lost to your competitor. This brings them back before they give up on you.",
  },
  {
    name:"Appointment Reminder Messages",
    category:"Fill Your Calendar",
    effort:"low", timesSaved:"10 hrs/wk", confidence:"high",
    presetService:"Done-For-You Setup $497+",
    description:"Your customers get an automatic reminder text and email the day before and one hour before their appointment. No-shows drop by 40–60%.",
    profitAngle:"Cutting no-shows by even 25% puts hundreds or thousands of dollars back in your pocket each month.",
  },
  {
    name:"Automatic Review Requests",
    category:"Build Your Reputation",
    effort:"low", timesSaved:"5 hrs/wk", confidence:"high",
    presetService:"Starter Report $97",
    description:"After every job, your customer automatically gets a short text asking for a Google review. One tap takes them straight to your Google page to leave a star rating.",
    profitAngle:"More 5-star reviews means you show up higher when people search for your type of business nearby — without paying for ads.",
  },
  {
    name:"Automatic Customer Follow-Up",
    category:"Stop Losing Customers",
    effort:"medium", timesSaved:"12 hrs/wk", confidence:"high",
    presetService:"Full Growth Package $997+",
    description:"When someone contacts you but doesn't book, they get a friendly text or email every few days for two weeks. It keeps nudging them until they either book or say they're not interested.",
    profitAngle:"80% of bookings happen after the 5th follow-up. Most businesses give up after one attempt.",
  },
  {
    name:"24/7 Website Chat",
    category:"Get More Customers",
    effort:"low", timesSaved:"15 hrs/wk", confidence:"high",
    presetService:"Done-For-You Setup $497+",
    description:"A small chat window on your website answers questions and books appointments any time of day — even at midnight on a Sunday when no one from your team is available.",
    profitAngle:"Most people search for businesses after hours. Without this, they find a competitor who answers instantly and never come back to you.",
  },
  {
    name:"Customer Enquiry Tracker",
    category:"Save Staff Time",
    effort:"medium", timesSaved:"8 hrs/wk", confidence:"medium",
    presetService:"Full Growth Package $997+",
    description:"Keeps a running list of every person who has contacted you and where they are in the process. Your team gets reminders so nobody is forgotten or missed.",
    profitAngle:"Businesses that track their enquiries properly close about 28% more jobs than those who rely on memory or sticky notes.",
  },
  {
    name:"Monthly Customer Emails",
    category:"Build Your Reputation",
    effort:"medium", timesSaved:"6 hrs/wk", confidence:"medium",
    presetService:"Full Growth Package $997+",
    description:"Sends a short, helpful email to your past customers once a month with a tip or a special offer. Keeps your business top of mind so they come back — and tell their friends.",
    profitAngle:"It costs five times less to get a past customer to return than to find a brand new one.",
  },
  {
    name:"Win-Back Messages",
    category:"Stop Losing Customers",
    effort:"low", timesSaved:"4 hrs/wk", confidence:"medium",
    presetService:"Done-For-You Setup $497+",
    description:"Finds customers who haven't been back in three months or more and automatically sends them a personal text with a special offer to bring them back.",
    profitAngle:"Getting just 5% more customers to return can grow your total revenue by 25–95%."},
  {
    name:"Online Booking",
    category:"Fill Your Calendar",
    effort:"low", timesSaved:"12 hrs/wk", confidence:"high",
    presetService:"Done-For-You Setup $497+",
    description:"A booking page connected to your calendar where customers pick a time, pay a deposit, and get a confirmation — all without anyone from your team being involved.",
    profitAngle:"Businesses with online booking fill 20–30% more appointments than those that require a phone call.",
  },
];

export const THIRTY_DAY_BY_GOAL = {
  "More Leads":{
    phase1:{title:"Quick Wins (Days 1–7)",actions:[
      "Add a chat window to your website so people can ask questions and book any time — day or night",
      "Add a big 'Call Us' button at the top of your site so people on phones can reach you with one tap",
      "Set up an automatic text reply to every missed call so people hear back within 60 seconds",
    ]},
    phase2:{title:"Build Your System (Days 8–21)",actions:[
      "Set up friendly texts and emails that go out automatically when someone contacts you but doesn't book",
      "Make sure every person who fills in your contact form is saved somewhere — so no one gets lost",
      "Mark which new enquiries are the most urgent so you know who to call back first",
    ]},
    phase3:{title:"Check What's Working (Days 22–30)",actions:[
      "Check what questions people are asking in your chat window and make sure the answers are helpful",
      "Try two different versions of your main 'book now' button to see which one gets more clicks",
      "Check your 30-day numbers: new enquiries received, how many booked, how much each new customer cost",
    ]},
  },
  "More Appointments":{
    phase1:{title:"Quick Wins (Days 1–7)",actions:[
      "Add a 'Book Online' button at the top of your site so people can pick a time without calling",
      "Set up automatic confirmation texts and emails that go out the moment someone books",
      "Add your booking link to your Google listing and social pages so people can book from anywhere",
    ]},
    phase2:{title:"Fill More Slots (Days 8–21)",actions:[
      "Turn on automatic reminders that go out the day before and one hour before each appointment",
      "When someone cancels, send them an automatic message offering to rebook straight away",
      "Set up a waiting list that fills empty spots automatically when someone cancels",
    ]},
    phase3:{title:"Check What's Working (Days 22–30)",actions:[
      "Check how many website visitors are actually booking and try changing your booking page to get more",
      "Look at when no-shows happen most to see if there's a pattern — certain days or services",
      "Check your 30-day numbers: appointments filled, no-shows, and hours your team saved",
    ]},
  },
  "Better Follow-Up":{
    phase1:{title:"Quick Wins (Days 1–7)",actions:[
      "Set up an automatic text that replies to every missed call within 60 seconds",
      "Make sure every enquiry is saved automatically so nothing gets lost in an inbox or voicemail",
      "Set up an instant reply to every new enquiry so people know straight away that you received it",
    ]},
    phase2:{title:"Build Your System (Days 8–21)",actions:[
      "Set up a series of friendly texts and emails that go out over 3 weeks to anyone who enquired but didn't book",
      "Group enquiries by what service they asked about so your follow-up messages feel personal",
      "Send an automatic message to anyone who contacted you more than 30 days ago but never booked",
    ]},
    phase3:{title:"Check What's Working (Days 22–30)",actions:[
      "Check which of your follow-up messages people are actually reading — and rewrite the ones that aren't working",
      "Find out which message gets the most bookings and use it more",
      "Check your results: enquiries received, follow-ups sent, appointments booked, and new revenue",
    ]},
  },
  "More Reviews":{
    phase1:{title:"Quick Wins (Days 1–7)",actions:[
      "Set up an automatic text that goes to each customer after their job asking for a Google review",
      "Update your Google listing with recent photos, correct hours, and a clear description of what you do",
      "Give your team a simple reminder to ask every customer for a review before they leave",
    ]},
    phase2:{title:"Build Your System (Days 8–21)",actions:[
      "Send a gentle follow-up text to customers who got the first review request but didn't respond",
      "Automatically share new 5-star reviews to your Facebook or Instagram so more people see them",
      "Reply to every existing review — good or bad. Google rewards businesses that respond to customers",
    ]},
    phase3:{title:"Check What's Working (Days 22–30)",actions:[
      "Check how many people are responding to your review request texts and try different wording",
      "See if your Google search position has improved since you started getting more reviews",
      "Check your 30-day numbers: review requests sent, how many replied, your current star rating",
    ]},
  },
  "Save Staff Time":{
    phase1:{title:"Quick Wins (Days 1–7)",actions:[
      "Add online booking so customers can check your availability and book themselves — without calling",
      "Set up automatic booking confirmations and reminders so your team doesn't have to send them manually",
      "Set up an automatic text reply to missed calls so your team doesn't have to ring everyone back",
    ]},
    phase2:{title:"Cut the Repetitive Work (Days 8–21)",actions:[
      "List everything your team does manually and pick the 5 tasks that could run by themselves",
      "Set up a system that automatically sends new enquiries to the right person on your team",
      "Set up automatic payment reminders so your team doesn't have to chase unpaid invoices",
    ]},
    phase3:{title:"Check What's Working (Days 22–30)",actions:[
      "Review what your team is still doing manually and pick the next batch of tasks to fix",
      "Ask your team which tasks still waste the most time — then tackle those next",
      "Check how many hours per week your team has saved since making these changes",
    ]},
  },
};

export const GOAL_AUTO_MAP = {
  "More Leads":       ["24/7 Website Chat","Missed Call Text Back","Automatic Customer Follow-Up","Win-Back Messages","Automatic Review Requests"],
  "More Appointments":["Appointment Reminder Messages","Online Booking","Missed Call Text Back","Automatic Customer Follow-Up","Automatic Review Requests"],
  "Better Follow-Up": ["Automatic Customer Follow-Up","Customer Enquiry Tracker","Win-Back Messages","Monthly Customer Emails","Appointment Reminder Messages"],
  "More Reviews":     ["Automatic Review Requests","Monthly Customer Emails","Win-Back Messages","Online Booking","24/7 Website Chat"],
  "Save Staff Time":  ["Online Booking","Appointment Reminder Messages","Customer Enquiry Tracker","Missed Call Text Back","Monthly Customer Emails"],
};

export const TECH_STACKS = {
  Dental:["Dentrix / Open Dental","NexHealth / Weave","Google Business Profile"],
  Chiropractic:["ChiroTouch / Jane App","Google Business Profile","Mailchimp"],
  Plumbing:["ServiceTitan / Jobber","Google Local Services Ads","Housecall Pro"],
  Roofing:["AccuLynx / JobNimbus","Google Local Services Ads","CompanyCam"],
  HVAC:["ServiceTitan / Housecall Pro","Google Local Services Ads","Podium"],
  Electrician:["Jobber / ServiceTitan","Google Local Services Ads","Housecall Pro"],
  Barbershop:["Booksy / Squire","Instagram Business","Square"],
  "Med Spa":["Vagaro / Boulevard","Instagram Business","Podium"],
  Healthcare:["WordPress or Squarespace","Google Analytics","Jane App / Mindbody"],
  Legal:["WordPress","Clio or MyCase","Google Business Profile"],
  "Real Estate":["IDX WordPress","Follow Up Boss / Kvcore","Mailchimp"],
  "Home Services":["ServiceTitan / Jobber","Google Local Services Ads","WordPress"],
  Restaurant:["Toast POS","OpenTable / Yelp","Instagram Business"],
  Automotive:["DealerSocket","Google Ads","Reynolds & Reynolds"],
  Retail:["Shopify / WooCommerce","Google Analytics 4","Klaviyo"],
  Fitness:["Mindbody","Instagram Business","Mailchimp"],
  Finance:["Redtail / Wealthbox","Calendly","WordPress"],
  Education:["WordPress","Google Workspace","Mailchimp"],
  "Beauty & Salon":["Vagaro / Booksy","Instagram Business","Square"],
  Childcare:["Brightwheel","Facebook Business","WordPress"],
};

// ── Per-industry benchmarks used in ROI calculations ─────────────────────────
// Average revenue from a single job / appointment / visit
export const INDUSTRY_JOB_VALUE = {
  Dental: 185, Chiropractic: 65, Plumbing: 320, Roofing: 2500,
  HVAC: 450, Electrician: 280, Barbershop: 32, "Med Spa": 240,
  Healthcare: 155, Legal: 375, "Real Estate": 4800, "Home Services": 285,
  Restaurant: 44, Automotive: 230, Retail: 68, Fitness: 52,
  Finance: 310, Education: 145, "Beauty & Salon": 76, Childcare: 980,
};

// Typical no-show / cancellation rate per industry (decimal)
export const INDUSTRY_NO_SHOW_RATE = {
  Dental: 0.18, Chiropractic: 0.20, Plumbing: 0.08, Roofing: 0.10,
  HVAC: 0.10, Electrician: 0.09, Barbershop: 0.20, "Med Spa": 0.18,
  Healthcare: 0.18, Legal: 0.20, "Real Estate": 0.12, "Home Services": 0.09,
  Restaurant: 0.24, Automotive: 0.08, Retail: 0.03, Fitness: 0.22,
  Finance: 0.15, Education: 0.14, "Beauty & Salon": 0.23, Childcare: 0.06,
};

// Typical % of inbound calls that go unanswered per industry (decimal)
export const INDUSTRY_MISSED_CALL_RATE = {
  Dental: 0.27, Chiropractic: 0.25, Plumbing: 0.40, Roofing: 0.42,
  HVAC: 0.38, Electrician: 0.37, Barbershop: 0.30, "Med Spa": 0.30,
  Healthcare: 0.27, Legal: 0.23, "Real Estate": 0.22, "Home Services": 0.38,
  Restaurant: 0.30, Automotive: 0.26, Retail: 0.14, Fitness: 0.25,
  Finance: 0.20, Education: 0.22, "Beauty & Salon": 0.32, Childcare: 0.25,
};

export const QUICK_WINS_POOL = [
  url => `Add a big phone number and a 'Call Us Now' button at the very top of ${url || "your website"} — takes under 30 minutes`,
  () => "Set up your Google business listing with recent photos, your correct hours, and a full list of services",
  () => "Add a free booking link to your website using Google Calendar or Calendly — we can walk you through it in 10 minutes",
  () => "Text your last 20 customers asking for a Google review — expect 6–8 of them to leave one",
  () => "Add a free chat window to your website so people can message you any time — ask us and we'll set it up in under an hour",
  () => "Put a 'New Customer Special' offer right at the very top of your homepage where everyone can see it",
  () => "Set up a free automatic text reply for missed calls — we'll walk you through it at no charge",
];
