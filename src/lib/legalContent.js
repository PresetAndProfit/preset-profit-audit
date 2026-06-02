// src/lib/legalContent.js — legal page content.
//
// Company details are set in COMPANY below. These cover the basics a SaaS
// taking subscriptions needs (terms, privacy with sub-processors, refund/
// cancellation); having them reviewed by counsel in your jurisdiction is still
// recommended.

export const COMPANY = {
  product: "Preset & Profit",
  legalEntity: "Preset & Profit",
  email: "hello@presetprofit.com",
  site: "https://presetprofit.com",
  governingLaw: "the Commonwealth of Virginia, United States",
  effectiveDate: "June 1, 2026",
};

const c = COMPANY;

export const TERMS = {
  slug: "terms",
  title: "Terms of Service",
  sections: [
    ["1. Agreement", `These Terms govern your use of ${c.product} ("the Service"), operated by ${c.legalEntity}. By creating an account or using the Service you agree to these Terms. If you do not agree, do not use the Service.`],
    ["2. Accounts", "You must provide accurate information and are responsible for activity under your account and for keeping your password secure. You must be at least 18 and authorized to act for any business you analyze."],
    ["3. Plans, billing & trials", "Paid plans (Professional, Agency) are billed in advance on a recurring monthly basis through our payment processor, Stripe. Paid plans may include a free trial; unless cancelled before the trial ends, the plan converts to paid automatically. Prices may change with notice. You authorize us to charge your payment method until you cancel."],
    ["4. Acceptable use", "You may only scan websites you own or are authorized to assess. You may not use the Service to attack, overload, or probe systems without authorization, to scan internal/private network resources, or to violate any law. We rate-limit and may suspend accounts for abuse."],
    ["5. The audit & estimates", "Audit findings and revenue estimates are informational and based on automated analysis plus published industry benchmarks. They are not guarantees of results. You are responsible for decisions you make based on a report."],
    ["6. Intellectual property", "We retain all rights in the Service. Reports you generate about your (or your clients') businesses are yours to use. Agency white-label features let you present reports under your own brand."],
    ["7. Cancellation & termination", `You may cancel anytime from the billing portal; see our Refund & Cancellation Policy. We may suspend or terminate accounts that violate these Terms.`],
    ["8. Disclaimers & liability", `The Service is provided "as is" without warranties. To the maximum extent permitted by law, ${c.legalEntity} is not liable for indirect or consequential damages, and total liability is limited to the amount you paid in the prior 12 months.`],
    ["9. Changes & governing law", `We may update these Terms; material changes will be notified. These Terms are governed by the laws of ${c.governingLaw}. Questions: ${c.email}.`],
  ],
};

export const PRIVACY = {
  slug: "privacy",
  title: "Privacy Policy",
  sections: [
    ["1. What we collect", "Account data (name, email, optional company/branding), audit inputs (business details and the website URLs you submit), generated reports, usage events (scans and audits, with timestamp and IP for abuse prevention), and billing identifiers from Stripe. We do not store full card numbers — Stripe handles payment data."],
    ["2. How we use it", "To provide and secure the Service, generate and store your reports, enforce plan limits, prevent abuse, process payments, and communicate with you about your account."],
    ["3. Sub-processors", "We share data only with providers that run the Service: Supabase (database, authentication, hosting of your data), Stripe (payments and subscriptions), and Vercel (application hosting). Each processes data on our behalf under their own terms."],
    ["4. Website scanning", "When you submit a URL, our server fetches that page's public HTML to analyze it. We block requests to private/internal addresses. We store the resulting signals and findings as part of your report."],
    ["5. Retention & deletion", `We keep your data while your account is active. You can delete individual reports in-app. To delete your account and associated data, contact ${c.email}.`],
    ["6. Your rights", "Depending on your location you may have rights to access, correct, export, or delete your personal data. Contact us to exercise them."],
    ["7. Security", "We use row-level security so users can only access their own data, encrypt data in transit, and keep service credentials server-side. No system is perfectly secure; we work to protect your data and will notify you of material breaches as required by law."],
    ["8. Contact", `Privacy questions: ${c.email}. Operated by ${c.legalEntity}.`],
  ],
};

export const REFUND = {
  slug: "refund",
  title: "Refund & Cancellation Policy",
  sections: [
    ["Free trial", "Paid plans may include a free trial. You won't be charged if you cancel before the trial ends. When the trial ends, the plan renews at the listed price unless cancelled."],
    ["Cancelling", "You can cancel anytime from Account → Manage billing (the Stripe billing portal). Your plan stays active until the end of the current paid period; you keep access until then and are not charged again."],
    ["Refunds", `Monthly subscriptions are billed in advance and are generally non-refundable for the current period, except where required by law. If you were charged in error or experienced a problem, contact ${c.email} within 14 days and we'll review it in good faith.`],
    ["Downgrades", "Downgrading to Free takes effect at the end of the current paid period. Data created on a paid plan remains accessible subject to Free-plan limits."],
    ["Contact", `Billing questions: ${c.email}.`],
  ],
};

export const LEGAL_DOCS = { terms: TERMS, privacy: PRIVACY, refund: REFUND };
